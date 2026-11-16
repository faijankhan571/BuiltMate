export type UserRole =
  | 'Admin'
  | 'HR Manager'
  | 'Site Supervisor'
  | 'Accountant'
  | 'Employee'
  | 'Labourer';

export type RoleTableName =
  | 'admins'
  | 'hr_managers'
  | 'site_supervisors'
  | 'accountants'
  | 'employees'
  | 'labourers';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DELAYED'
  | 'CANCELLED';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentStatus = 'PAID' | 'PENDING' | 'PROCESSING' | 'PARTIALLY_PAID';
export type KycStatus = 'VERIFIED' | 'PENDING_KYC' | 'PENDING_DOCS' | 'UNDER_REVIEW' | 'REJECTED';
export type HealthStatus = 'FIT_FOR_DUTY' | 'CHECKUP_DUE' | 'MEDICAL_HOLD' | 'RESTRICTED_LIGHT_DUTY';
export type WageType = 'DAILY' | 'HOURLY' | 'CONTRACT';
export type MaterialRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELIVERED';

export interface RoleRecord {
  role_id: number;
  role_name: UserRole;
  description: string;
}

export interface Profile {
  user_id: string;
  role_id: number;
  name: string;
  full_name?: string;
  email: string;
  work_email?: string;
  phone: string;
  is_active?: boolean;
  role_table?: RoleTableName;
  created_at: string;
  updated_at: string;
  role_name?: UserRole;
}

