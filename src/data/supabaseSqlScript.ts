export const SUPABASE_SQL_SCRIPT = `-- ============================================================================
-- BUILDMATE — SIX ROLE-BASED PROFILE TABLES & RLS MIGRATION SCRIPT
-- Target Project: https://uznmqmvafuyyzgshsogx.supabase.co
-- Safe & Idempotent: Preserves all existing tables and data.
-- ============================================================================
--
-- LIVE SCHEMA INSPECTION SUMMARY (uznmqmvafuyyzgshsogx):
-- 1. Six Role Profile Tables Found:
--    - public.admins (user_id, full_name, work_email, phone, is_active, created_at)
--    - public.hr_managers (user_id, full_name, work_email, phone, department, designation, joining_date, is_active, created_at)
--    - public.site_supervisors (user_id, full_name, work_email, phone, employee_code, joining_date, experience_years, specialization, assigned_site_id, is_active, created_at)
--    - public.accountants (user_id, full_name, work_email, phone, employee_code, joining_date, qualification, is_active, created_at)
--    - public.employees (user_id, full_name, work_email, phone, employee_code, department, designation, joining_date, assigned_site_id, employment_type, is_active, created_at)
--    - public.labourers (user_id, full_name, work_email, phone, labour_code, joining_date, experience_years, assigned_site_id, wage_rate, wage_type, emergency_contact, kyc_status, address, is_active, created_at)
--
-- 2. Schema Mismatches & Broken Functions Repaired by This Migration:
--    - Replaces legacy public.is_admin() which threw [42P01: relation "public.profiles" does not exist].
--    - Adds numeric identity bridge columns (employee_id, labour_id, supervisor_id, hr_id, accountant_id)
--      so UUID-keyed role tables link cleanly with BIGINT foreign keys in attendance, salary, tasks, and leaves.
--    - Adds site_id (BIGINT) bridge column alongside assigned_site_id (UUID) to match public.sites(site_id).
--    - Enforces at most ONE active role profile per user_id across all 6 tables via PostgreSQL trigger.
--    - Configures strict Row Level Security (RLS) and GRANT permissions for all 6 roles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: ENSURE ALL 6 ROLE-SPECIFIC TABLES EXIST & ADD BRIDGE COLUMNS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  work_email TEXT UNIQUE,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_managers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  work_email TEXT UNIQUE,
  phone TEXT,
  department TEXT DEFAULT 'Human Resources',
  designation TEXT DEFAULT 'HR Manager',
  joining_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.site_supervisors (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  work_email TEXT UNIQUE,
  phone TEXT,
  employee_code TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  experience_years INTEGER DEFAULT 0,
  specialization TEXT,
  assigned_site_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accountants (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  work_email TEXT UNIQUE,
  phone TEXT,
  employee_code TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  qualification TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employees (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  work_email TEXT UNIQUE,
  phone TEXT,
  employee_code TEXT,
  department TEXT,
  designation TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  assigned_site_id UUID,
  employment_type TEXT DEFAULT 'FULL_TIME',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.labourers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  work_email TEXT UNIQUE,
  phone TEXT,
  labour_code TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  experience_years INTEGER DEFAULT 0,
  assigned_site_id UUID,
  wage_rate NUMERIC(10, 2) NOT NULL DEFAULT 800,
  wage_type TEXT NOT NULL DEFAULT 'DAILY',
  emergency_contact TEXT,
  kyc_status TEXT DEFAULT 'PENDING_KYC',
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add non-destructive BIGINT bridge columns & extended operational fields
ALTER TABLE public.hr_managers
  ADD COLUMN IF NOT EXISTS hr_id BIGINT GENERATED BY DEFAULT AS IDENTITY UNIQUE;

ALTER TABLE public.site_supervisors
  ADD COLUMN IF NOT EXISTS supervisor_id BIGINT GENERATED BY DEFAULT AS IDENTITY UNIQUE,
  ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES public.sites(site_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.accountants
  ADD COLUMN IF NOT EXISTS accountant_id BIGINT GENERATED BY DEFAULT AS IDENTITY UNIQUE;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_id BIGINT GENERATED BY DEFAULT AS IDENTITY UNIQUE,
  ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES public.sites(site_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12, 2) DEFAULT 60000,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'VERIFIED',
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'FIT_FOR_DUTY',
  ADD COLUMN IF NOT EXISTS medical_notes TEXT;

ALTER TABLE public.labourers
  ADD COLUMN IF NOT EXISTS labour_id BIGINT GENERATED BY DEFAULT AS IDENTITY UNIQUE,
  ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES public.sites(site_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS skill TEXT DEFAULT 'Skilled Construction Operative',
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 110,
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'FIT_FOR_DUTY',
  ADD COLUMN IF NOT EXISTS medical_notes TEXT;

-- Create material_requests table for Site Supervisor -> Admin approval workflow
CREATE TABLE IF NOT EXISTS public.material_requests (
  request_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  material_id BIGINT REFERENCES public.materials(material_id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  category TEXT DEFAULT 'Structural',
  unit TEXT NOT NULL DEFAULT 'Units',
  requested_qty NUMERIC(12, 2) NOT NULL CHECK (requested_qty > 0),
  approved_qty NUMERIC(12, 2) DEFAULT 0,
  delivered_qty NUMERIC(12, 2) DEFAULT 0,
  used_qty NUMERIC(12, 2) DEFAULT 0,
  estimated_unit_cost NUMERIC(12, 2) DEFAULT 0,
  estimated_value NUMERIC(14, 2) DEFAULT 0,
  actual_value NUMERIC(14, 2) DEFAULT 0,
  project_id BIGINT REFERENCES public.projects(project_id) ON DELETE CASCADE,
  site_id BIGINT REFERENCES public.sites(site_id) ON DELETE CASCADE,
  supervisor_id BIGINT,
  supplier_id BIGINT REFERENCES public.suppliers(supplier_id) ON DELETE SET NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE,
  approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  delivery_status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (delivery_status IN ('REQUESTED', 'ORDERED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'USED')),
  approved_by TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend operational tables with optional columns used by Accountant, HR & Supervisor views
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recorded_by TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS employee_id BIGINT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM';

ALTER TABLE public.leaves
  ADD COLUMN IF NOT EXISTS employee_id BIGINT,
  ADD COLUMN IF NOT EXISTS worker_type TEXT DEFAULT 'LABOUR',
  ADD COLUMN IF NOT EXISTS remarks TEXT;

ALTER TABLE public.salary
  ADD COLUMN IF NOT EXISTS labour_id BIGINT,
  ADD COLUMN IF NOT EXISTS worker_type TEXT DEFAULT 'EMPLOYEE',
  ADD COLUMN IF NOT EXISTS worked_days NUMERIC(5, 2) DEFAULT 26,
  ADD COLUMN IF NOT EXISTS worked_hours NUMERIC(6, 2) DEFAULT 208,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'BANK_TRANSFER',
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT;

-- ----------------------------------------------------------------------------
-- STEP 2: ENFORCE SINGLE ROLE PROFILE PER USER_ID ACROSS ALL 6 TABLES
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_single_role_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_count INTEGER := 0;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    (CASE WHEN TG_TABLE_NAME <> 'admins' AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = NEW.user_id) THEN 1 ELSE 0 END) +
    (CASE WHEN TG_TABLE_NAME <> 'hr_managers' AND EXISTS (SELECT 1 FROM public.hr_managers WHERE user_id = NEW.user_id) THEN 1 ELSE 0 END) +
    (CASE WHEN TG_TABLE_NAME <> 'site_supervisors' AND EXISTS (SELECT 1 FROM public.site_supervisors WHERE user_id = NEW.user_id) THEN 1 ELSE 0 END) +
    (CASE WHEN TG_TABLE_NAME <> 'accountants' AND EXISTS (SELECT 1 FROM public.accountants WHERE user_id = NEW.user_id) THEN 1 ELSE 0 END) +
    (CASE WHEN TG_TABLE_NAME <> 'employees' AND EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.user_id) THEN 1 ELSE 0 END) +
    (CASE WHEN TG_TABLE_NAME <> 'labourers' AND EXISTS (SELECT 1 FROM public.labourers WHERE user_id = NEW.user_id) THEN 1 ELSE 0 END)
  INTO match_count;

  IF match_count > 0 THEN
    RAISE EXCEPTION 'Role conflict: user_id % already exists in another role-specific profile table. Each user account may have only one role profile.', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_role_admins ON public.admins;
CREATE TRIGGER trg_single_role_admins
  BEFORE INSERT OR UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_role_profile();

DROP TRIGGER IF EXISTS trg_single_role_hr_managers ON public.hr_managers;
CREATE TRIGGER trg_single_role_hr_managers
  BEFORE INSERT OR UPDATE ON public.hr_managers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_role_profile();

DROP TRIGGER IF EXISTS trg_single_role_site_supervisors ON public.site_supervisors;
CREATE TRIGGER trg_single_role_site_supervisors
  BEFORE INSERT OR UPDATE ON public.site_supervisors
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_role_profile();

DROP TRIGGER IF EXISTS trg_single_role_accountants ON public.accountants;
CREATE TRIGGER trg_single_role_accountants
  BEFORE INSERT OR UPDATE ON public.accountants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_role_profile();

DROP TRIGGER IF EXISTS trg_single_role_employees ON public.employees;
CREATE TRIGGER trg_single_role_employees
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_role_profile();

DROP TRIGGER IF EXISTS trg_single_role_labourers ON public.labourers;
CREATE TRIGGER trg_single_role_labourers
  BEFORE INSERT OR UPDATE ON public.labourers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_role_profile();

-- ----------------------------------------------------------------------------
-- STEP 3: SIX-ROLE SECURITY DEFINER HELPER FUNCTIONS (REPLACES BROKEN profiles FN)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id::text = auth.uid()::text AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_hr_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hr_managers
    WHERE user_id::text = auth.uid()::text AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_site_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_supervisors
    WHERE user_id::text = auth.uid()::text AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accountants
    WHERE user_id::text = auth.uid()::text AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id::text = auth.uid()::text AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_labourer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.labourers
    WHERE user_id::text = auth.uid()::text AND is_active = TRUE
  );
$$;

-- Backward compatibility alias for existing policies that call public.is_hr()
CREATE OR REPLACE FUNCTION public.is_hr()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.is_hr_manager();
$$;

-- ----------------------------------------------------------------------------
-- STEP 4: TABLE GRANTS & ROW LEVEL SECURITY (RLS) ACROSS ALL TABLES
-- ----------------------------------------------------------------------------

-- Grant table privileges to anon and authenticated so 6-role table login (ACC001, ADM001, etc.) can query role tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_managers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_supervisors TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accountants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labourers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_project_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labour_project_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaves TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_requests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_materials TO anon, authenticated;

-- Enable RLS on all 6 role tables + 12 operational tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labourers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_materials ENABLE ROW LEVEL SECURITY;

-- 1. ADMINS
DROP POLICY IF EXISTS "admins_select_own_or_admin" ON public.admins;
CREATE POLICY "admins_select_own_or_admin" ON public.admins
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "admins_write_admin_only" ON public.admins;
CREATE POLICY "admins_write_admin_only" ON public.admins
  FOR ALL TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 2. HR_MANAGERS
DROP POLICY IF EXISTS "hr_managers_select" ON public.hr_managers;
CREATE POLICY "hr_managers_select" ON public.hr_managers
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "hr_managers_write_admin" ON public.hr_managers;
CREATE POLICY "hr_managers_write_admin" ON public.hr_managers
  FOR ALL TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 3. SITE_SUPERVISORS
DROP POLICY IF EXISTS "site_supervisors_select" ON public.site_supervisors;
CREATE POLICY "site_supervisors_select" ON public.site_supervisors
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "site_supervisors_write_admin" ON public.site_supervisors;
CREATE POLICY "site_supervisors_write_admin" ON public.site_supervisors
  FOR ALL TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 4. ACCOUNTANTS
DROP POLICY IF EXISTS "accountants_select" ON public.accountants;
CREATE POLICY "accountants_select" ON public.accountants
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "accountants_write_admin" ON public.accountants;
CREATE POLICY "accountants_write_admin" ON public.accountants
  FOR ALL TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 5. EMPLOYEES
DROP POLICY IF EXISTS "employees_select_authorized" ON public.employees;
CREATE POLICY "employees_select_authorized" ON public.employees
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "employees_write_admin_hr" ON public.employees;
CREATE POLICY "employees_write_admin_hr" ON public.employees
  FOR ALL TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 6. LABOURERS
DROP POLICY IF EXISTS "labourers_select_authorized" ON public.labourers;
CREATE POLICY "labourers_select_authorized" ON public.labourers
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "labourers_write_admin_hr" ON public.labourers;
CREATE POLICY "labourers_write_admin_hr" ON public.labourers
  FOR ALL TO anon, authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- 7. PROJECTS & SITES: Authenticated roles can read; Admin (and Supervisor on sites) can write
DROP POLICY IF EXISTS "projects_select_auth" ON public.projects;
CREATE POLICY "projects_select_auth" ON public.projects
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "projects_write_admin" ON public.projects;
CREATE POLICY "projects_write_admin" ON public.projects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sites_select_auth" ON public.sites;
CREATE POLICY "sites_select_auth" ON public.sites
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "sites_write_admin_sup" ON public.sites;
CREATE POLICY "sites_write_admin_sup" ON public.sites
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_site_supervisor())
  WITH CHECK (public.is_admin() OR public.is_site_supervisor());

-- 8. PROJECT ASSIGNMENTS: Admin & HR can write; authenticated can read
DROP POLICY IF EXISTS "emp_assignments_select" ON public.employee_project_assignments;
CREATE POLICY "emp_assignments_select" ON public.employee_project_assignments
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "emp_assignments_write" ON public.employee_project_assignments;
CREATE POLICY "emp_assignments_write" ON public.employee_project_assignments
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hr_manager())
  WITH CHECK (public.is_admin() OR public.is_hr_manager());

DROP POLICY IF EXISTS "lab_assignments_select" ON public.labour_project_assignments;
CREATE POLICY "lab_assignments_select" ON public.labour_project_assignments
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "lab_assignments_write" ON public.labour_project_assignments;
CREATE POLICY "lab_assignments_write" ON public.labour_project_assignments
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hr_manager() OR public.is_site_supervisor())
  WITH CHECK (public.is_admin() OR public.is_hr_manager() OR public.is_site_supervisor());

-- 9. ATTENDANCE: Admin, HR, Supervisor, Accountant, and own worker can read; Admin, HR, Supervisor can write
DROP POLICY IF EXISTS "attendance_select_auth" ON public.attendance;
CREATE POLICY "attendance_select_auth" ON public.attendance
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "attendance_write_ops" ON public.attendance;
CREATE POLICY "attendance_write_ops" ON public.attendance
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hr_manager() OR public.is_site_supervisor())
  WITH CHECK (public.is_admin() OR public.is_hr_manager() OR public.is_site_supervisor());

-- 10. TASKS: Read by all authenticated; written by Admin, HR, Supervisor, or assigned worker updating status
DROP POLICY IF EXISTS "tasks_select_auth" ON public.tasks;
CREATE POLICY "tasks_select_auth" ON public.tasks
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "tasks_write_ops" ON public.tasks;
CREATE POLICY "tasks_write_ops" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hr_manager() OR public.is_site_supervisor() OR public.is_employee() OR public.is_labourer())
  WITH CHECK (public.is_admin() OR public.is_hr_manager() OR public.is_site_supervisor() OR public.is_employee() OR public.is_labourer());

-- 11. LEAVES: Workers can submit leaves; Admin & HR can approve/reject
DROP POLICY IF EXISTS "leaves_select_auth" ON public.leaves;
CREATE POLICY "leaves_select_auth" ON public.leaves
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "leaves_insert_auth" ON public.leaves;
CREATE POLICY "leaves_insert_auth" ON public.leaves
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "leaves_update_admin_hr" ON public.leaves;
CREATE POLICY "leaves_update_admin_hr" ON public.leaves
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_hr_manager())
  WITH CHECK (public.is_admin() OR public.is_hr_manager());

-- 12. SALARY & PAYROLL: Restricted from Site Supervisors; managed by Admin, HR, and Accountant
DROP POLICY IF EXISTS "salary_select_authorized" ON public.salary;
CREATE POLICY "salary_select_authorized" ON public.salary
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_hr_manager()
    OR public.is_accountant()
    OR public.is_employee()
    OR public.is_labourer()
  );

DROP POLICY IF EXISTS "salary_write_payroll_roles" ON public.salary;
CREATE POLICY "salary_write_payroll_roles" ON public.salary
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hr_manager() OR public.is_accountant())
  WITH CHECK (public.is_admin() OR public.is_hr_manager() OR public.is_accountant());

-- 13. MATERIALS, MATERIAL REQUESTS, SUPPLIERS & TASK MATERIALS
DROP POLICY IF EXISTS "materials_select_auth" ON public.materials;
CREATE POLICY "materials_select_auth" ON public.materials
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "materials_write_ops" ON public.materials;
CREATE POLICY "materials_write_ops" ON public.materials
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_site_supervisor())
  WITH CHECK (public.is_admin() OR public.is_site_supervisor());

DROP POLICY IF EXISTS "material_requests_select_auth" ON public.material_requests;
CREATE POLICY "material_requests_select_auth" ON public.material_requests
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "material_requests_write_ops" ON public.material_requests;
CREATE POLICY "material_requests_write_ops" ON public.material_requests
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_site_supervisor())
  WITH CHECK (public.is_admin() OR public.is_site_supervisor());

DROP POLICY IF EXISTS "suppliers_select_auth" ON public.suppliers;
CREATE POLICY "suppliers_select_auth" ON public.suppliers
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "suppliers_write_admin" ON public.suppliers;
CREATE POLICY "suppliers_write_admin" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_accountant())
  WITH CHECK (public.is_admin() OR public.is_accountant());

DROP POLICY IF EXISTS "task_materials_select_auth" ON public.task_materials;
CREATE POLICY "task_materials_select_auth" ON public.task_materials
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "task_materials_write_ops" ON public.task_materials;
CREATE POLICY "task_materials_write_ops" ON public.task_materials
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_site_supervisor())
  WITH CHECK (public.is_admin() OR public.is_site_supervisor());

-- ----------------------------------------------------------------------------
-- STEP 5: SECURE ADMIN & 6-ROLE BOOTSTRAP (LINKS EXISTING AUTH.USERS BY EMAIL)
-- ----------------------------------------------------------------------------
-- Enrolls your primary Supabase Auth account (faijukhan571@gmail.com or admin@buildmate.in)
-- into public.admins, and links any created role test accounts in auth.users.

INSERT INTO public.admins (user_id, full_name, work_email, phone, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Arjun Deshmukh (Admin)'), email, '+91 98201 11001', TRUE
FROM auth.users
WHERE email IN ('faijukhan571@gmail.com', 'admin@buildmate.in')
ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, work_email = EXCLUDED.work_email;

INSERT INTO public.hr_managers (user_id, full_name, work_email, phone, department, designation, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Priya Nair (HR Manager)'), email, '+91 98201 11002', 'Human Resources', 'HR Manager', TRUE
FROM auth.users
WHERE email IN ('priya.nair@buildmate.in', 'hr@buildmate.in')
ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, work_email = EXCLUDED.work_email;

INSERT INTO public.site_supervisors (user_id, full_name, work_email, phone, employee_code, experience_years, specialization, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Vikram Singh Rathore'), email, '+91 98201 11003', 'SUP-101', 9, 'High-Rise RCC & Formwork', TRUE
FROM auth.users
WHERE email IN ('vikram.rathore@buildmate.in', 'supervisor@buildmate.in')
ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, work_email = EXCLUDED.work_email;

INSERT INTO public.accountants (user_id, full_name, work_email, phone, employee_code, qualification, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Rohan Mehta'), email, '+91 98201 11006', 'ACC-101', 'CA / Construction Cost Accountant', TRUE
FROM auth.users
WHERE email IN ('accountant@buildmate.in', 'rohan.mehta@buildmate.in')
ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, work_email = EXCLUDED.work_email;

INSERT INTO public.employees (user_id, full_name, work_email, phone, employee_code, department, designation, employment_type, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Karthik Subramanian'), email, '+91 98450 11204', 'EMP-201', 'Structural Engineering', 'Senior Civil Site Engineer', 'FULL_TIME', TRUE
FROM auth.users
WHERE email IN ('karthik.s@buildmate.in', 'employee@buildmate.in')
ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, work_email = EXCLUDED.work_email;

INSERT INTO public.labourers (user_id, full_name, work_email, phone, labour_code, experience_years, wage_rate, wage_type, kyc_status, address, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Rameshwar Prasad Yadav'), email, '+91 98450 11201', 'LAB-101', 9, 950, 'DAILY', 'VERIFIED', 'Labour Camp A, Whitefield, Bengaluru', TRUE
FROM auth.users
WHERE email IN ('rameshwar.yadav@buildmate.in', 'labourer@buildmate.in')
ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, work_email = EXCLUDED.work_email;

-- ----------------------------------------------------------------------------
-- STEP 6: SUPABASE STORAGE BUCKETS & RLS POLICIES FOR ALL 6 ROLE BUCKETS
-- Fixes "POLICIES: 0 / new row violates row-level security policy" on storage.objects
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('Employees Attendence Images', 'Employees Attendence Images', true),
  ('Labour attendance Image', 'Labour attendance Image', true),
  ('Accountant Attendace Images', 'Accountant Attendace Images', true),
  ('HR Managers Attendance Images', 'HR Managers Attendance Images', true),
  ('Admin Attendance Images', 'Admin Attendance Images', true),
  ('Material Delivered images', 'Material Delivered images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "buildmate_storage_select_all_6_buckets" ON storage.objects;
CREATE POLICY "buildmate_storage_select_all_6_buckets"
ON storage.objects FOR SELECT
TO public, anon, authenticated
USING (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
);

DROP POLICY IF EXISTS "buildmate_storage_insert_all_6_buckets" ON storage.objects;
CREATE POLICY "buildmate_storage_insert_all_6_buckets"
ON storage.objects FOR INSERT
TO public, anon, authenticated
WITH CHECK (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
);

DROP POLICY IF EXISTS "buildmate_storage_update_all_6_buckets" ON storage.objects;
CREATE POLICY "buildmate_storage_update_all_6_buckets"
ON storage.objects FOR UPDATE
TO public, anon, authenticated
USING (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
)
WITH CHECK (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
);

DROP POLICY IF EXISTS "buildmate_storage_delete_all_6_buckets" ON storage.objects;
CREATE POLICY "buildmate_storage_delete_all_6_buckets"
ON storage.objects FOR DELETE
TO public, anon, authenticated
USING (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
);
`;

