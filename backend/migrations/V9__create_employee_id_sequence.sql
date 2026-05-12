-- Employee ID sequence starts at 1 so SE_5001 is the first non-owner employee
-- SE_5000 is reserved for the owner (seeded in V8)
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1 INCREMENT 1 NO CYCLE;