export interface AdminProfileRecord {
  user_id: string;
  full_name: string;
  work_email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface AccountantProfileRecord {
  accountant_id?: number;
  user_id: string;
  full_name: string;
  work_email: string;
  phone: string;
  employee_code?: string;
  joining_date?: string;
  qualification?: string;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeRecord {
  employee_id: number;
  user_id?: string | null;
  name: string;
  full_name?: string;
  email: string;
  work_email?: string;
  phone: string;
  address: string;
  designation: string;
  department?: string;
  employee_code?: string;
  employment_type?: string;
  assigned_site_id?: string | number | null;
  joining_date: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  is_active?: boolean;
  monthly_salary?: number;
  kyc_status?: KycStatus;
  kyc_doc_type?: string;
  kyc_number?: string;
  kyc_document_ref?: string;
  health_status?: HealthStatus;
  last_checkup_date?: string;
  health_checkup_date?: string;
  blood_group?: string;
  medical_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LabourRecord {
  labour_id: number;
  user_id?: string | null;
  name: string;
  full_name?: string;
  email?: string;
  work_email?: string;
  phone: string;
  emergency_contact?: string;
  address: string;
  skill: string;
  skill_or_trade?: string;
  labour_code?: string;
  site_id?: number | null;
  assigned_site_id?: string | number | null;
  experience_years?: number;
  wage_type?: WageType;
  wage_rate: number;
  daily_rate?: number;
  hourly_rate?: number;
  auth_enabled?: boolean;
  kyc_status?: KycStatus;
  kyc_doc_type?: string;
  kyc_number?: string;
  kyc_document_ref?: string;
  health_status?: HealthStatus;
  last_checkup_date?: string;
  health_checkup_date?: string;
  blood_group?: string;
  medical_notes?: string;
  joining_date: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface HrManagerRecord {
  hr_id: number;
  user_id?: string | null;
  name: string;
  full_name?: string;
  email: string;
  work_email?: string;
  phone: string;
  department?: string;
  designation?: string;
  joining_date?: string;
  is_active?: boolean;
  created_at: string;
}

export interface SiteSupervisorRecord {
  supervisor_id: number;
  user_id?: string | null;
  name: string;
  full_name?: string;
  email: string;
  work_email?: string;
  phone: string;
  address: string;
  employee_code?: string;
  joining_date?: string;
  experience_years?: number;
  specialization?: string;
  assigned_site_id?: string | number | null;
  status: 'ACTIVE' | 'INACTIVE';
  is_active?: boolean;
  created_at: string;
}

export interface ProjectRecord {
  project_id: number;
  project_name: string;
  description?: string;
  client_name?: string;
  location: string;
  start_date: string;
  end_date: string;
  budget: number;
  status: 'ACTIVE' | 'PLANNING' | 'COMPLETED' | 'ON_HOLD' | 'DELAYED';
  created_at: string;
  updated_at: string;
}

export interface EmployeeProjectAssignment {
  assignment_id: number;
  employee_id: number;
  project_id: number;
  site_id?: number | null;
  start_date: string;
  end_date?: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  created_at: string;
}

export interface LabourProjectAssignment {
  assignment_id: number;
  labour_id: number;
  project_id: number;
  site_id?: number | null;
  start_date: string;
  end_date?: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  created_at: string;
}

export interface SiteRecord {
  site_id: number;
  project_id: number;
  supervisor_id: number | null;
  site_name: string;
  location: string;
  geofence_lat?: number;
  geofence_lng?: number;
  geofence_radius_meters?: number;
  status: 'ACTIVE' | 'INSPECTION_DUE' | 'COMPLETED' | 'ON_HOLD';
  created_at: string;
}

export interface AttendanceRecord {
  attendance_id: number;
  site_id: number;
  employee_id?: number | null;
  labour_id?: number | null;
  attendance_date: string;
  status: AttendanceStatus;
  hours_worked: number;
  overtime_hours?: number;
  recorded_by?: string;
  selfie_url?: string | null;
  selfie_bucket_path?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  geofence_verified?: boolean;
  geofence_distance_m?: number;
  geofence_radius_m?: number;
  accuracy_meters?: number | null;
  updated_at?: string;
}

export interface TaskRecord {
  task_id: number;
  project_id: number;
  site_id?: number | null;
  supervisor_id?: number | null;
  employee_id?: number | null;
  labour_id?: number | null;
  task_category?: 'OFFICE' | 'SITE';
  assigned_by_role?: UserRole;
  assigned_by_name?: string;
  task_name: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  start_date: string;
  end_date: string;
  status: TaskStatus;
  created_at: string;
}

export interface LeaveRecord {
  leave_id: number;
  labour_id: string | number;
  user_id?: string | null;
  employee_id?: number | null;
  supervisor_id?: number | null;
  worker_type?: 'LABOUR' | 'EMPLOYEE' | 'SUPERVISOR';
  worker_name?: string | null;
  skill_or_trade?: string | null;
  phone?: string | null;
  work_email?: string | null;
  leave_type: 'SICK' | 'CASUAL' | 'EMERGENCY' | 'UNPAID';
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveStatus;
  applied_on: string;
  approved_by?: string | null;
  approved_at?: string | null;
  decision_date?: string | null;
  remarks?: string | null;
}

export interface SalaryRecord {
  salary_id: number;
  employee_id: number;
  labour_id?: number | null;
  worker_type?: 'EMPLOYEE' | 'LABOUR';
  hr_id?: number | null;
  month: string;
  worked_days?: number;
  worked_hours?: number;
  days_present?: number;
  hours_worked?: number;
  basic_salary: number;
  overtime: number;
  bonus?: number;
  deductions: number;
  net_salary: number;
  paid_amount?: number;
  pending_amount?: number;
  payment_status: PaymentStatus;
  payment_date?: string | null;
  payment_method?: string;
  transaction_ref?: string | null;
  project_id?: number | null;
  site_id?: number | null;
  created_at: string;
}

export interface MaterialRecord {
  material_id: number;
  material_name: string;
  category?: string;
  quantity: number;
  unit: string;
  cost: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  created_at: string;
}

export interface MaterialRequestRecord {
  request_id: number;
  material_id?: number | null;
  material_name: string;
  category?: string;
  unit: string;
  requested_qty: number;
  approved_qty: number;
  delivered_qty: number;
  used_qty: number;
  unit_cost?: number;
  estimated_unit_cost?: number;
  estimated_value: number;
  actual_value?: number;
  actual_expenditure?: number;
  project_id: number;
  site_id: number;
  supervisor_id: number;
  supplier_id?: number | null;
  request_date: string;
  required_date?: string;
  status?: MaterialRequestStatus;
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  delivery_status?: 'REQUESTED' | 'ORDERED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'USED';
  approved_by?: string | null;
  remarks?: string | null;
  notes?: string | null;
  delivery_photo_url?: string | null;
  delivery_photo_bucket_path?: string | null;
  delivered_by?: string | null;
  delivered_at?: string | null;
}

export interface SupplierRecord {
  supplier_id: number;
  supplier_name: string;
  phone: string;
  email?: string;
  address: string;
  supplied_materials?: string | null;
  quoted_rate?: number | null;
  quoted_qty?: number | null;
  rate_unit?: string | null;
  quotation_rate?: number;
  quotation_unit?: string;
  quoted_quantity?: number;
  total_quotation_amount?: number;
  supplied_qty?: number;
  total_order_value?: number;
  delivery_status?: string | null;
  delivery_address?: string | null;
  project_id?: number | null;
  delivery_photo_url?: string | null;
  delivery_photo_bucket_path?: string | null;
  delivered_by?: string | null;
  delivered_at?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface TaskMaterialRecord {
  task_material_id: number;
  task_id: number;
  material_id: number;
  supplier_id?: number | null;
  site_id?: number | null;
  project_id?: number | null;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  usage_date?: string;
}

export interface AppAlert {
  id: string;
  title: string;
  message: string;
  category: 'Attendance' | 'Leave' | 'Task' | 'Material' | 'Payroll' | 'KYC';
  is_read: boolean;
  created_at: string;
}

export interface SixRoleResolutionResult {
  status:
    | 'AUTHORIZED'
    | 'DENIED_NO_PROFILE'
    | 'DENIED_MULTIPLE_PROFILES'
    | 'DENIED_INACTIVE_PROFILE'
    | 'DENIED_DB_ERROR';
  role?: UserRole;
  table?: RoleTableName;
  defaultModule?: string;
  matchedTables: RoleTableName[];
  profile?: Profile;
  rawRow?: Record<string, any>;
  error?: string;
}

export interface SupabaseTableDiagnostic {
  table: string;
  category: 'ROLE_TABLE' | 'OPERATIONAL_TABLE';
  exists: boolean;
  rlsProtected: boolean;
  rowCount: number | null;
  columnsDetected: string[];
  schemaMismatches: string[];
  statusMessage: string;
}

export interface AIWorkforceReport {
  executiveSummary: string;
  attendanceTrends: string;
  staffingShortages: {
    siteName: string;
    issue: string;
    recommendation: string;
    priority: string;
  }[];
  delayedTasksAnalysis: string;
  materialStockRisks: string;
  customQueryAnswer: string;
}