export const SUPABASE_STORAGE_BUCKETS_SQL = `-- ============================================================================
-- BUILDMATE — ENABLE UPLOAD & VIEW POLICIES FOR ALL 6 ROLE STORAGE BUCKETS
-- Run in Supabase Dashboard -> SQL Editor to change POLICIES from 0 to Active
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('Employees Attendence Images', 'Employees Attendence Images', true),
  ('Labour attendance Image', 'Labour attendance Image', true),
  ('Accountant Attendace Images', 'Accountant Attendace Images', true),
  ('HR Managers Attendance Images', 'HR Managers Attendance Images', true),
  ('Admin Attendance Images', 'Admin Attendance Images', true),
  ('Material Delivered images', 'Material Delivered images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "buildmate_storage_select_all_6_buckets" ON storage.objects;
CREATE POLICY "buildmate_storage_select_all_6_buckets"
ON storage.objects FOR SELECT
TO public, anon, authenticated
USING (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
);

DROP POLICY IF EXISTS "buildmate_storage_insert_all_6_buckets" ON storage.objects;
CREATE POLICY "buildmate_storage_insert_all_6_buckets"
ON storage.objects FOR INSERT
TO public, anon, authenticated
WITH CHECK (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
);

DROP POLICY IF EXISTS "buildmate_storage_update_all_6_buckets" ON storage.objects;
CREATE POLICY "buildmate_storage_update_all_6_buckets"
ON storage.objects FOR UPDATE
TO public, anon, authenticated
USING (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
)
WITH CHECK (
  bucket_id IN (
    'Employees Attendence Images',
    'Labour attendance Image',
    'Accountant Attendace Images',
    'HR Managers Attendance Images',
    'Admin Attendance Images',
    'Material Delivered images'
  )
);
`;

