-- V13: Allow leave balance to go negative (deficit leaves)
-- Remove the insufficient-balance guard from deduct_leave_balance
-- so employees can apply leave even when remaining = 0.

CREATE OR REPLACE FUNCTION deduct_leave_balance(p_user_id UUID, p_days INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE leave_balance
  SET remaining   = remaining - p_days,
      used        = used + p_days,
      updated_at  = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave balance record not found for user %', p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
