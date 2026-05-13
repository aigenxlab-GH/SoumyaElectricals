-- ============================================================================
--  V26 — Defer negative-balance write-off to next month
--
--  Replaces V25 with the timing the business actually needs:
--    • Within the CURRENT month, `remaining` MAY be negative — payroll for
--      that month uses this number to deduct salary for the over-used days.
--    • When the recompute runs in a NEW month (anytime on or after the 1st of
--      month M+1), any deficit left from month M is "written off" because
--      payroll has already compensated for it.
--
--  The recompute is stateless and deterministic — it walks month-by-month
--  through the year, applying write-offs only to months strictly earlier than
--  the current month, and never touches the current month's negative balance.
--
--  Display semantics:
--    total_credited = monthly_credit × months_elapsed_this_year + carryover_in
--    used           = COUNT(approved leaves in current year)
--    remaining      = total_credited + accumulated_writeoffs_from_past_months - used
--                     (CAN be negative within the current month)
--
--  Example (annual=24, monthly=2):
--    Sanjay joined Apr 2026, takes 5 leaves in April 10.
--    Today = May 14 2026.
--      April walk: total=2, used=5, deficit=3 → writeoff_so_far=3 (April is past)
--      May walk:   total=4, used=5 (no May leaves), writeoff=3
--                  remaining = 4 + 3 - 5 = 2 ✓
--    On April 28 the same data: remaining = 2 - 5 = -3  (visible to April payroll)
--    On May 1   the same data: April becomes "past" → -3 written off → remaining = 2
-- ============================================================================

CREATE OR REPLACE FUNCTION recompute_leave_balance(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_join             DATE;
  v_today            DATE := CURRENT_DATE;
  v_effective_start  DATE;
  v_monthly_credit   INT;
  v_carryover_cap    CONSTANT INT := 30;
  v_target_year      INT := EXTRACT(YEAR  FROM v_today)::INT;
  v_target_month     INT := EXTRACT(MONTH FROM v_today)::INT;
  v_eff_year         INT;
  v_eff_month        INT;
  v_year             INT;
  v_month            INT;
  v_start_month      INT;
  v_end_month        INT;

  v_carryover        INT := 0;    -- carries INTO each year from the prior
  v_year_total       INT;         -- total_credited running for the year
  v_year_used        INT := 0;    -- approved leaves YTD
  v_year_writeoff    INT := 0;    -- accumulated write-offs from past months this year
  v_used_this_month  INT;
  v_deficit          INT;
  v_eoy_remaining    INT;

  v_final_total      INT := 0;
  v_final_used       INT := 0;
  v_final_remaining  INT := 0;
BEGIN
  SELECT date_of_joining INTO v_join FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Fresh-start: ignore anything before 2026-01-01
  v_effective_start := GREATEST(v_join, DATE '2026-01-01');
  IF v_today < v_effective_start THEN
    UPDATE leave_balance
    SET total_credited = 0, used = 0, remaining = 0, updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  SELECT FLOOR(annual_leave_days / 12.0)::INT
    INTO v_monthly_credit
    FROM system_config LIMIT 1;
  v_monthly_credit := COALESCE(v_monthly_credit, 0);

  v_eff_year  := EXTRACT(YEAR  FROM v_effective_start)::INT;
  v_eff_month := EXTRACT(MONTH FROM v_effective_start)::INT;

  FOR v_year IN v_eff_year .. v_target_year LOOP
    v_year_total    := v_carryover;     -- year starts with carryover from prior year
    v_year_used     := 0;
    v_year_writeoff := 0;

    v_start_month := CASE WHEN v_year = v_eff_year     THEN v_eff_month    ELSE 1  END;
    v_end_month   := CASE WHEN v_year = v_target_year  THEN v_target_month ELSE 12 END;

    FOR v_month IN v_start_month .. v_end_month LOOP
      -- Monthly credit
      v_year_total := v_year_total + v_monthly_credit;

      -- Approved leaves taken in this calendar month
      SELECT COUNT(*)::INT
        INTO v_used_this_month
        FROM leaves
        WHERE user_id = p_user_id
          AND status  = 'approved'
          AND EXTRACT(YEAR  FROM date) = v_year
          AND EXTRACT(MONTH FROM date) = v_month;
      v_year_used := v_year_used + v_used_this_month;

      -- Write-off only for PAST months — never for the current month
      IF v_year < v_target_year
         OR (v_year = v_target_year AND v_month < v_target_month) THEN
        v_deficit := v_year_used - (v_year_total + v_year_writeoff);
        IF v_deficit > 0 THEN
          v_year_writeoff := v_year_writeoff + v_deficit;
        END IF;
      END IF;
    END LOOP;

    IF v_year < v_target_year THEN
      -- Year ended — compute carryover (cap 30) for next year
      v_eoy_remaining := (v_year_total + v_year_writeoff) - v_year_used;
      v_carryover := LEAST(v_carryover_cap, GREATEST(0, v_eoy_remaining));
    ELSE
      -- Current year — finalise
      v_final_total     := v_year_total;
      v_final_used      := v_year_used;
      v_final_remaining := v_year_total + v_year_writeoff - v_year_used;
      -- ← CAN BE NEGATIVE within the current month. That's intentional —
      --   payroll for the current month needs to see this.
    END IF;
  END LOOP;

  UPDATE leave_balance
  SET total_credited = v_final_total,
      used           = v_final_used,
      remaining      = v_final_remaining,
      updated_at     = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Bulk variant
CREATE OR REPLACE FUNCTION recompute_all_leave_balances()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM recompute_leave_balance(u.id)
  FROM users u
  WHERE u.is_active = TRUE;
END;
$$;

-- One-off back-fill on the new formula
SELECT recompute_all_leave_balances();
