-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE timecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role from users table
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get current user's manager_id
CREATE OR REPLACE FUNCTION current_user_manager_id()
RETURNS UUID AS $$
  SELECT manager_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- users: owner sees all + aadhaar; manager/employee see own row without aadhaar
CREATE POLICY users_select_own ON users FOR SELECT
  USING (id = auth.uid() AND current_user_role() != 'owner');

CREATE POLICY users_select_owner ON users FOR SELECT
  USING (current_user_role() = 'owner');

-- timecards: employees/managers see own rows; managers see their team; owners see all
CREATE POLICY timecards_select_own ON timecards FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY timecards_select_manager ON timecards FOR SELECT
  USING (
    current_user_role() = 'manager' AND
    EXISTS (SELECT 1 FROM users u WHERE u.id = timecards.user_id AND u.manager_id = auth.uid())
  );

CREATE POLICY timecards_select_owner ON timecards FOR SELECT
  USING (current_user_role() = 'owner');

CREATE POLICY timecards_insert_own ON timecards FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY timecards_update_own ON timecards FOR UPDATE
  USING (user_id = auth.uid() AND status = 'applied');

CREATE POLICY timecards_delete_own ON timecards FOR DELETE
  USING (user_id = auth.uid() AND status = 'applied');

-- leaves: same pattern as timecards
CREATE POLICY leaves_select_own ON leaves FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY leaves_select_manager ON leaves FOR SELECT
  USING (
    current_user_role() = 'manager' AND
    EXISTS (SELECT 1 FROM users u WHERE u.id = leaves.user_id AND u.manager_id = auth.uid())
  );

CREATE POLICY leaves_select_owner ON leaves FOR SELECT
  USING (current_user_role() = 'owner');

CREATE POLICY leaves_insert_own ON leaves FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY leaves_update_own ON leaves FOR UPDATE
  USING (user_id = auth.uid() AND status = 'applied');

CREATE POLICY leaves_delete_own ON leaves FOR DELETE
  USING (user_id = auth.uid() AND status = 'applied');

-- overtime: same pattern
CREATE POLICY overtime_select_own ON overtime FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY overtime_select_manager ON overtime FOR SELECT
  USING (
    current_user_role() = 'manager' AND
    EXISTS (SELECT 1 FROM users u WHERE u.id = overtime.user_id AND u.manager_id = auth.uid())
  );

CREATE POLICY overtime_select_owner ON overtime FOR SELECT
  USING (current_user_role() = 'owner');

CREATE POLICY overtime_insert_own ON overtime FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY overtime_update_own ON overtime FOR UPDATE
  USING (user_id = auth.uid() AND status = 'applied');

CREATE POLICY overtime_delete_own ON overtime FOR DELETE
  USING (user_id = auth.uid() AND status = 'applied');

-- leave_balance: users see own; owners see all
CREATE POLICY leave_balance_select_own ON leave_balance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY leave_balance_select_owner ON leave_balance FOR SELECT
  USING (current_user_role() = 'owner');

-- system_config: all authenticated users can read
CREATE POLICY system_config_select ON system_config FOR SELECT USING (auth.uid() IS NOT NULL);

-- holidays: all authenticated users can read
CREATE POLICY holidays_select ON holidays FOR SELECT USING (auth.uid() IS NOT NULL);
