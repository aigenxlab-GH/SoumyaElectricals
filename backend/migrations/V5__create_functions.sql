-- Approve leave atomically: update status WHERE status='applied', return leave row
CREATE OR REPLACE FUNCTION approve_leave(p_leave_id UUID)
RETURNS leaves AS $$
DECLARE
  v_leave leaves;
BEGIN
  UPDATE leaves SET status = 'approved'
  WHERE id = p_leave_id AND status = 'applied'
  RETURNING * INTO v_leave;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave already processed or not found' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_leave;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject leave atomically: restore balance when rejecting
CREATE OR REPLACE FUNCTION reject_leave(p_leave_id UUID)
RETURNS leaves AS $$
DECLARE
  v_leave leaves;
BEGIN
  UPDATE leaves SET status = 'rejected'
  WHERE id = p_leave_id AND status = 'applied'
  RETURNING * INTO v_leave;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave already processed or not found' USING ERRCODE = 'P0001';
  END IF;

  -- Restore the balance since applied leave balance was deducted on submission
  UPDATE leave_balance
  SET used = used - 1,
      remaining = remaining + 1,
      updated_at = NOW()
  WHERE user_id = v_leave.user_id;

  RETURN v_leave;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct leave balance
CREATE OR REPLACE FUNCTION deduct_leave_balance(p_user_id UUID, p_days INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE leave_balance
  SET used = used + p_days,
      remaining = remaining - p_days,
      updated_at = NOW()
  WHERE user_id = p_user_id AND remaining >= p_days;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient leave balance' USING ERRCODE = 'P0002';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore leave balance (on delete of applied leave)
CREATE OR REPLACE FUNCTION restore_leave_balance(p_user_id UUID, p_days INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE leave_balance
  SET used = used - p_days,
      remaining = remaining + p_days,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Next employee ID sequence value
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

CREATE OR REPLACE FUNCTION next_employee_id_seq()
RETURNS INTEGER AS $$
  SELECT nextval('employee_id_seq')::INTEGER;
$$ LANGUAGE sql SECURITY DEFINER;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_timecards_updated_at BEFORE UPDATE ON timecards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_overtime_updated_at BEFORE UPDATE ON overtime FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leaves_updated_at BEFORE UPDATE ON leaves FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_balance_updated_at BEFORE UPDATE ON leave_balance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
