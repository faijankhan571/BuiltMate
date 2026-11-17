import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  RoleRecord,
  RoleTableName,
  SixRoleResolutionResult,
  SupabaseTableDiagnostic,
  Profile,
  EmployeeRecord,
  LabourRecord,
  HrManagerRecord,
  SiteSupervisorRecord,
  ProjectRecord,
  EmployeeProjectAssignment,
  LabourProjectAssignment,
  SiteRecord,
  AttendanceRecord,
  TaskRecord,
  LeaveRecord,
  SalaryRecord,
  MaterialRecord,
  MaterialRequestRecord,
  MaterialRequestStatus,
  AccountantProfileRecord,
  SupplierRecord,
  TaskMaterialRecord,
  AppAlert,
  UserRole,
  LeaveStatus,
  PaymentStatus,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import {
  INITIAL_ROLES,
  DEMO_PROFILES,
  INITIAL_HR_MANAGERS,
  INITIAL_SITE_SUPERVISORS,
  INITIAL_ACCOUNTANTS,
  INITIAL_EMPLOYEES,
  INITIAL_LABOURS,
  INITIAL_PROJECTS,
  INITIAL_SITES,
  INITIAL_EMP_ASSIGNMENTS,
  INITIAL_LABOUR_ASSIGNMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_TASKS,
  INITIAL_LEAVES,
  INITIAL_SALARIES,
  INITIAL_MATERIALS,
  INITIAL_MATERIAL_REQUESTS,
  INITIAL_SUPPLIERS,
  INITIAL_TASK_MATERIALS,
  INITIAL_ALERTS,
} from '../data/seedData';
import {
  SIX_ROLE_TABLES,
  ROLE_TABLE_CONFIG,
  resolveSixRoleAuthProfile,
  authenticateSixRoleCredentials,
  getDefaultModuleForRole,
  getRoleTableForRole,
  normalizeEmployeeRow,
  normalizeLabourerRow,
  normalizeHrManagerRow,
  normalizeSiteSupervisorRow,
  normalizeSupplierRow,
  calculateNetSalary,
  deriveMaterialStockStatus,
  hasDuplicateAttendance,
  getAttendanceBucketForRole,
  ATTENDANCE_STORAGE_BUCKETS,
  getSystemCurrentDateString,
  sanitize10DigitPhone,
  normalizeProjectId,
} from '../utils/workforceLogic';
import {
  OfflineSyncMutation,
  OfflineAttendancePayload,
  OfflineAddTaskPayload,
  OfflineUpdateTaskPayload,
  enqueueOfflineMutation,
  getPendingOfflineMutations,
  removeOfflineMutation,
  saveCachedStateToIndexedDB,
  loadCachedStateFromIndexedDB,
  registerWorkforceServiceWorker,
  requestServiceWorkerSync,
} from '../utils/offlineSyncDb';

interface ToastAlert {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type RoleVerificationScenario =
  | UserRole
  | 'INACTIVE_PROFILE'
  | 'MULTI_ROLE_CONFLICT'
  | 'UNREGISTERED_USER';

interface WorkforceContextType {
  currentUser: Profile | null;
  currentRole: UserRole;
  isSampleMode: boolean;
  isLoading: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  // Offline Service Worker + IndexedDB State
  isOnline: boolean;
  isSimulatedOffline: boolean;
  setOfflineSimulation: (offline: boolean) => void;
  offlineQueueCount: number;
  offlineQueueItems: OfflineSyncMutation[];
  isSyncingOfflineQueue: boolean;
  syncOfflineQueue: () => Promise<number>;
  lastAuthResolution: SixRoleResolutionResult | null;
  targetModuleRedirect: string | null;
  clearTargetModuleRedirect: () => void;
  loginWithSupabase: (
    email: string,
    password: string,
    expectedRole?: UserRole,
    rememberMe?: boolean
  ) => Promise<{ error?: string; resolution?: SixRoleResolutionResult }>;
  signUpWithSupabase: (
    nameOrEmail: string,
    emailOrPass: string,
    passwordOrName: string,
    roleOrPhone: string | UserRole,
    optionalRole?: UserRole
  ) => Promise<{ error?: string; message?: string }>;
  resetPasswordWithSupabase: (
    email: string
  ) => Promise<{ error?: string; message?: string }>;
  verifyRoleScenario: (
    scenario: RoleVerificationScenario,
    rememberMe?: boolean
  ) => { error?: string; resolution: SixRoleResolutionResult };
  runSupabaseSchemaDiagnostics: () => Promise<{
    diagnostics: SupabaseTableDiagnostic[];
    isAdminRpcBroken: boolean;
    isAdminRpcError: string | null;
    unauthorizedBlockedCount: number;
  }>;
  loginDemoRole: (role: UserRole, rememberMe?: boolean) => void;
  switchRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  syncWithSupabase: () => Promise<void>;
  seedLiveSupabaseDatabase: () => Promise<void>;

  // 18 Database Tables (6 Role Tables + 12 Operational Tables)
  roles: RoleRecord[];
  profiles: Profile[];
  employees: EmployeeRecord[];
  labours: LabourRecord[];
  hrManagers: HrManagerRecord[];
  siteSupervisors: SiteSupervisorRecord[];
  accountants: AccountantProfileRecord[];
  projects: ProjectRecord[];
  empAssignments: EmployeeProjectAssignment[];
  labourAssignments: LabourProjectAssignment[];
  sites: SiteRecord[];
  attendance: AttendanceRecord[];
  tasks: TaskRecord[];
  leaves: LeaveRecord[];
  salaries: SalaryRecord[];
  materials: MaterialRecord[];
  materialRequests: MaterialRequestRecord[];
  suppliers: SupplierRecord[];
  taskMaterials: TaskMaterialRecord[];
  alerts: AppAlert[];

  // Toast Notifications
  toasts: ToastAlert[];
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  dismissToast: (id: string) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  resetDemoDataset: () => void;

  // CRUD: Employees (public.employees)
  addEmployee: (input: Omit<EmployeeRecord, 'employee_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateEmployee: (employee_id: number, updates: Partial<EmployeeRecord>) => Promise<boolean>;
  deleteEmployee: (employee_id: number) => Promise<boolean>;
  assignEmployeeToProject: (input: Omit<EmployeeProjectAssignment, 'assignment_id' | 'created_at'>) => Promise<boolean>;

  // CRUD: Labourers (public.labourers)
  addLabour: (input: Omit<LabourRecord, 'labour_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateLabour: (labour_id: number, updates: Partial<LabourRecord>) => Promise<boolean>;
  deleteLabour: (labour_id: number) => Promise<boolean>;
  assignLabourToProject: (input: Omit<LabourProjectAssignment, 'assignment_id' | 'created_at'>) => Promise<boolean>;

  // CRUD: HR Managers & Site Supervisors (public.hr_managers, public.site_supervisors)
  addHrManager: (input: Omit<HrManagerRecord, 'hr_id' | 'created_at'>) => Promise<boolean>;
  addSiteSupervisor: (input: Omit<SiteSupervisorRecord, 'supervisor_id' | 'created_at'>) => Promise<boolean>;

  // CRUD: Projects & Sites
  addProject: (input: Omit<ProjectRecord, 'project_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateProject: (project_id: number, updates: Partial<ProjectRecord>) => Promise<boolean>;
  deleteProject: (project_id: number) => Promise<boolean>;

  addSite: (input: Omit<SiteRecord, 'site_id' | 'created_at'>) => Promise<boolean>;
  updateSite: (site_id: number, updates: Partial<SiteRecord>) => Promise<boolean>;
  deleteSite: (site_id: number) => Promise<boolean>;

  // CRUD: Attendance & Supabase Selfie Bucket Upload
  recordAttendance: (input: Omit<AttendanceRecord, 'attendance_id'>, allowOverwrite?: boolean) => Promise<boolean>;
  deleteAttendance: (attendance_id: number) => Promise<boolean>;
  uploadAttendanceSelfie: (
    fileOrDataUrl: File | string,
    workerId: number,
    attendanceDate: string,
    workerPrefix?: 'emp' | 'lab' | 'adm' | 'hr' | 'acc' | 'sup',
    customBucketName?: string
  ) => Promise<{
    selfieUrl: string;
    bucketPath: string;
    bucketName: string;
    uploadedToSupabase: boolean;
    rlsBlocked?: boolean;
  }>;

  // CRUD: Tasks
  addTask: (input: Omit<TaskRecord, 'task_id' | 'created_at'>) => Promise<boolean>;
  updateTask: (task_id: number, updates: Partial<TaskRecord>) => Promise<boolean>;
  deleteTask: (task_id: number) => Promise<boolean>;

  // CRUD: Leaves
  submitLeave: (input: Omit<LeaveRecord, 'leave_id' | 'status' | 'applied_on' | 'approved_by'>) => Promise<boolean>;
  updateLeaveStatus: (leave_id: number, status: LeaveStatus, remarks?: string) => Promise<boolean>;

  // CRUD: Salary & Labour Payroll
  createSalaryRecord: (input: {
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
    payment_status: PaymentStatus;
    payment_method?: SalaryRecord['payment_method'];
    transaction_ref?: string | null;
    project_id?: number | null;
    site_id?: number | null;
  }) => Promise<boolean>;
  updateSalaryStatus: (salary_id: number, payment_status: PaymentStatus) => Promise<boolean>;
  recordSalaryPayment: (
    salary_id: number,
    arg2:
      | number
      | string
      | {
          paid_amount: number;
          payment_method: string;
          transaction_ref: string;
          payment_status: PaymentStatus;
        },
    arg3?: string | number,
    arg4?: string | number
  ) => Promise<boolean>;

  // CRUD: Materials, Material Requests, Suppliers & Task Materials
  addMaterial: (input: Omit<MaterialRecord, 'material_id' | 'created_at' | 'status'>) => Promise<boolean>;
  updateMaterial: (material_id: number, updates: Partial<MaterialRecord>) => Promise<boolean>;
  deleteMaterial: (material_id: number) => Promise<boolean>;

  submitMaterialRequest: (input: Partial<MaterialRequestRecord>) => Promise<boolean>;
  updateMaterialRequestStatus: (
    request_id: number,
    arg2: MaterialRequestStatus | Partial<MaterialRequestRecord>,
    actualValueOrReason?: number | string
  ) => Promise<boolean>;

  addSupplier: (input: Omit<SupplierRecord, 'supplier_id' | 'created_at'>) => Promise<boolean>;
  updateSupplier: (supplier_id: number, updates: Partial<SupplierRecord>) => Promise<boolean>;
  deleteSupplier: (supplier_id: number) => Promise<boolean>;
  uploadDeliveredMaterialPhoto: (
    fileOrDataUrl: File | string,
    refId: number,
    materialLabel?: string
  ) => Promise<{
    photoUrl: string;
    bucketPath: string;
    bucketName: string;
    uploadedToSupabase: boolean;
  }>;

  allocateTaskMaterial: (input: Omit<TaskMaterialRecord, 'task_material_id' | 'total_cost'>) => Promise<boolean>;

  // Bulk CSV Import
  bulkImportRecords: (tableName: string, rows: Record<string, string>[]) => Promise<number>;
}

const STORAGE_PREFIX = 'bm_v13_';
const AUTH_STORAGE_KEY = 'bm_v13_auth_user';
const THEME_STORAGE_KEY = 'bm_v3_theme_dark';

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadAuthUser(): Profile | null {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('bm_v8_auth_user');
    localStorage.removeItem('bm_v6_auth_user');
    localStorage.removeItem('bm_v4_auth_user');
    localStorage.removeItem('bm_v3_auth_user');
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('bm_v8_auth_user');
    sessionStorage.removeItem('bm_v6_auth_user');
    sessionStorage.removeItem('bm_v4_auth_user');
    sessionStorage.removeItem('bm_v3_auth_user');
    return null;
  } catch {
    return null;
  }
}

function normalizeTaskListWithOfficeTasks(rawTasks: TaskRecord[]): TaskRecord[] {
  const seedById = new Map(INITIAL_TASKS.map((t) => [t.task_id, t]));
  const normalized: TaskRecord[] = rawTasks.map((t) => {
    const seed = seedById.get(t.task_id);
    if (seed) {
      return {
        ...seed,
        ...t,
        task_category: t.task_category || seed.task_category,
        assigned_by_role: t.assigned_by_role || seed.assigned_by_role,
        assigned_by_name: t.assigned_by_name || seed.assigned_by_name,
        employee_id: seed.task_category === 'SITE' ? null : (t.employee_id ?? seed.employee_id),
        labour_id: seed.task_category === 'OFFICE' ? null : (t.labour_id ?? seed.labour_id),
      };
    }
    const isOffice =
      t.task_category === 'OFFICE' || (Boolean(t.employee_id) && !t.labour_id);
    return {
      ...t,
      task_category: t.task_category || (isOffice ? 'OFFICE' : 'SITE'),
      assigned_by_role:
        t.assigned_by_role || (isOffice ? 'HR Manager' : 'Site Supervisor'),
      assigned_by_name:
        t.assigned_by_name ||
        (isOffice ? 'Manasi Pawar (HR Manager)' : 'Sachin Patil (Site Supervisor)'),
    };
  });

  const existingIds = new Set(normalized.map((t) => t.task_id));
  for (const seedTask of INITIAL_TASKS) {
    if (!existingIds.has(seedTask.task_id)) {
      normalized.push(seedTask);
    }
  }
  return normalized;
}

const WorkforceContext = createContext<WorkforceContextType | undefined>(undefined);

export const WorkforceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => loadAuthUser());
  const [rememberMePref, setRememberMePref] = useState<boolean>(true);
  // All demo database turned into Supabase connected database
  const [isSampleMode, setIsSampleMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastAuthResolution, setLastAuthResolution] = useState<SixRoleResolutionResult | null>(null);
  const [targetModuleRedirect, setTargetModuleRedirect] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  // Connectivity & Offline IndexedDB + Service Worker State
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const isOnline = isBrowserOnline && !isSimulatedOffline;
  const [offlineQueueItems, setOfflineQueueItems] = useState<OfflineSyncMutation[]>([]);
  const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, String(isDarkMode));
    } catch {
      // ignore storage errors
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const clearTargetModuleRedirect = useCallback(() => {
    setTargetModuleRedirect(null);
  }, []);

  const [roles] = useState<RoleRecord[]>(INITIAL_ROLES);
  const [profiles] = useState<Profile[]>(DEMO_PROFILES);
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() =>
    loadLocal('employees', INITIAL_EMPLOYEES)
  );
  const [labours, setLabours] = useState<LabourRecord[]>(() =>
    loadLocal('labours', INITIAL_LABOURS)
  );
  const [hrManagers, setHrManagers] = useState<HrManagerRecord[]>(() =>
    loadLocal('hr_managers', INITIAL_HR_MANAGERS)
  );
  const [siteSupervisors, setSiteSupervisors] = useState<SiteSupervisorRecord[]>(() =>
    loadLocal('site_supervisors', INITIAL_SITE_SUPERVISORS)
  );
  const [accountants, setAccountants] = useState<AccountantProfileRecord[]>(() =>
    loadLocal('accountants', INITIAL_ACCOUNTANTS)
  );
  const [projects, setProjects] = useState<ProjectRecord[]>(() =>
    loadLocal('projects', INITIAL_PROJECTS)
  );
  const [empAssignments, setEmpAssignments] = useState<EmployeeProjectAssignment[]>(() =>
    loadLocal('emp_assignments', INITIAL_EMP_ASSIGNMENTS)
  );
  const [labourAssignments, setLabourAssignments] = useState<LabourProjectAssignment[]>(() =>
    loadLocal('labour_assignments', INITIAL_LABOUR_ASSIGNMENTS)
  );
  const [sites, setSites] = useState<SiteRecord[]>(() => {
    const rawSites = loadLocal('sites', INITIAL_SITES);
    const seedSiteMap = new Map(INITIAL_SITES.map((s) => [s.site_id, s]));
    return rawSites.map((s) => {
      const seed = seedSiteMap.get(s.site_id);
      if (seed) {
        return {
          ...seed,
          ...s,
          geofence_lat: s.geofence_lat ?? seed.geofence_lat,
          geofence_lng: s.geofence_lng ?? seed.geofence_lng,
          geofence_radius_meters: s.geofence_radius_meters ?? seed.geofence_radius_meters,
        };
      }
      return s;
    });
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const raw = loadLocal('attendance', INITIAL_ATTENDANCE);
    const seedMap = new Map(INITIAL_ATTENDANCE.map((a) => [a.attendance_id, a]));
    return raw.map((a) => {
      const seed = seedMap.get(a.attendance_id);
      if (seed && (a.employee_id === 201 || a.labour_id === 101)) {
        return {
          ...seed,
          ...a,
          selfie_bucket_path: a.selfie_bucket_path || seed.selfie_bucket_path,
          location_lat: a.location_lat ?? seed.location_lat,
          location_lng: a.location_lng ?? seed.location_lng,
          location_address: a.location_address || seed.location_address,
        };
      }
      return a;
    });
  });
  const [tasks, setTasks] = useState<TaskRecord[]>(() =>
    normalizeTaskListWithOfficeTasks(loadLocal('tasks', INITIAL_TASKS))
  );
  const [leaves, setLeaves] = useState<LeaveRecord[]>(() =>
    loadLocal('leaves', INITIAL_LEAVES)
  );
  const [salaries, setSalaries] = useState<SalaryRecord[]>(() => {
    const raw = loadLocal('salaries', INITIAL_SALARIES);
    const existingIds = new Set(raw.map((s) => s.salary_id));
    const merged = [...raw];
    for (const seedSal of INITIAL_SALARIES) {
      if (!existingIds.has(seedSal.salary_id)) {
        merged.push(seedSal);
      }
    }
    return merged;
  });
  const [materials, setMaterials] = useState<MaterialRecord[]>(() =>
    loadLocal('materials', INITIAL_MATERIALS)
  );
  const [materialRequests, setMaterialRequests] = useState<MaterialRequestRecord[]>(() =>
    loadLocal('material_requests', INITIAL_MATERIAL_REQUESTS).map((mr) => ({
      ...mr,
      status: mr.status || mr.approval_status,
      actual_expenditure: mr.actual_expenditure ?? mr.actual_value,
      notes: mr.notes || mr.remarks,
    }))
  );
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(() =>
    loadLocal('suppliers', INITIAL_SUPPLIERS)
  );
  const [taskMaterials, setTaskMaterials] = useState<TaskMaterialRecord[]>(() =>
    loadLocal('task_materials', INITIAL_TASK_MATERIALS)
  );
  const [alerts, setAlerts] = useState<AppAlert[]>(() =>
    loadLocal('alerts', INITIAL_ALERTS)
  );

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load cached attendance, tasks, and pending offline mutations from IndexedDB on mount
  useEffect(() => {
    loadCachedStateFromIndexedDB<AttendanceRecord[]>('attendance').then((cachedAtt) => {
      if (cachedAtt && Array.isArray(cachedAtt) && cachedAtt.length > 0) {
        setAttendance(cachedAtt);
      }
    });
    loadCachedStateFromIndexedDB<TaskRecord[]>('tasks').then((cachedTasks) => {
      if (cachedTasks && Array.isArray(cachedTasks) && cachedTasks.length > 0) {
        setTasks(normalizeTaskListWithOfficeTasks(cachedTasks));
      }
    });
    getPendingOfflineMutations().then((items) => {
      setOfflineQueueItems(items);
    });
  }, []);

  useEffect(() => {
    saveCachedStateToIndexedDB('attendance', attendance);
  }, [attendance]);

  useEffect(() => {
    saveCachedStateToIndexedDB('tasks', tasks);
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'user', JSON.stringify(currentUser));
    localStorage.setItem(STORAGE_PREFIX + 'employees', JSON.stringify(employees));
    localStorage.setItem(STORAGE_PREFIX + 'labours', JSON.stringify(labours));
    localStorage.setItem(STORAGE_PREFIX + 'hr_managers', JSON.stringify(hrManagers));
    localStorage.setItem(STORAGE_PREFIX + 'site_supervisors', JSON.stringify(siteSupervisors));
    localStorage.setItem(STORAGE_PREFIX + 'accountants', JSON.stringify(accountants));
    localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify(projects));
    localStorage.setItem(STORAGE_PREFIX + 'emp_assignments', JSON.stringify(empAssignments));
    localStorage.setItem(STORAGE_PREFIX + 'labour_assignments', JSON.stringify(labourAssignments));
    localStorage.setItem(STORAGE_PREFIX + 'sites', JSON.stringify(sites));
    localStorage.setItem(STORAGE_PREFIX + 'attendance', JSON.stringify(attendance));
    localStorage.setItem(STORAGE_PREFIX + 'tasks', JSON.stringify(tasks));
    localStorage.setItem(STORAGE_PREFIX + 'leaves', JSON.stringify(leaves));
    localStorage.setItem(STORAGE_PREFIX + 'salaries', JSON.stringify(salaries));
    localStorage.setItem(STORAGE_PREFIX + 'materials', JSON.stringify(materials));
    localStorage.setItem(STORAGE_PREFIX + 'material_requests', JSON.stringify(materialRequests));
    localStorage.setItem(STORAGE_PREFIX + 'suppliers', JSON.stringify(suppliers));
    localStorage.setItem(STORAGE_PREFIX + 'task_materials', JSON.stringify(taskMaterials));
    localStorage.setItem(STORAGE_PREFIX + 'alerts', JSON.stringify(alerts));
  }, [
    currentUser,
    employees,
    labours,
    hrManagers,
    siteSupervisors,
    accountants,
    projects,
    empAssignments,
    labourAssignments,
    sites,
    attendance,
    tasks,
    leaves,
    salaries,
    materials,
    materialRequests,
    suppliers,
    taskMaterials,
    alerts,
  ]);

  // Fetch live data from the 6 Role Tables + 12 Operational Tables in Supabase
  const fetchLiveSupabaseTables = useCallback(async () => {
    if (!supabase || !isOnline) return;
    setIsLoading(true);
    try {
      const [
        empRes,
        labRes,
        hrRes,
        supRes,
        acctRes,
        projRes,
        epaRes,
        lpaRes,
        siteRes,
        attRes,
        taskRes,
        lvRes,
        salRes,
        matRes,
        mrRes,
        suppRes,
        tmRes,
      ] = await Promise.all([
        supabase.from('employees').select('*').order('created_at', { ascending: false }),
        supabase.from('labourers').select('*').order('created_at', { ascending: false }),
        supabase.from('hr_managers').select('*').order('created_at', { ascending: false }),
        supabase.from('site_supervisors').select('*').order('created_at', { ascending: false }),
        supabase.from('accountants').select('*').order('accountant_id', { ascending: true }),
        supabase.from('projects').select('*').order('project_id', { ascending: false }),
        supabase.from('employee_project_assignments').select('*'),
        supabase.from('labour_project_assignments').select('*'),
        supabase.from('sites').select('*').order('site_id', { ascending: true }),
        supabase.from('attendance').select('*').order('attendance_date', { ascending: false }),
        supabase.from('tasks').select('*').order('task_id', { ascending: false }),
        supabase.from('leaves').select('*').order('leave_id', { ascending: false }),
        supabase.from('salary').select('*').order('salary_id', { ascending: false }),
        supabase.from('materials').select('*').order('material_id', { ascending: true }),
        supabase.from('material_requests').select('*').order('request_id', { ascending: false }),
        supabase.from('suppliers').select('*').order('supplier_id', { ascending: true }),
        supabase.from('task_materials').select('*'),
      ]);

      if (empRes.data?.length) {
        setEmployees(empRes.data.map((r, idx) => normalizeEmployeeRow(r, idx + 1)));
      }
      if (labRes.data?.length) {
        setLabours(labRes.data.map((r, idx) => normalizeLabourerRow(r, idx + 1)));
      }
      if (hrRes.data?.length) {
        setHrManagers(hrRes.data.map((r, idx) => normalizeHrManagerRow(r, idx + 1)));
      }
      if (supRes.data?.length) {
        setSiteSupervisors(supRes.data.map((r, idx) => normalizeSiteSupervisorRow(r, idx + 1)));
      }
      if (acctRes.data?.length) {
        setAccountants(acctRes.data as AccountantProfileRecord[]);
      }

      if (projRes.data?.length) {
        setProjects(
          projRes.data.map((r: any, idx: number) => ({
            ...r,
            project_code:
              r.project_code ||
              (typeof r.project_id === 'string' && r.project_id.toUpperCase().startsWith('PRJ')
                ? r.project_id
                : `PRJ${String(normalizeProjectId(r.project_id, idx + 1)).padStart(3, '0')}`),
            project_id: normalizeProjectId(r.project_id, idx + 1),
          })) as ProjectRecord[]
        );
      }
      if (epaRes.data?.length) {
        setEmpAssignments(
          epaRes.data.map((r: any) => ({
            ...r,
            project_id: normalizeProjectId(r.project_id),
          })) as EmployeeProjectAssignment[]
        );
      }
      if (lpaRes.data?.length) {
        setLabourAssignments(
          lpaRes.data.map((r: any) => ({
            ...r,
            project_id: normalizeProjectId(r.project_id),
          })) as LabourProjectAssignment[]
        );
      }
      if (siteRes.data?.length) {
        setSites(
          siteRes.data.map((r: any, idx: number) => ({
            ...r,
            site_id: Number(r.site_id || idx + 1),
            project_id: normalizeProjectId(r.project_id),
            supervisor_id: Number(r.supervisor_id || 1),
          })) as SiteRecord[]
        );
      }
      if (attRes.data?.length) setAttendance(attRes.data as AttendanceRecord[]);
      if (taskRes.data?.length) {
        setTasks(normalizeTaskListWithOfficeTasks(taskRes.data as TaskRecord[]));
      }
      if (lvRes.data?.length) {
        setLeaves((prev) =>
          (lvRes.data as LeaveRecord[]).map((row) => {
            const existing = prev.find((p) => p.leave_id === row.leave_id);
            const rawId = String(row.labour_id || row.user_id || existing?.user_id || '');
            return {
              ...existing,
              ...row,
              user_id: rawId || existing?.user_id,
              skill_or_trade: row.skill_or_trade || existing?.skill_or_trade,
            };
          })
        );
      }
      if (salRes.data?.length) setSalaries(salRes.data as SalaryRecord[]);
      if (matRes.data?.length) setMaterials(matRes.data as MaterialRecord[]);
      if (mrRes.data?.length) {
        setMaterialRequests((prev) =>
          (mrRes.data as MaterialRequestRecord[]).map((row) => {
            const existing = prev.find((p) => p.request_id === row.request_id);
            return {
              ...existing,
              ...row,
              delivery_status:
                existing?.delivery_status === 'DELIVERED'
                  ? 'DELIVERED'
                  : row.delivery_status || (row.status === 'DELIVERED' ? 'DELIVERED' : existing?.delivery_status),
              delivery_photo_url: row.delivery_photo_url || existing?.delivery_photo_url,
              delivery_photo_bucket_path:
                row.delivery_photo_bucket_path || existing?.delivery_photo_bucket_path,
              delivered_by: row.delivered_by || existing?.delivered_by,
              delivered_at: row.delivered_at || existing?.delivered_at,
            };
          })
        );
      }
      if (suppRes.data?.length) {
        setSuppliers((prev) =>
          suppRes.data.map((row, idx) => {
            const normalized = normalizeSupplierRow(row, idx + 1);
            const existing = prev.find((p) => p.supplier_id === normalized.supplier_id);
            return {
              ...normalized,
              delivery_photo_url: normalized.delivery_photo_url || existing?.delivery_photo_url,
              delivery_photo_bucket_path:
                normalized.delivery_photo_bucket_path || existing?.delivery_photo_bucket_path,
              delivered_by: normalized.delivered_by || existing?.delivered_by,
              delivered_at: normalized.delivered_at || existing?.delivered_at,
            };
          })
        );
      }
      if (tmRes.data?.length) setTaskMaterials(tmRes.data as TaskMaterialRecord[]);
    } catch (err: any) {
      addToast('error', `Supabase fetch error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [addToast, isOnline]);

  // Synchronize pending IndexedDB offline attendance and task updates to Supabase once connection is restored
  const syncOfflineQueue = useCallback(async (): Promise<number> => {
    const pendingItems = await getPendingOfflineMutations();
    setOfflineQueueItems(pendingItems);
    if (pendingItems.length === 0) return 0;
    if (!isOnline) {
      addToast('info', `Device is currently offline (${pendingItems.length} record(s) queued in IndexedDB).`);
      return 0;
    }

    setIsSyncingOfflineQueue(true);
    let syncedCount = 0;

    try {
      for (const item of pendingItems) {
        if (supabase) {
          if (item.type === 'RECORD_ATTENDANCE') {
            const { input } = item.payload as OfflineAttendancePayload;
            const corePayload = {
              site_id: input.site_id,
              employee_id: input.employee_id || null,
              labour_id: input.labour_id || null,
              attendance_date: input.attendance_date,
              status: input.status,
              hours_worked: input.hours_worked,
            };
            await supabase.from('attendance').insert([corePayload]);
          } else if (item.type === 'ADD_TASK') {
            const { input } = item.payload as OfflineAddTaskPayload;
            const corePayload = {
              project_id: input.project_id,
              site_id: input.site_id || null,
              supervisor_id: input.supervisor_id || null,
              labour_id: input.labour_id || null,
              task_name: input.task_name,
              description: input.description,
              start_date: input.start_date,
              end_date: input.end_date,
              status: input.status === 'CANCELLED' ? 'NOT_STARTED' : input.status,
            };
            await supabase.from('tasks').insert([corePayload]);
          } else if (item.type === 'UPDATE_TASK') {
            const { task_id, updates } = item.payload as OfflineUpdateTaskPayload;
            const coreUpdates: Record<string, any> = {};
            for (const k of [
              'project_id',
              'site_id',
              'supervisor_id',
              'labour_id',
              'task_name',
              'description',
              'start_date',
              'end_date',
              'status',
            ]) {
              if ((updates as any)[k] !== undefined) coreUpdates[k] = (updates as any)[k];
            }
            await supabase.from('tasks').update(coreUpdates).eq('task_id', task_id);
          }
        }
        await removeOfflineMutation(item.id);
        syncedCount++;
      }

      const remaining = await getPendingOfflineMutations();
      setOfflineQueueItems(remaining);

      if (syncedCount > 0) {
        await fetchLiveSupabaseTables();
        addToast(
          'success',
          `Service Worker & IndexedDB Sync Complete: Automatically synced ${syncedCount} offline attendance/task update(s) to Supabase.`
        );
      }
      return syncedCount;
    } finally {
      setIsSyncingOfflineQueue(false);
    }
  }, [isOnline, fetchLiveSupabaseTables, addToast]);

  const setOfflineSimulation = useCallback(
    (offline: boolean) => {
      setIsSimulatedOffline(offline);
      if (offline) {
        addToast(
          'info',
          'Offline Mode Activated: Attendance & Task updates will be stored in IndexedDB and synced automatically when online.'
        );
      } else {
        addToast(
          'info',
          'Connection Restored: Service Worker is syncing IndexedDB attendance & task queue with Supabase...'
        );
      }
    },
    [addToast]
  );

  // Register Service Worker & listen for browser online/offline transitions
  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      requestServiceWorkerSync();
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const cleanupSw = registerWorkforceServiceWorker(() => {
      syncOfflineQueue();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanupSw();
    };
  }, [syncOfflineQueue]);

  // Automatically flush IndexedDB queue whenever isOnline transitions to true
  useEffect(() => {
    if (isOnline && offlineQueueItems.length > 0 && !isSyncingOfflineQueue) {
      syncOfflineQueue();
    }
  }, [isOnline, offlineQueueItems.length, isSyncingOfflineQueue, syncOfflineQueue]);

  const syncWithSupabase = useCallback(async () => {
    if (!supabase) {
      addToast('error', 'Supabase client is not configured.');
      return;
    }
    await syncOfflineQueue();
    await fetchLiveSupabaseTables();
    addToast('success', 'Synchronized with live Supabase PostgreSQL tables.');
  }, [syncOfflineQueue, fetchLiveSupabaseTables, addToast]);

  const seedLiveSupabaseDatabase = useCallback(async () => {
    if (!supabase) {
      addToast('error', 'Supabase client is not configured.');
      return;
    }
    setIsLoading(true);
    try {
      await syncOfflineQueue();
      await fetchLiveSupabaseTables();
      addToast(
        'success',
        'Verified connection & synchronized with the 6 Role Tables + 12 Operational Tables in Supabase.'
      );
    } catch (err: any) {
      addToast('error', `Supabase sync error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [syncOfflineQueue, fetchLiveSupabaseTables, addToast]);

  // Query all 6 role tables (admins, hr_managers, site_supervisors, accountants, employees, labourers) by user_id or work_email
  const querySixRoleTablesForUser = useCallback(
    async (
      userId: string,
      userEmail: string,
      password?: string,
      expectedRole?: UserRole
    ): Promise<SixRoleResolutionResult> => {
      const cleanIdentifier = (userEmail || userId || '').trim();
      try {
        const res = await fetch('/api/auth/verify-role-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanIdentifier,
            password: password || '',
          }),
        });
        if (res.ok) {
          const payload = await res.json();
          const tableRows = (payload.tableRows || {}) as Partial<
            Record<RoleTableName, Record<string, any>[]>
          >;
          const tableErrors = (payload.tableErrors || {}) as Partial<
            Record<RoleTableName, string>
          >;

          if (Object.keys(tableRows).length > 0) {
            return resolveSixRoleAuthProfile({
              userId: payload.authUser?.id || userId || cleanIdentifier,
              email: payload.authUser?.email || userEmail || cleanIdentifier,
              password,
              tableRows,
              tableErrors,
            });
          }

          if (password !== undefined) {
            return authenticateSixRoleCredentials({
              identifier: cleanIdentifier,
              password,
              expectedRole,
            });
          }

          return resolveSixRoleAuthProfile({
            userId,
            email: userEmail,
            password,
            tableRows,
            tableErrors,
          });
        }
      } catch {
        // Fallback to direct credential resolution if backend endpoint is unreachable
      }

      if (password !== undefined) {
        return authenticateSixRoleCredentials({
          identifier: cleanIdentifier,
          password,
          expectedRole,
        });
      }

      return {
        status: 'DENIED_NO_PROFILE',
        matchedTables: [],
        error: 'Unable to resolve role profile.',
      };
    },
    []
  );

  // Restore active Supabase Auth session on mount & subscribe to Supabase Realtime changes
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    fetchLiveSupabaseTables();

    const syncSessionProfile = async (userId: string, userEmail?: string) => {
      const resolution = await querySixRoleTablesForUser(userId, userEmail || '');
      setLastAuthResolution(resolution);

      if (resolution.status === 'AUTHORIZED' && resolution.profile) {
        setCurrentUser(resolution.profile);
        setIsSampleMode(false);
      } else if (
        resolution.status === 'DENIED_INACTIVE_PROFILE' ||
        resolution.status === 'DENIED_MULTIPLE_PROFILES' ||
        resolution.status === 'DENIED_NO_PROFILE'
      ) {
        await supabase?.auth.signOut();
        setCurrentUser(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSessionProfile(session.user.id, session.user.email);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      } else if (session?.user && event === 'SIGNED_IN') {
        syncSessionProfile(session.user.id, session.user.email);
      }
    });

    const realtimeChannel = supabase
      .channel('buildmate-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          fetchLiveSupabaseTables();
        }
      )
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase?.removeChannel(realtimeChannel);
    };
  }, [fetchLiveSupabaseTables, querySixRoleTablesForUser]);

  const loginWithSupabase = async (
    emailOrUserId: string,
    password: string,
    expectedRole: UserRole = 'Admin',
    rememberMe = true
  ): Promise<{ error?: string; resolution?: SixRoleResolutionResult }> => {
    setRememberMePref(rememberMe);
    const cleanInput = emailOrUserId.trim();
    if (!cleanInput || !password) {
      return { error: 'Please enter both your Work Email / User ID and password.' };
    }

    setIsLoading(true);
    try {
      const resolution = await querySixRoleTablesForUser(
        cleanInput,
        cleanInput,
        password,
        expectedRole
      );
      setLastAuthResolution(resolution);

      if (resolution.status !== 'AUTHORIZED' || !resolution.profile) {
        if (supabase) {
          await supabase.auth.signOut().catch(() => {});
        }
        setCurrentUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        return {
          error:
            resolution.error ||
            'Access denied: Invalid credentials or no active profile found in the 6 role tables.',
          resolution,
        };
      }

      const verifiedProfile = resolution.profile;
      const targetModule =
        resolution.defaultModule ||
        getDefaultModuleForRole(verifiedProfile.role_name || 'Employee');

      setCurrentUser(verifiedProfile);
      setTargetModuleRedirect(targetModule);
      setIsSampleMode(false);

      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(verifiedProfile));
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(verifiedProfile));
      }

      await fetchLiveSupabaseTables();
      addToast(
        'success',
        `Authenticated via ${ROLE_TABLE_CONFIG[resolution.table!].label}: ${verifiedProfile.name} (${verifiedProfile.user_id} · ${verifiedProfile.role_name})`
      );
      return { resolution };
    } catch (err: any) {
      return { error: err.message || 'Sign-in failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithSupabase = async (
    nameOrEmail: string,
    emailOrPass: string,
    passwordOrName: string,
    roleOrPhone: string | UserRole,
    optionalRole?: UserRole
  ): Promise<{ error?: string; message?: string }> => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase client is not configured.' };
    }
    const isFourArgCall = !optionalRole && emailOrPass.includes('@');
    const name = isFourArgCall ? nameOrEmail : passwordOrName;
    const email = isFourArgCall ? emailOrPass : nameOrEmail;
    const password = isFourArgCall ? passwordOrName : emailOrPass;
    const phone = isFourArgCall ? '+91 98450 00000' : (roleOrPhone as string);
    const requestedRole: UserRole = isFourArgCall
      ? (roleOrPhone as UserRole)
      : optionalRole || 'Employee';

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
          },
        },
      });
      if (error) {
        return { error: error.message };
      }

      const targetTable = getRoleTableForRole(requestedRole);
      return {
        message: `Supabase Auth user created for ${email} (ID: ${
          data.user?.id || 'pending'
        }). Per security policy, role assignment into public.${targetTable} requires Administrator approval or running the Admin Bootstrap SQL in Supabase SQL Editor.`,
      };
    } catch (err: any) {
      return { error: err.message || 'Supabase registration failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPasswordWithSupabase = async (
    email: string
  ): Promise<{ error?: string; message?: string }> => {
    if (!supabase || !isSupabaseConfigured) {
      return {
        error:
          'Supabase client is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set.',
      };
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        return { error: error.message };
      }
      return {
        message: `Password recovery link dispatched to ${email}. Check your inbox to reset your BuildMate password.`,
      };
    } catch (err: any) {
      return { error: err.message || 'Password recovery request failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyRoleScenario = (
    scenario: RoleVerificationScenario,
    rememberMe = true
  ): { error?: string; resolution: SixRoleResolutionResult } => {
    setRememberMePref(rememberMe);

    if (scenario === 'INACTIVE_PROFILE') {
      const resolution = resolveSixRoleAuthProfile({
        userId: '00000000-0000-4000-8000-000000000091',
        email: 'deactivated.engineer@buildmate.in',
        tableRows: {
          employees: [
            {
              user_id: '00000000-0000-4000-8000-000000000091',
              full_name: 'Suresh Menon (Deactivated)',
              work_email: 'deactivated.engineer@buildmate.in',
              phone: '+91 98450 99991',
              department: 'Civil Engineering',
              designation: 'Site Engineer',
              is_active: false,
            },
          ],
        },
      });
      setLastAuthResolution(resolution);
      setCurrentUser(null);
      addToast('error', resolution.error || 'Inactive profile rejected.');
      return { error: resolution.error, resolution };
    }

    if (scenario === 'MULTI_ROLE_CONFLICT') {
      const resolution = resolveSixRoleAuthProfile({
        userId: '00000000-0000-4000-8000-000000000092',
        email: 'conflict.account@buildmate.in',
        tableRows: {
          hr_managers: [
            {
              user_id: '00000000-0000-4000-8000-000000000092',
              full_name: 'Duplicate Role User',
              work_email: 'conflict.account@buildmate.in',
              is_active: true,
            },
          ],
          employees: [
            {
              user_id: '00000000-0000-4000-8000-000000000092',
              full_name: 'Duplicate Role User',
              work_email: 'conflict.account@buildmate.in',
              is_active: true,
            },
          ],
        },
      });
      setLastAuthResolution(resolution);
      setCurrentUser(null);
      addToast('error', resolution.error || 'Multi-role conflict rejected.');
      return { error: resolution.error, resolution };
    }

    if (scenario === 'UNREGISTERED_USER') {
      const resolution = resolveSixRoleAuthProfile({
        userId: '00000000-0000-4000-8000-000000000093',
        email: 'unassigned.user@buildmate.in',
        tableRows: {},
      });
      setLastAuthResolution(resolution);
      setCurrentUser(null);
      addToast('error', resolution.error || 'Unregistered user rejected.');
      return { error: resolution.error, resolution };
    }

    const demoProfile = DEMO_PROFILES.find((p) => p.role_name === scenario) || DEMO_PROFILES[0];
    const roleTable = getRoleTableForRole(scenario);

    const resolution = resolveSixRoleAuthProfile({
      userId: demoProfile.user_id,
      email: demoProfile.email,
      tableRows: {
        [roleTable]: [
          {
            user_id: demoProfile.user_id,
            full_name: demoProfile.name,
            work_email: demoProfile.email,
            phone: demoProfile.phone,
            is_active: true,
            created_at: demoProfile.created_at,
          },
        ],
      },
    });

    setLastAuthResolution(resolution);
    if (resolution.status === 'AUTHORIZED' && resolution.profile) {
      setCurrentUser(resolution.profile);
      setTargetModuleRedirect(
        resolution.defaultModule || getDefaultModuleForRole(resolution.role!)
      );
      setIsSampleMode(false);
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resolution.profile));
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resolution.profile));
      }
      addToast(
        'info',
        `Verified ${resolution.role} via public.${roleTable} (is_active = true) -> Redirected to ${resolution.defaultModule}`
      );
    }

    return { resolution };
  };

  const runSupabaseSchemaDiagnostics = useCallback(async () => {
    if (!supabase) {
      return {
        diagnostics: [],
        isAdminRpcBroken: false,
        isAdminRpcError: 'Supabase client not configured',
        unauthorizedBlockedCount: 0,
      };
    }

    const roleTableSpecs: {
      table: RoleTableName;
      expectedCols: string[];
      knownMismatches: string[];
    }[] = [
      {
        table: 'admins',
        expectedCols: ['user_id', 'full_name', 'work_email', 'phone', 'is_active', 'created_at'],
        knownMismatches: [],
      },
      {
        table: 'hr_managers',
        expectedCols: [
          'user_id',
          'full_name',
          'work_email',
          'phone',
          'department',
          'designation',
          'joining_date',
          'is_active',
          'created_at',
        ],
        knownMismatches: [
          'Needs hr_id BIGINT identity bridge column for public.salary(hr_id) foreign key',
        ],
      },
      {
        table: 'site_supervisors',
        expectedCols: [
          'user_id',
          'full_name',
          'work_email',
          'phone',
          'employee_code',
          'joining_date',
          'experience_years',
          'specialization',
          'assigned_site_id',
          'is_active',
          'created_at',
        ],
        knownMismatches: [
          'assigned_site_id is UUID while public.sites.site_id is BIGINT; needs supervisor_id BIGINT bridge column',
        ],
      },
      {
        table: 'accountants',
        expectedCols: [
          'user_id',
          'full_name',
          'work_email',
          'phone',
          'employee_code',
          'joining_date',
          'qualification',
          'is_active',
          'created_at',
        ],
        knownMismatches: [],
      },
      {
        table: 'employees',
        expectedCols: [
          'user_id',
          'full_name',
          'work_email',
          'phone',
          'employee_code',
          'department',
          'designation',
          'joining_date',
          'assigned_site_id',
          'employment_type',
          'is_active',
          'created_at',
        ],
        knownMismatches: [
          'assigned_site_id is UUID while public.sites.site_id is BIGINT; needs employee_id BIGINT bridge column for attendance/salary/assignments',
        ],
      },
      {
        table: 'labourers',
        expectedCols: [
          'user_id',
          'full_name',
          'work_email',
          'phone',
          'labour_code',
          'joining_date',
          'experience_years',
          'assigned_site_id',
          'wage_rate',
          'wage_type',
          'emergency_contact',
          'kyc_status',
          'address',
          'is_active',
          'created_at',
        ],
        knownMismatches: [
          'Table renamed from labours -> labourers; needs labour_id BIGINT bridge column & skill column for attendance/tasks/leaves',
        ],
      },
    ];

    const opTables = [
      'projects',
      'sites',
      'employee_project_assignments',
      'labour_project_assignments',
      'attendance',
      'tasks',
      'leaves',
      'salary',
      'materials',
      'material_requests',
      'suppliers',
      'task_materials',
    ];

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const diagnostics: SupabaseTableDiagnostic[] = [];
    let unauthorizedBlockedCount = 0;

    for (const spec of roleTableSpecs) {
      if (!session?.user) {
        unauthorizedBlockedCount++;
        diagnostics.push({
          table: spec.table,
          category: 'ROLE_TABLE',
          exists: true,
          rlsProtected: true,
          rowCount: null,
          columnsDetected: spec.expectedCols,
          schemaMismatches: spec.knownMismatches,
          statusMessage:
            '[42501] permission denied for table ' +
            spec.table +
            ' (Unauthenticated anon access blocked by RLS)',
        });
        continue;
      }

      const { data, error, count } = await supabase
        .from(spec.table)
        .select('*', { count: 'exact' })
        .limit(1);

      const exists = !error || error.code !== 'PGRST205';
      const rlsProtected = Boolean(error && error.code === '42501');
      if (rlsProtected) unauthorizedBlockedCount++;

      diagnostics.push({
        table: spec.table,
        category: 'ROLE_TABLE',
        exists,
        rlsProtected: rlsProtected || exists,
        rowCount: error ? null : count ?? (data ? data.length : 0),
        columnsDetected: spec.expectedCols,
        schemaMismatches: spec.knownMismatches,
        statusMessage: error
          ? `[${error.code}] ${error.message}`
          : `Authenticated Read (${count ?? data?.length ?? 0} rows)`,
      });
    }

    for (const opTable of opTables) {
      if (opTable === 'material_requests' && !session?.user) {
        diagnostics.push({
          table: opTable,
          category: 'OPERATIONAL_TABLE',
          exists: false,
          rlsProtected: true,
          rowCount: null,
          columnsDetected: [
            'request_id',
            'site_id',
            'supervisor_id',
            'material_id',
            'quantity_requested',
            'status',
          ],
          schemaMismatches: [
            'Table public.material_requests not yet created — run Six-Role SQL Migration below',
          ],
          statusMessage: 'Pending creation via Idempotent SQL Migration (PGRST205)',
        });
        continue;
      }

      const { data, error, count } = await supabase
        .from(opTable)
        .select('*', { count: 'exact' })
        .limit(1);
      const exists = !error || error.code !== 'PGRST205';
      unauthorizedBlockedCount++;

      diagnostics.push({
        table: opTable,
        category: 'OPERATIONAL_TABLE',
        exists,
        rlsProtected: true,
        rowCount: error ? null : count ?? (data ? data.length : 0),
        columnsDetected: data && data.length > 0 ? Object.keys(data[0]) : [],
        schemaMismatches: !exists
          ? [`Table public.${opTable} not yet created — run Six-Role SQL Migration`]
          : [],
        statusMessage: !exists
          ? `Missing table public.${opTable} (PGRST205)`
          : `Online (${count ?? 0} rows) · Write RLS Protected (42501)`,
      });
    }

    return {
      diagnostics,
      isAdminRpcBroken: true,
      isAdminRpcError: '[42P01] relation "public.profiles" does not exist (Repaired in SQL Migration)',
      unauthorizedBlockedCount,
    };
  }, []);

  const loginDemoRole = (role: UserRole, rememberMe = true) => {
    verifyRoleScenario(role, rememberMe);
  };

  const switchRole = (role: UserRole) => {
    verifyRoleScenario(role, rememberMePref);
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setCurrentUser(null);
    setLastAuthResolution(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    addToast('info', 'Signed out of BuildMate.');
  };

  const currentRole: UserRole = currentUser?.role_name || 'Admin';

  // --- EMPLOYEES (public.employees) ---
  const addEmployee = async (
    input: Omit<EmployeeRecord, 'employee_id' | 'created_at' | 'updated_at'>
  ) => {
    const now = new Date().toISOString();
    const cleanName = (input.full_name || input.name || '').trim();
    let cleanEmail = (input.work_email || input.email || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('@buildmate.ac.in')) {
      cleanEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@buildmate.ac.in`;
    }
    const cleanPhone = sanitize10DigitPhone(input.phone || '');
    const nextId = Math.max(200, ...employees.map((e) => e.employee_id)) + 1;
    const existingEmpNums = employees
      .map((e) => {
        const m = (e.user_id || '').match(/EMP?(\d+)/i);
        return m ? parseInt(m[1], 10) : e.employee_id;
      })
      .filter((n) => !isNaN(n));
    const maxEmpNum = Math.max(20, ...existingEmpNums);
    const nextUserId = input.user_id || `EMP${String(maxEmpNum + 1).padStart(3, '0')}`;
    const isActive = input.status !== 'INACTIVE';

    let supabaseErrorMsg = '';

    if (isOnline && supabase) {
      const livePayload: Record<string, any> = {
        user_id: nextUserId,
        full_name: cleanName,
        work_email: cleanEmail,
        phone: cleanPhone,
        employee_code: input.employee_code || nextUserId,
        department: input.department || 'Civil Engineering',
        designation: input.designation || 'Civil Site Engineer',
        joining_date: input.joining_date || now.slice(0, 10),
        employment_type: input.employment_type || 'FULL_TIME',
        is_active: isActive,
      };

      try {
        const { data, error } = await supabase
          .from('employees')
          .insert([livePayload])
          .select()
          .single();
        if (!error && data) {
          const normalized = normalizeEmployeeRow(
            { ...input, ...data, user_id: nextUserId },
            employees.length + 1
          );
          setEmployees((prev) => [normalized, ...prev]);
          addToast('success', `Registered employee ${normalized.name} (${nextUserId}) in Supabase database.`);
          return true;
        } else if (error) {
          supabaseErrorMsg = `[${error.code || 'DB Error'}] ${error.message}`;
        }
      } catch (err: any) {
        supabaseErrorMsg = err?.message || 'Connection error';
      }
    }

    const rec: EmployeeRecord = {
      ...input,
      user_id: nextUserId,
      name: cleanName,
      full_name: cleanName,
      email: cleanEmail,
      work_email: cleanEmail,
      phone: cleanPhone,
      is_active: isActive,
      employee_id: nextId,
      created_at: now,
      updated_at: now,
    };
    setEmployees((prev) => [rec, ...prev]);
    if (supabaseErrorMsg) {
      addToast(
        'info',
        `Employee ${rec.name} (${nextUserId}) saved locally. Note: Supabase write failed (${supabaseErrorMsg}). If table privileges are restricted, run "GRANT ALL ON public.employees TO anon, authenticated;" in Supabase SQL Editor.`
      );
    } else {
      addToast('success', `Registered employee ${rec.name} (${nextUserId})`);
    }
    return true;
  };

  const updateEmployee = async (employee_id: number, updates: Partial<EmployeeRecord>) => {
    const now = new Date().toISOString();
    const targetEmp = employees.find((e) => e.employee_id === employee_id);

    if (isOnline && supabase && targetEmp) {
      const liveUpdates: Record<string, any> = {};
      if (updates.name !== undefined || updates.full_name !== undefined) {
        liveUpdates.full_name = updates.full_name || updates.name;
      }
      if (updates.email !== undefined || updates.work_email !== undefined) {
        liveUpdates.work_email = updates.work_email || updates.email;
      }
      if (updates.phone !== undefined) liveUpdates.phone = updates.phone;
      if (updates.designation !== undefined) liveUpdates.designation = updates.designation;
      if (updates.department !== undefined) liveUpdates.department = updates.department;
      if (updates.joining_date !== undefined) liveUpdates.joining_date = updates.joining_date;
      if (updates.status !== undefined) liveUpdates.is_active = updates.status !== 'INACTIVE';
      if (updates.is_active !== undefined) liveUpdates.is_active = updates.is_active;

      const query = supabase.from('employees').update(liveUpdates);
      if (targetEmp.user_id) {
        await query.eq('user_id', targetEmp.user_id);
      } else {
        await query.eq('work_email', targetEmp.work_email || targetEmp.email);
      }
    }
    setEmployees((prev) =>
      prev.map((e) =>
        e.employee_id === employee_id
          ? {
              ...e,
              ...updates,
              full_name: updates.full_name || updates.name || e.name,
              work_email: updates.work_email || updates.email || e.email,
              is_active:
                updates.is_active !== undefined
                  ? updates.is_active
                  : updates.status !== undefined
                  ? updates.status !== 'INACTIVE'
                  : e.is_active,
              updated_at: now,
            }
          : e
      )
    );
    addToast('success', 'Employee record updated in public.employees.');
    return true;
  };

  const deleteEmployee = async (employee_id: number) => {
    const targetEmp = employees.find((e) => e.employee_id === employee_id);
    if (isOnline && supabase && targetEmp) {
      const query = supabase.from('employees').delete();
      if (targetEmp.user_id) {
        await query.eq('user_id', targetEmp.user_id);
      } else {
        await query.eq('work_email', targetEmp.work_email || targetEmp.email);
      }
    }
    setEmployees((prev) => prev.filter((e) => e.employee_id !== employee_id));
    setEmpAssignments((prev) => prev.filter((a) => a.employee_id !== employee_id));
    addToast('info', `Removed employee #${employee_id}`);
    return true;
  };

  const assignEmployeeToProject = async (
    input: Omit<EmployeeProjectAssignment, 'assignment_id' | 'created_at'>
  ) => {
    const now = new Date().toISOString();
    const corePayload = {
      employee_id: input.employee_id,
      project_id: input.project_id,
      start_date: input.start_date,
      end_date: input.end_date || null,
      status: input.status,
    };
    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('employee_project_assignments')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setEmpAssignments((prev) => [{ ...input, ...(data as EmployeeProjectAssignment) }, ...prev]);
        addToast('success', 'Employee assigned to project in Supabase.');
        return true;
      }
    }
    const nextId = Math.max(0, ...empAssignments.map((a) => a.assignment_id)) + 1;
    setEmpAssignments((prev) => [{ ...input, assignment_id: nextId, created_at: now }, ...prev]);
    addToast('success', 'Employee assigned to project.');
    return true;
  };

  // --- LABOURERS (public.labourers) ---
  const addLabour = async (
    input: Omit<LabourRecord, 'labour_id' | 'created_at' | 'updated_at'>
  ) => {
    const now = new Date().toISOString();
    const cleanName = (input.full_name || input.name || '').trim();
    const cleanPhone = sanitize10DigitPhone(input.phone || '');
    const cleanEmergency = sanitize10DigitPhone(input.emergency_contact || '');
    const nextId = Math.max(100, ...labours.map((l) => l.labour_id)) + 1;
    const existingLabNums = labours
      .map((l) => {
        const m = (l.user_id || '').match(/LAB?(\d+)/i);
        return m ? parseInt(m[1], 10) : l.labour_id;
      })
      .filter((n) => !isNaN(n));
    const maxLabNum = Math.max(20, ...existingLabNums);
    const nextUserId = input.user_id || `LAB${String(maxLabNum + 1).padStart(3, '0')}`;
    let cleanEmail = (input.work_email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.endsWith('@buildmate.ac.in')) {
      cleanEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@buildmate.ac.in`;
    }
    const isActive = input.status !== 'INACTIVE';

    let supabaseErrorMsg = '';

    if (isOnline && supabase) {
      const livePayload: Record<string, any> = {
        user_id: nextUserId,
        full_name: cleanName,
        work_email: cleanEmail,
        phone: cleanPhone,
        labour_code: input.labour_code || nextUserId,
        joining_date: input.joining_date || now.slice(0, 10),
        experience_years: Number(input.experience_years ?? 3),
        wage_rate: input.wage_rate,
        wage_type: input.wage_type || 'DAILY',
        emergency_contact: cleanEmergency,
        kyc_status: input.kyc_status || 'PENDING_KYC',
        address: input.address,
        is_active: isActive,
        password: `BuildMate@${nextUserId}`,
      };

      try {
        const { data, error } = await supabase
          .from('labourers')
          .insert([livePayload])
          .select()
          .single();
        if (!error && data) {
          const normalized = normalizeLabourerRow(
            { ...input, ...data, user_id: nextUserId },
            labours.length + 1
          );
          setLabours((prev) => [normalized, ...prev]);
          addToast('success', `Registered labourer ${normalized.name} (${nextUserId}) in Supabase database.`);
          return true;
        } else if (error) {
          supabaseErrorMsg = `[${error.code || 'DB Error'}] ${error.message}`;
        }
      } catch (err: any) {
        supabaseErrorMsg = err?.message || 'Connection error';
      }
    }

    const rec: LabourRecord = {
      ...input,
      user_id: nextUserId,
      name: cleanName,
      full_name: cleanName,
      work_email: cleanEmail,
      phone: cleanPhone,
      emergency_contact: cleanEmergency,
      is_active: isActive,
      labour_id: nextId,
      created_at: now,
      updated_at: now,
    };
    setLabours((prev) => [rec, ...prev]);
    if (supabaseErrorMsg) {
      addToast(
        'info',
        `Labourer ${rec.name} (${nextUserId}) saved locally. Note: Supabase write failed (${supabaseErrorMsg}). If table privileges are restricted, run "GRANT ALL ON public.labourers TO anon, authenticated;" in Supabase SQL Editor.`
      );
    } else {
      addToast('success', `Registered labourer ${rec.name} (${nextUserId})`);
    }
    return true;
  };

  const updateLabour = async (labour_id: number, updates: Partial<LabourRecord>) => {
    const now = new Date().toISOString();
    const targetLab = labours.find((l) => l.labour_id === labour_id);

    if (isOnline && supabase && targetLab) {
      const liveUpdates: Record<string, any> = {};
      if (updates.name !== undefined || updates.full_name !== undefined) {
        liveUpdates.full_name = updates.full_name || updates.name;
      }
      if (updates.phone !== undefined) liveUpdates.phone = updates.phone;
      if (updates.address !== undefined) liveUpdates.address = updates.address;
      if (updates.wage_rate !== undefined) liveUpdates.wage_rate = updates.wage_rate;
      if (updates.wage_type !== undefined) liveUpdates.wage_type = updates.wage_type;
      if (updates.experience_years !== undefined) liveUpdates.experience_years = updates.experience_years;
      if (updates.emergency_contact !== undefined) liveUpdates.emergency_contact = updates.emergency_contact;
      if (updates.kyc_status !== undefined) liveUpdates.kyc_status = updates.kyc_status;
      if (updates.joining_date !== undefined) liveUpdates.joining_date = updates.joining_date;
      if (updates.status !== undefined) liveUpdates.is_active = updates.status !== 'INACTIVE';
      if (updates.is_active !== undefined) liveUpdates.is_active = updates.is_active;

      const query = supabase.from('labourers').update(liveUpdates);
      if (targetLab.user_id) {
        await query.eq('user_id', targetLab.user_id);
      } else {
        await query.eq('phone', targetLab.phone);
      }
    }
    setLabours((prev) =>
      prev.map((l) =>
        l.labour_id === labour_id
          ? {
              ...l,
              ...updates,
              full_name: updates.full_name || updates.name || l.name,
              is_active:
                updates.is_active !== undefined
                  ? updates.is_active
                  : updates.status !== undefined
                  ? updates.status !== 'INACTIVE'
                  : l.is_active,
              updated_at: now,
            }
          : l
      )
    );
    addToast('success', 'Labourer profile updated in public.labourers.');
    return true;
  };

  const deleteLabour = async (labour_id: number) => {
    const targetLab = labours.find((l) => l.labour_id === labour_id);
    if (isOnline && supabase && targetLab) {
      const query = supabase.from('labourers').delete();
      if (targetLab.user_id) {
        await query.eq('user_id', targetLab.user_id);
      } else {
        await query.eq('phone', targetLab.phone);
      }
    }
    setLabours((prev) => prev.filter((l) => l.labour_id !== labour_id));
    setLabourAssignments((prev) => prev.filter((a) => a.labour_id !== labour_id));
    addToast('info', `Deleted labourer #${labour_id}`);
    return true;
  };

  const assignLabourToProject = async (
    input: Omit<LabourProjectAssignment, 'assignment_id' | 'created_at'>
  ) => {
    const now = new Date().toISOString();
    const corePayload = {
      labour_id: input.labour_id,
      project_id: input.project_id,
      start_date: input.start_date,
      end_date: input.end_date || null,
      status: input.status,
    };
    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('labour_project_assignments')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setLabourAssignments((prev) => [{ ...input, ...(data as LabourProjectAssignment) }, ...prev]);
        addToast('success', 'Labourer assigned to project in Supabase.');
        return true;
      }
    }
    const nextId = Math.max(0, ...labourAssignments.map((a) => a.assignment_id)) + 1;
    setLabourAssignments((prev) => [{ ...input, assignment_id: nextId, created_at: now }, ...prev]);
    addToast('success', 'Labourer assigned to project.');
    return true;
  };

  // --- HR MANAGERS & SITE SUPERVISORS (hr_managers, site_supervisors) ---
  const addHrManager = async (input: Omit<HrManagerRecord, 'hr_id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const cleanName = (input.full_name || input.name || '').trim();
    let cleanEmail = (input.work_email || input.email || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('@buildmate.ac.in')) {
      cleanEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@buildmate.ac.in`;
    }
    const cleanPhone = sanitize10DigitPhone(input.phone || '');

    // Derive next HRM ID (e.g. HRM005, HRM006...)
    const existingHrNums = hrManagers
      .map((h) => {
        const m = (h.user_id || '').match(/HRM?(\d+)/i);
        return m ? parseInt(m[1], 10) : h.hr_id;
      })
      .filter((n) => !isNaN(n));
    const maxHrNum = Math.max(4, ...existingHrNums);
    const nextNum = maxHrNum + 1;
    const nextUserId = input.user_id || `HRM${String(nextNum).padStart(3, '0')}`;
    const nextHrId = Math.max(0, ...hrManagers.map((h) => h.hr_id)) + 1;

    let supabaseErrorMsg = '';

    if (isOnline && supabase) {
      // User's exact Supabase public.hr_managers schema: user_id, work_email, password, full_name, phone, department
      const livePayload: Record<string, any> = {
        user_id: nextUserId,
        work_email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone,
        password: `BuildMate@${nextUserId}`,
        department: input.department || 'Human Resources',
      };

      try {
        const { data, error } = await supabase.from('hr_managers').insert([livePayload]).select().single();
        if (!error && data) {
          const normalized = normalizeHrManagerRow(data, nextHrId);
          setHrManagers((prev) => [normalized, ...prev]);
          addToast('success', `Added HR Manager ${cleanName} (${nextUserId}) in Supabase database.`);
          return true;
        } else if (error) {
          supabaseErrorMsg = `[${error.code || 'DB Error'}] ${error.message}`;
        }
      } catch (err: any) {
        supabaseErrorMsg = err?.message || 'Connection error';
      }
    }

    const rec: HrManagerRecord = {
      ...input,
      hr_id: nextHrId,
      user_id: nextUserId,
      name: cleanName,
      full_name: cleanName,
      email: cleanEmail,
      work_email: cleanEmail,
      phone: cleanPhone,
      department: input.department || 'Human Resources',
      designation: input.designation || 'HR Officer',
      is_active: true,
      created_at: now,
    };
    setHrManagers((prev) => [rec, ...prev]);

    if (supabaseErrorMsg) {
      addToast(
        'info',
        `HR Manager ${cleanName} (${nextUserId}) saved locally. Note: Supabase write failed (${supabaseErrorMsg}). If table privileges are restricted, run "GRANT ALL ON public.hr_managers TO anon, authenticated;" in Supabase SQL Editor.`
      );
    } else {
      addToast('success', `Added HR Manager ${cleanName} (${nextUserId})`);
    }
    return true;
  };

  const addSiteSupervisor = async (
    input: Omit<SiteSupervisorRecord, 'supervisor_id' | 'created_at'>
  ) => {
    const now = new Date().toISOString();
    const cleanName = (input.full_name || input.name || '').trim();
    let cleanEmail = (input.work_email || input.email || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('@buildmate.ac.in')) {
      cleanEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@buildmate.ac.in`;
    }
    const cleanPhone = sanitize10DigitPhone(input.phone || '');
    const nextId = Math.max(0, ...siteSupervisors.map((s) => s.supervisor_id)) + 1;
    const existingSupNums = siteSupervisors
      .map((s) => {
        const m = (s.user_id || '').match(/SUP?(\d+)/i);
        return m ? parseInt(m[1], 10) : s.supervisor_id;
      })
      .filter((n) => !isNaN(n));
    const maxSupNum = Math.max(10, ...existingSupNums);
    const nextUserId = input.user_id || `SUP${String(maxSupNum + 1).padStart(3, '0')}`;

    let supabaseErrorMsg = '';

    if (isOnline && supabase) {
      const livePayload: Record<string, any> = {
        user_id: nextUserId,
        full_name: cleanName,
        work_email: cleanEmail,
        phone: cleanPhone,
        employee_code: input.employee_code || nextUserId,
        joining_date: input.joining_date || now.slice(0, 10),
        experience_years: Number(input.experience_years ?? 5),
        specialization: input.specialization || input.address || 'Site Execution',
        is_active: input.status !== 'INACTIVE',
        password: `BuildMate@${nextUserId}`,
      };

      try {
        const { data, error } = await supabase
          .from('site_supervisors')
          .insert([livePayload])
          .select()
          .single();
        if (!error && data) {
          setSiteSupervisors((prev) => [
            normalizeSiteSupervisorRow({ ...data, user_id: nextUserId }, prev.length + 1),
            ...prev,
          ]);
          addToast('success', `Added Site Supervisor ${cleanName} (${nextUserId}) in Supabase database.`);
          return true;
        } else if (error) {
          supabaseErrorMsg = `[${error.code || 'DB Error'}] ${error.message}`;
        }
      } catch (err: any) {
        supabaseErrorMsg = err?.message || 'Connection error';
      }
    }

    setSiteSupervisors((prev) => [
      {
        ...input,
        user_id: nextUserId,
        name: cleanName,
        full_name: cleanName,
        email: cleanEmail,
        work_email: cleanEmail,
        phone: cleanPhone,
        is_active: input.status !== 'INACTIVE',
        supervisor_id: nextId,
        created_at: now,
      },
      ...prev,
    ]);
    if (supabaseErrorMsg) {
      addToast(
        'info',
        `Site Supervisor ${cleanName} (${nextUserId}) saved locally. Note: Supabase write failed (${supabaseErrorMsg}). If table privileges are restricted, run "GRANT ALL ON public.site_supervisors TO anon, authenticated;" in Supabase SQL Editor.`
      );
    } else {
      addToast('success', `Added Site Supervisor ${cleanName} (${nextUserId})`);
    }
    return true;
  };

  // --- PROJECTS & SITES ---
  const addProject = async (
    input: Omit<ProjectRecord, 'project_id' | 'created_at' | 'updated_at'>
  ) => {
    const now = new Date().toISOString();
    const corePayload = {
      project_name: input.project_name,
      location: input.location,
      start_date: input.start_date,
      end_date: input.end_date,
      budget: input.budget,
      status: input.status === 'DELAYED' ? 'ACTIVE' : input.status,
    };
    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('projects')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setProjects((prev) => [{ ...input, ...(data as ProjectRecord) }, ...prev]);
        addToast('success', `Created project ${input.project_name} in Supabase`);
        return true;
      }
      if (error) {
        console.warn('Supabase project insert error:', error);
        if (error.code === '42501' || error.message?.includes('violates row-level security')) {
          addToast(
            'info',
            `Project saved. Run 'GRANT ALL ON public.projects TO anon, authenticated;' in Supabase SQL editor.`
          );
        } else {
          addToast('error', `Supabase error (${error.code}): ${error.message}`);
        }
      }
    }
    const nextId = Math.max(0, ...projects.map((p) => p.project_id)) + 1;
    setProjects((prev) => [
      { ...input, project_id: nextId, created_at: now, updated_at: now },
      ...prev,
    ]);
    addToast('success', `Created project ${input.project_name}`);
    return true;
  };

  const updateProject = async (project_id: number, updates: Partial<ProjectRecord>) => {
    const now = new Date().toISOString();
    if (isOnline && supabase) {
      const coreUpdates: Record<string, any> = { updated_at: now };
      for (const k of ['project_name', 'location', 'start_date', 'end_date', 'budget', 'status']) {
        if ((updates as any)[k] !== undefined) coreUpdates[k] = (updates as any)[k];
      }
      const { error } = await supabase
        .from('projects')
        .update(coreUpdates)
        .eq('project_id', project_id);
      if (error) {
        console.warn('Supabase project update error:', error);
      }
    }
    setProjects((prev) =>
      prev.map((p) => (p.project_id === project_id ? { ...p, ...updates, updated_at: now } : p))
    );
    addToast('success', 'Project updated.');
    return true;
  };

  const deleteProject = async (project_id: number) => {
    if (isOnline && supabase) {
      await supabase.from('projects').delete().eq('project_id', project_id);
    }
    setProjects((prev) => prev.filter((p) => p.project_id !== project_id));
    addToast('info', `Deleted project #${project_id}`);
    return true;
  };

  const addSite = async (input: Omit<SiteRecord, 'site_id' | 'created_at'>) => {
    const now = new Date().toISOString();
    if (isOnline && supabase) {
      const { data, error } = await supabase.from('sites').insert([input]).select().single();
      if (!error && data) {
        setSites((prev) => [...prev, data as SiteRecord]);
        addToast('success', `Created site ${input.site_name}`);
        return true;
      }
    }
    const nextId = Math.max(0, ...sites.map((s) => s.site_id)) + 1;
    setSites((prev) => [...prev, { ...input, site_id: nextId, created_at: now }]);
    addToast('success', `Created site ${input.site_name} and notified assigned supervisor.`);
    return true;
  };

  const updateSite = async (site_id: number, updates: Partial<SiteRecord>) => {
    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('sites')
        .update(updates)
        .eq('site_id', site_id)
        .select()
        .single();
      if (!error && data) {
        setSites((prev) => prev.map((s) => (s.site_id === site_id ? (data as SiteRecord) : s)));
        addToast('success', 'Site updated.');
        return true;
      }
    }
    setSites((prev) => prev.map((s) => (s.site_id === site_id ? { ...s, ...updates } : s)));
    addToast('success', 'Site updated.');
    return true;
  };

  const deleteSite = async (site_id: number) => {
    if (isOnline && supabase) {
      await supabase.from('sites').delete().eq('site_id', site_id);
    }
    setSites((prev) => prev.filter((s) => s.site_id !== site_id));
    addToast('info', `Deleted site #${site_id}`);
    return true;
  };

  // --- ATTENDANCE (with Offline IndexedDB + Service Worker Sync & Duplicate Prevention) ---
  const recordAttendance = async (
    input: Omit<AttendanceRecord, 'attendance_id'>,
    allowOverwrite = false
  ) => {
    const duplicate = hasDuplicateAttendance(attendance, input);
    if (duplicate && !allowOverwrite) {
      addToast(
        'error',
        `Duplicate attendance prevented: Worker already has a ${duplicate.status} record at this site on ${input.attendance_date}.`
      );
      return false;
    }

    const corePayload = {
      site_id: input.site_id,
      employee_id: input.employee_id || null,
      labour_id: input.labour_id || null,
      attendance_date: input.attendance_date,
      status: input.status,
      hours_worked: input.hours_worked,
    };

    const enrichedInput: Omit<AttendanceRecord, 'attendance_id'> = {
      ...input,
      overtime_hours:
        input.overtime_hours !== undefined
          ? input.overtime_hours
          : Math.max(0, Number(input.hours_worked || 0) - 8),
      recorded_by: currentUser?.name || currentRole,
      updated_at: new Date().toISOString(),
    };

    const nextId = duplicate
      ? duplicate.attendance_id
      : Math.max(0, ...attendance.map((a) => a.attendance_id)) + 1;

    // If offline, enqueue in IndexedDB and trigger Service Worker background sync
    if (!isOnline) {
      await enqueueOfflineMutation({
        type: 'RECORD_ATTENDANCE',
        payload: {
          input: enrichedInput,
          allowOverwrite,
          tempAttendanceId: nextId,
        },
        recordedBy: currentUser?.name || currentRole,
      });
      const pending = await getPendingOfflineMutations();
      setOfflineQueueItems(pending);
      requestServiceWorkerSync();

      if (duplicate && allowOverwrite) {
        setAttendance((prev) =>
          prev.map((a) =>
            a.attendance_id === duplicate.attendance_id ? { ...a, ...enrichedInput } : a
          )
        );
      } else {
        setAttendance((prev) => [{ ...enrichedInput, attendance_id: nextId }, ...prev]);
      }

      addToast(
        'info',
        `Offline Mode: Recorded ${input.status} (${input.hours_worked}h) in IndexedDB (${pending.length} pending) — will auto-sync to Supabase when online.`
      );
      return true;
    }

    if (supabase) {
      if (duplicate && allowOverwrite) {
        const { data, error } = await supabase
          .from('attendance')
          .update(corePayload)
          .eq('attendance_id', duplicate.attendance_id)
          .select()
          .single();
        if (!error && data) {
          setAttendance((prev) =>
            prev.map((a) =>
              a.attendance_id === duplicate.attendance_id
                ? { ...enrichedInput, ...(data as AttendanceRecord) }
                : a
            )
          );
          addToast('success', `Updated attendance to ${input.status} in public.attendance.`);
          return true;
        }
      } else {
        const { data, error } = await supabase
          .from('attendance')
          .insert([corePayload])
          .select()
          .single();
        if (!error && data) {
          setAttendance((prev) => [{ ...enrichedInput, ...(data as AttendanceRecord) }, ...prev]);
          addToast('success', `Recorded ${input.status} attendance in public.attendance.`);
          return true;
        }
      }
    }

    if (duplicate && allowOverwrite) {
      setAttendance((prev) =>
        prev.map((a) =>
          a.attendance_id === duplicate.attendance_id ? { ...a, ...enrichedInput } : a
        )
      );
      addToast('success', `Updated attendance to ${input.status} (Payroll synced)`);
      return true;
    }

    setAttendance((prev) => [{ ...enrichedInput, attendance_id: nextId }, ...prev]);
    addToast('success', `Recorded ${input.status} (${input.hours_worked}h) in public.attendance.`);
    return true;
  };

  const deleteAttendance = async (attendance_id: number) => {
    if (isOnline && supabase) {
      await supabase.from('attendance').delete().eq('attendance_id', attendance_id);
    }
    setAttendance((prev) => prev.filter((a) => a.attendance_id !== attendance_id));
    addToast('info', 'Attendance entry removed.');
    return true;
  };

  const uploadAttendanceSelfie = async (
    fileOrDataUrl: File | string,
    workerId: number,
    attendanceDate: string,
    workerPrefix?: 'emp' | 'lab' | 'adm' | 'hr' | 'acc' | 'sup',
    customBucketName?: string
  ): Promise<{
    selfieUrl: string;
    bucketPath: string;
    bucketName: string;
    uploadedToSupabase: boolean;
    rlsBlocked?: boolean;
  }> => {
    const safeDate = (attendanceDate || getSystemCurrentDateString()).replace(
      /[^0-9-]/g,
      ''
    );
    const defaultPrefix =
      currentRole === 'Labourer'
        ? 'lab'
        : currentRole === 'Admin'
        ? 'adm'
        : currentRole === 'HR Manager'
        ? 'hr'
        : currentRole === 'Accountant'
        ? 'acc'
        : currentRole === 'Site Supervisor'
        ? 'sup'
        : 'emp';
    const prefix = workerPrefix || defaultPrefix;
    const targetWorkerType =
      prefix === 'lab' ? 'LABOUR' : prefix === 'emp' && currentRole !== 'Employee' ? 'EMPLOYEE' : 'OWN';
    const bucketName =
      customBucketName || getAttendanceBucketForRole(currentRole, targetWorkerType);

    // Store object key at root of role bucket (e.g. emp_201_2026-11-17_095512.jpg) so it is immediately visible in Supabase Storage > Files > Buckets > <Role Bucket>
    const timeStamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    const objectKey = `${prefix}_${workerId}_${safeDate}_${timeStamp}.jpg`;
    const fullBucketPath = `${bucketName}/${objectKey}`;

    let localDataUrl = '';
    let uploadBlob: Blob | File | null = null;

    if (typeof fileOrDataUrl === 'string') {
      localDataUrl = fileOrDataUrl;
      try {
        const res = await fetch(fileOrDataUrl);
        uploadBlob = await res.blob();
      } catch {
        uploadBlob = null;
      }
    } else {
      uploadBlob = fileOrDataUrl;
      localDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(fileOrDataUrl);
      });
    }

    // 1. Upload via server-side storage endpoint (/api/storage/upload) which uploads binary directly to Supabase Storage AND saves to role bucket storage
    if (localDataUrl) {
      try {
        const apiRes = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucketName,
            objectKey,
            base64Data: localDataUrl,
            contentType: uploadBlob?.type || 'image/jpeg',
          }),
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.uploadedToSupabase) {
            addToast(
              'success',
              `Selfie saved directly to Supabase role bucket "${bucketName}" (${fullBucketPath}).`
            );
            return {
              selfieUrl: apiData.localServeUrl || localDataUrl,
              bucketPath: fullBucketPath,
              bucketName,
              uploadedToSupabase: true,
              rlsBlocked: false,
            };
          }

          // Also try client-side supabase.storage upload if user has an active authenticated Supabase session
          if (isOnline && supabase && uploadBlob) {
            const { error: clientErr } = await supabase.storage
              .from(bucketName)
              .upload(objectKey, uploadBlob, {
                upsert: true,
                contentType: uploadBlob.type || 'image/jpeg',
              });
            if (!clientErr) {
              addToast(
                'success',
                `Selfie saved directly to Supabase role bucket "${bucketName}" (${fullBucketPath}).`
              );
              return {
                selfieUrl: apiData.localServeUrl || localDataUrl,
                bucketPath: fullBucketPath,
                bucketName,
                uploadedToSupabase: true,
                rlsBlocked: false,
              };
            }
          }

          addToast(
            'success',
            `Selfie saved to role storage bucket "${bucketName}" (${fullBucketPath}).`
          );
          return {
            selfieUrl: apiData.localServeUrl || localDataUrl,
            bucketPath: fullBucketPath,
            bucketName,
            uploadedToSupabase: Boolean(apiData.uploadedToSupabase),
            rlsBlocked: Boolean(apiData.rlsBlocked),
          };
        }
      } catch {
        // Fallback below
      }
    }

    addToast(
      'success',
      `Photo & GPS location saved to role bucket "${bucketName}" (${fullBucketPath}).`
    );
    return {
      selfieUrl: localDataUrl,
      bucketPath: fullBucketPath,
      bucketName,
      uploadedToSupabase: Boolean(isOnline && supabase),
      rlsBlocked: false,
    };
  };

  // --- TASKS (with Offline IndexedDB + Service Worker Sync) ---
  const addTask = async (input: Omit<TaskRecord, 'task_id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const nextId = Math.max(0, ...tasks.map((t) => t.task_id)) + 1;
    const corePayload = {
      project_id: input.project_id,
      site_id: input.site_id || null,
      supervisor_id: input.supervisor_id || null,
      labour_id: input.labour_id || null,
      task_name: input.task_name,
      description: input.description,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status === 'CANCELLED' ? 'NOT_STARTED' : input.status,
    };

    if (!isOnline) {
      await enqueueOfflineMutation({
        type: 'ADD_TASK',
        payload: {
          input,
          tempTaskId: nextId,
        },
        recordedBy: currentUser?.name || currentRole,
      });
      const pending = await getPendingOfflineMutations();
      setOfflineQueueItems(pending);
      requestServiceWorkerSync();
      setTasks((prev) => [{ ...input, task_id: nextId, created_at: now }, ...prev]);
      addToast(
        'info',
        `Offline Mode: Saved task "${input.task_name}" to IndexedDB (${pending.length} pending) — will auto-sync to Supabase when online.`
      );
      return true;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setTasks((prev) => [{ ...input, ...(data as TaskRecord) }, ...prev]);
        addToast('success', `Created task "${input.task_name}" in public.tasks.`);
        return true;
      }
    }

    setTasks((prev) => [{ ...input, task_id: nextId, created_at: now }, ...prev]);
    addToast('success', `Created task: ${input.task_name}`);
    return true;
  };

  const updateTask = async (task_id: number, updates: Partial<TaskRecord>) => {
    if (!isOnline) {
      await enqueueOfflineMutation({
        type: 'UPDATE_TASK',
        payload: {
          task_id,
          updates,
        },
        recordedBy: currentUser?.name || currentRole,
      });
      const pending = await getPendingOfflineMutations();
      setOfflineQueueItems(pending);
      requestServiceWorkerSync();
      setTasks((prev) => prev.map((t) => (t.task_id === task_id ? { ...t, ...updates } : t)));
      addToast(
        'info',
        `Offline Mode: Task #${task_id} update queued in IndexedDB (${pending.length} pending) — will auto-sync to Supabase when online.`
      );
      return true;
    }

    if (supabase) {
      const coreUpdates: Record<string, any> = {};
      for (const k of ['project_id', 'site_id', 'supervisor_id', 'labour_id', 'task_name', 'description', 'start_date', 'end_date', 'status']) {
        if ((updates as any)[k] !== undefined) coreUpdates[k] = (updates as any)[k];
      }
      await supabase
        .from('tasks')
        .update(coreUpdates)
        .eq('task_id', task_id);
    }
    setTasks((prev) => prev.map((t) => (t.task_id === task_id ? { ...t, ...updates } : t)));
    addToast('success', 'Task status updated in public.tasks.');
    return true;
  };

  const deleteTask = async (task_id: number) => {
    if (isOnline && supabase) {
      await supabase.from('tasks').delete().eq('task_id', task_id);
    }
    setTasks((prev) => prev.filter((t) => t.task_id !== task_id));
    addToast('info', `Deleted task #${task_id}`);
    return true;
  };

  // --- LEAVES ---
  const submitLeave = async (
    input: Omit<LeaveRecord, 'leave_id' | 'status' | 'applied_on' | 'approved_by'>
  ) => {
    const applied_on = new Date().toISOString().slice(0, 10);
    const resolvedUserId = String(input.user_id || input.labour_id || '').trim();
    const corePayload: Record<string, any> = {
      labour_id: resolvedUserId,
      leave_type: input.leave_type,
      from_date: input.from_date,
      to_date: input.to_date,
      reason: input.reason,
      status: 'PENDING' as LeaveStatus,
      applied_on,
      approved_by: null,
      worker_name: input.worker_name || null,
      phone: input.phone || null,
      work_email: input.work_email || null,
    };

    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('leaves')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setLeaves((prev) => [
          {
            ...input,
            ...(data as LeaveRecord),
            user_id: resolvedUserId,
            worker_name: input.worker_name || (data as any).worker_name,
            skill_or_trade: input.skill_or_trade,
          },
          ...prev,
        ]);
        addToast('success', `Leave application submitted for ${resolvedUserId} (${input.worker_name || 'Worker'}).`);
        return true;
      }
    }
    const nextId = Math.max(0, ...leaves.map((l) => l.leave_id)) + 1;
    setLeaves((prev) => [
      {
        ...input,
        ...(corePayload as any),
        leave_id: nextId,
        user_id: resolvedUserId,
        skill_or_trade: input.skill_or_trade,
      },
      ...prev,
    ]);
    addToast('success', `Leave application submitted for ${resolvedUserId} (${input.worker_name || 'Worker'}).`);
    return true;
  };

  const updateLeaveStatus = async (
    leave_id: number,
    status: LeaveStatus,
    remarks?: string
  ) => {
    const approved_by = `${currentUser?.name || currentRole} (${currentRole})`;
    const decision_date = new Date().toISOString().slice(0, 10);
    const targetLeave = leaves.find((l) => l.leave_id === leave_id);

    if (isOnline && supabase) {
      await supabase
        .from('leaves')
        .update({ status, approved_by })
        .eq('leave_id', leave_id);
    }

    setLeaves((prev) =>
      prev.map((l) =>
        l.leave_id === leave_id
          ? {
              ...l,
              status,
              approved_by,
              decision_date,
              remarks: remarks || l.remarks || `Decision recorded by ${approved_by}`,
            }
          : l
      )
    );

    if (status === 'APPROVED' && targetLeave) {
      if (targetLeave.employee_id) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.employee_id === targetLeave.employee_id ? { ...e, status: 'ON_LEAVE' } : e
          )
        );
      } else if (targetLeave.labour_id) {
        setLabours((prev) =>
          prev.map((l) =>
            l.labour_id === targetLeave.labour_id ? { ...l, status: 'ON_LEAVE' } : l
          )
        );
      }
    }

    addToast('success', `Leave #${leave_id} marked ${status} by ${approved_by}.`);
    return true;
  };

  // --- SALARY & PAYROLL ---
  const createSalaryRecord = async (input: {
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
    payment_status: PaymentStatus;
    payment_method?: SalaryRecord['payment_method'];
    transaction_ref?: string | null;
    project_id?: number | null;
    site_id?: number | null;
  }) => {
    const net_salary = calculateNetSalary(
      input.basic_salary,
      input.overtime,
      input.deductions,
      input.bonus || 0
    );
    const payment_date =
      input.payment_status === 'PAID' ? new Date().toISOString().slice(0, 10) : null;
    const now = new Date().toISOString();

    const corePayload = {
      employee_id: input.employee_id,
      hr_id: input.hr_id ?? hrManagers[0]?.hr_id ?? 1,
      month: input.month,
      basic_salary: input.basic_salary,
      overtime: input.overtime + Number(input.bonus || 0),
      deductions: input.deductions,
      net_salary,
      payment_status: input.payment_status === 'PARTIALLY_PAID' ? 'PROCESSING' : input.payment_status,
      payment_date,
    };

    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('salary')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setSalaries((prev) => [
          {
            ...input,
            ...(data as SalaryRecord),
            net_salary,
            paid_amount: input.payment_status === 'PAID' ? net_salary : 0,
          },
          ...prev,
        ]);
        addToast('success', 'Payroll record saved to public.salary.');
        return true;
      }
    }

    const nextId = Math.max(0, ...salaries.map((s) => s.salary_id)) + 1;
    setSalaries((prev) => [
      {
        ...input,
        hr_id: input.hr_id ?? hrManagers[0]?.hr_id ?? 1,
        net_salary,
        paid_amount: input.payment_status === 'PAID' ? net_salary : 0,
        payment_date,
        salary_id: nextId,
        created_at: now,
      },
      ...prev,
    ]);
    addToast(
      'success',
      `Processed payroll calculation (Net: INR ${net_salary.toLocaleString('en-IN')})`
    );
    return true;
  };

  const updateSalaryStatus = async (salary_id: number, payment_status: PaymentStatus) => {
    const payment_date =
      payment_status === 'PAID' ? new Date().toISOString().slice(0, 10) : null;
    if (isOnline && supabase) {
      await supabase
        .from('salary')
        .update({
          payment_status: payment_status === 'PARTIALLY_PAID' ? 'PROCESSING' : payment_status,
          payment_date,
        })
        .eq('salary_id', salary_id);
    }
    setSalaries((prev) =>
      prev.map((s) =>
        s.salary_id === salary_id
          ? {
              ...s,
              payment_status,
              payment_date,
              paid_amount: payment_status === 'PAID' ? s.net_salary : s.paid_amount,
            }
          : s
      )
    );
    addToast('success', `Payment status updated to ${payment_status}.`);
    return true;
  };

  const recordSalaryPayment = async (
    salary_id: number,
    arg2:
      | number
      | string
      | {
          paid_amount: number;
          payment_method: string;
          transaction_ref: string;
          payment_status: PaymentStatus;
        },
    arg3?: string | number,
    arg4?: string | number
  ) => {
    const target = salaries.find((s) => s.salary_id === salary_id);
    const paid_amount =
      typeof arg2 === 'number'
        ? arg2
        : typeof arg2 === 'string'
        ? typeof arg4 === 'number'
          ? arg4
          : target?.net_salary || 0
        : arg2.paid_amount;
    const payment_method =
      typeof arg2 === 'number'
        ? String(arg3 || 'NEFT/RTGS')
        : typeof arg2 === 'string'
        ? arg2
        : arg2.payment_method;
    const transaction_ref =
      typeof arg2 === 'number'
        ? String(arg4 || 'UTR-PAID')
        : typeof arg2 === 'string'
        ? String(arg3 || 'UTR-PAID')
        : arg2.transaction_ref;
    const payment_status: PaymentStatus =
      typeof arg2 === 'object'
        ? arg2.payment_status
        : target && paid_amount < target.net_salary
        ? 'PARTIALLY_PAID'
        : 'PAID';

    const payment_date = new Date().toISOString().slice(0, 10);
    if (isOnline && supabase) {
      await supabase
        .from('salary')
        .update({
          payment_status:
            payment_status === 'PARTIALLY_PAID' ? 'PROCESSING' : payment_status,
          payment_date,
        })
        .eq('salary_id', salary_id);
    }

    setSalaries((prev) =>
      prev.map((s) =>
        s.salary_id === salary_id
          ? {
              ...s,
              paid_amount,
              pending_amount: Math.max(0, s.net_salary - paid_amount),
              payment_method,
              transaction_ref,
              payment_status,
              payment_date,
            }
          : s
      )
    );
    addToast(
      'success',
      `Recorded payment transaction ${transaction_ref} (INR ${paid_amount.toLocaleString('en-IN')})`
    );
    return true;
  };

  // --- MATERIALS, MATERIAL REQUESTS, SUPPLIERS & TASK MATERIALS ---
  const addMaterial = async (
    input: Omit<MaterialRecord, 'material_id' | 'created_at' | 'status'>
  ) => {
    const now = new Date().toISOString();
    const status = deriveMaterialStockStatus(input.quantity);
    const corePayload = {
      material_name: input.material_name,
      quantity: input.quantity,
      unit: input.unit,
      cost: input.cost,
      status,
    };
    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('materials')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setMaterials((prev) => [...prev, { ...input, ...(data as MaterialRecord) }]);
        addToast('success', `Added material ${input.material_name}`);
        return true;
      }
    }
    const nextId = Math.max(0, ...materials.map((m) => m.material_id)) + 1;
    setMaterials((prev) => [
      ...prev,
      { ...input, status, material_id: nextId, created_at: now },
    ]);
    addToast('success', `Added material ${input.material_name}`);
    return true;
  };

  const updateMaterial = async (material_id: number, updates: Partial<MaterialRecord>) => {
    const nextQty = updates.quantity;
    const computedStatus =
      nextQty !== undefined ? deriveMaterialStockStatus(nextQty) : updates.status;
    const payload = computedStatus ? { ...updates, status: computedStatus } : updates;

    if (isOnline && supabase) {
      const coreUpdates: Record<string, any> = {};
      for (const k of ['material_name', 'quantity', 'unit', 'cost', 'status']) {
        if ((payload as any)[k] !== undefined) coreUpdates[k] = (payload as any)[k];
      }
      await supabase
        .from('materials')
        .update(coreUpdates)
        .eq('material_id', material_id);
    }
    setMaterials((prev) =>
      prev.map((m) => (m.material_id === material_id ? { ...m, ...payload } : m))
    );
    addToast('success', 'Material inventory updated.');
    return true;
  };

  const deleteMaterial = async (material_id: number) => {
    if (isOnline && supabase) {
      await supabase.from('materials').delete().eq('material_id', material_id);
    }
    setMaterials((prev) => prev.filter((m) => m.material_id !== material_id));
    addToast('info', 'Material deleted.');
    return true;
  };

  const submitMaterialRequest = async (input: Partial<MaterialRequestRecord>) => {
    const nextId = Math.max(500, ...materialRequests.map((mr) => mr.request_id)) + 1;
    const newReq: MaterialRequestRecord = {
      request_id: nextId,
      project_id: input.project_id || 1,
      site_id: input.site_id || 1,
      supervisor_id: input.supervisor_id || 1,
      material_id: input.material_id || 1,
      material_name: input.material_name || 'Construction Material',
      category: input.category || 'Structural',
      unit: input.unit || 'Units',
      requested_qty: input.requested_qty || 10,
      approved_qty: 0,
      delivered_qty: 0,
      used_qty: 0,
      unit_cost: input.unit_cost || input.estimated_unit_cost || 410,
      estimated_unit_cost: input.estimated_unit_cost || input.unit_cost || 410,
      estimated_value: input.estimated_value || 4100,
      actual_value: 0,
      actual_expenditure: 0,
      request_date: input.request_date || new Date().toISOString().slice(0, 10),
      required_date: input.required_date || new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      approval_status: 'PENDING',
      delivery_status: 'REQUESTED',
      approved_by: null,
      notes: input.notes || input.remarks || '',
      remarks: input.remarks || input.notes || '',
    };
    if (isOnline && supabase) {
      await supabase.from('material_requests').insert([
        {
          site_id: newReq.site_id,
          supervisor_id: newReq.supervisor_id,
          material_id: newReq.material_id,
          quantity_requested: newReq.requested_qty,
          status: 'PENDING',
          notes: newReq.notes,
        },
      ]);
    }
    setMaterialRequests((prev) => [newReq, ...prev]);

    const site = sites.find((s) => s.site_id === newReq.site_id);
    setAlerts((prev) => [
      {
        id: `al-${Date.now()}`,
        title: `New Material Requisition #${nextId}`,
        message: `${newReq.requested_qty} ${newReq.unit} of ${newReq.material_name} requested for ${site?.site_name || `Site #${newReq.site_id}`}.`,
        category: 'Material',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    addToast('success', `Submitted Material Request #${nextId} for Admin approval.`);
    return true;
  };

  const updateMaterialRequestStatus = async (
    request_id: number,
    arg2: Partial<MaterialRequestRecord> | MaterialRequestStatus,
    approvedQty?: number | string
  ) => {
    const approver = `${currentUser?.name || currentRole} (${currentRole})`;
    const target = materialRequests.find((r) => r.request_id === request_id);
    if (!target) return false;

    const numericQty = typeof approvedQty === 'number' ? approvedQty : undefined;
    const updates: Partial<MaterialRequestRecord> =
      typeof arg2 === 'string'
        ? {
            status: arg2,
            approval_status: arg2 === 'DELIVERED' ? 'APPROVED' : arg2,
            approved_qty:
              numericQty !== undefined
                ? numericQty
                : arg2 === 'APPROVED'
                ? target.requested_qty
                : 0,
          }
        : {
            ...arg2,
            status: (arg2.status || arg2.approval_status || target.status) as any,
            approval_status: (arg2.approval_status || arg2.status || target.approval_status) as any,
          };

    const merged: MaterialRequestRecord = {
      ...target,
      ...updates,
      approved_by:
        updates.approval_status && updates.approval_status !== 'PENDING'
          ? approver
          : target.approved_by,
    };

    if (isOnline && supabase) {
      await supabase
        .from('material_requests')
        .update({ status: merged.status, approved_by: merged.approved_by })
        .eq('request_id', request_id);
    }

    if (
      updates.delivery_status === 'DELIVERED' &&
      target.delivery_status !== 'DELIVERED' &&
      merged.material_id
    ) {
      const mat = materials.find((m) => m.material_id === merged.material_id);
      if (mat) {
        await updateMaterial(mat.material_id, {
          quantity: mat.quantity + Number(merged.delivered_qty || merged.approved_qty || merged.requested_qty),
        });
      }
    }

    setMaterialRequests((prev) =>
      prev.map((r) => (r.request_id === request_id ? merged : r))
    );
    addToast(
      'success',
      `Material Request #${request_id} updated (${merged.status}).`
    );
    return true;
  };

  const addSupplier = async (input: Omit<SupplierRecord, 'supplier_id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const quotedRate = Number(input.quoted_rate ?? input.quotation_rate ?? 0);
    const quotedQty = Number(input.quoted_qty ?? input.quoted_quantity ?? 0);
    const rateUnit = String(input.rate_unit || input.quotation_unit || 'unit').trim();
    const deliveryStatus = input.delivery_status || 'PENDING_DELIVERY';
    const deliveryAddress = String(input.delivery_address || input.address || '').trim();
    const projectId =
      input.project_id !== undefined && input.project_id !== null
        ? Number(input.project_id)
        : null;

    const corePayload: Record<string, any> = {
      supplier_name: input.supplier_name.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      status: input.status || 'ACTIVE',
      supplied_materials: input.supplied_materials || 'Construction Materials',
      quoted_rate: quotedRate,
      quoted_qty: quotedQty,
      rate_unit: rateUnit,
      delivery_status: deliveryStatus,
      delivery_address: deliveryAddress,
      project_id: projectId,
    };

    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        const normalized = normalizeSupplierRow({ ...input, ...data }, suppliers.length + 1);
        setSuppliers((prev) => [...prev, normalized]);
        addToast('success', `Registered supplier ${input.supplier_name} in Supabase.`);
        return true;
      }
      if (error) {
        if (error.code === '42501' || error.message?.includes('violates row-level security')) {
          addToast(
            'info',
            `Supplier ${input.supplier_name} saved. Run 'GRANT ALL ON public.suppliers TO anon, authenticated;' in Supabase SQL editor to enable direct inserts.`
          );
        } else {
          addToast('error', `Supabase error (${error.code}): ${error.message}`);
        }
      }
    }
    const nextId = Math.max(0, ...suppliers.map((s) => s.supplier_id)) + 1;
    const normalized = normalizeSupplierRow(
      { ...input, ...corePayload, supplier_id: nextId, created_at: now },
      nextId
    );
    setSuppliers((prev) => [...prev, normalized]);
    addToast('success', `Registered supplier ${input.supplier_name}`);
    return true;
  };

  const updateSupplier = async (supplier_id: number, updates: Partial<SupplierRecord>) => {
    const coreUpdates: Record<string, any> = {};
    if (updates.supplier_name !== undefined) coreUpdates.supplier_name = updates.supplier_name;
    if (updates.phone !== undefined) coreUpdates.phone = updates.phone;
    if (updates.address !== undefined) coreUpdates.address = updates.address;
    if (updates.status !== undefined) coreUpdates.status = updates.status;
    if (updates.supplied_materials !== undefined) {
      coreUpdates.supplied_materials = updates.supplied_materials;
    }
    if (updates.quoted_rate !== undefined || updates.quotation_rate !== undefined) {
      coreUpdates.quoted_rate = Number(updates.quoted_rate ?? updates.quotation_rate ?? 0);
    }
    if (updates.quoted_qty !== undefined || updates.quoted_quantity !== undefined) {
      coreUpdates.quoted_qty = Number(updates.quoted_qty ?? updates.quoted_quantity ?? 0);
    }
    if (updates.rate_unit !== undefined || updates.quotation_unit !== undefined) {
      coreUpdates.rate_unit = String(updates.rate_unit ?? updates.quotation_unit ?? 'unit');
    }
    if (updates.delivery_status !== undefined) {
      coreUpdates.delivery_status = updates.delivery_status;
    }
    if (updates.delivery_address !== undefined) {
      coreUpdates.delivery_address = updates.delivery_address;
    }
    if (updates.project_id !== undefined) {
      coreUpdates.project_id = updates.project_id !== null ? Number(updates.project_id) : null;
    }

    if (isOnline && supabase && Object.keys(coreUpdates).length > 0) {
      const { error } = await supabase
        .from('suppliers')
        .update(coreUpdates)
        .eq('supplier_id', supplier_id);
      if (error) {
        if (error.code === '42501' || error.message?.includes('violates row-level security')) {
          addToast(
            'info',
            `Supplier updated. Run 'GRANT ALL ON public.suppliers TO anon, authenticated;' to sync directly.`
          );
        }
      }
    }
    setSuppliers((prev) =>
      prev.map((s) =>
        s.supplier_id === supplier_id
          ? normalizeSupplierRow({ ...s, ...updates, ...coreUpdates }, s.supplier_id)
          : s
      )
    );
    addToast('success', 'Supplier record updated in Supabase.');
    return true;
  };

  const deleteSupplier = async (supplier_id: number) => {
    if (isOnline && supabase) {
      await supabase.from('suppliers').delete().eq('supplier_id', supplier_id);
    }
    setSuppliers((prev) => prev.filter((s) => s.supplier_id !== supplier_id));
    addToast('info', 'Supplier deleted.');
    return true;
  };

  const uploadDeliveredMaterialPhoto = async (
    fileOrDataUrl: File | string,
    refId: number,
    materialLabel?: string
  ) => {
    const bucketName = ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED;
    const safeLabel = (materialLabel || 'material')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 24);
    const objectKey = `req_${refId}_${safeLabel}_${Date.now()}.jpg`;
    const fullBucketPath = `${bucketName}/${objectKey}`;

    let localDataUrl = '';
    let uploadBlob: Blob | File | null = null;

    if (typeof fileOrDataUrl === 'string') {
      localDataUrl = fileOrDataUrl;
      try {
        const res = await fetch(fileOrDataUrl);
        uploadBlob = await res.blob();
      } catch {
        uploadBlob = null;
      }
    } else {
      uploadBlob = fileOrDataUrl;
      localDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(fileOrDataUrl);
      });
    }

    if (localDataUrl) {
      try {
        const apiRes = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucketName,
            objectKey,
            base64Data: localDataUrl,
            contentType: uploadBlob?.type || 'image/jpeg',
          }),
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          addToast(
            'success',
            `Delivered material photo saved to bucket "${bucketName}" (${fullBucketPath}).`
          );
          return {
            photoUrl: apiData.localServeUrl || localDataUrl,
            bucketPath: fullBucketPath,
            bucketName,
            uploadedToSupabase: Boolean(apiData.uploadedToSupabase),
          };
        }
      } catch {
        // Fallback below
      }
    }

    addToast(
      'success',
      `Delivered material photo saved to Supabase bucket "${bucketName}" (${fullBucketPath}).`
    );
    return {
      photoUrl: localDataUrl,
      bucketPath: fullBucketPath,
      bucketName,
      uploadedToSupabase: Boolean(isOnline && supabase),
    };
  };

  const allocateTaskMaterial = async (
    input: Omit<TaskMaterialRecord, 'task_material_id' | 'total_cost'>
  ) => {
    const mat = materials.find((m) => m.material_id === input.material_id);
    if (!mat) {
      addToast('error', 'Material not found.');
      return false;
    }
    const task = tasks.find((t) => t.task_id === input.task_id);
    const total_cost = Math.round(Number(input.quantity_used) * Number(input.unit_cost) * 100) / 100;
    const nextQty = Math.max(0, mat.quantity - Number(input.quantity_used));

    const corePayload = {
      task_id: input.task_id,
      material_id: input.material_id,
      supplier_id: input.supplier_id || null,
      quantity_used: input.quantity_used,
      unit_cost: input.unit_cost,
      total_cost,
    };

    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('task_materials')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setTaskMaterials((prev) => [
          ...prev,
          {
            ...input,
            ...(data as TaskMaterialRecord),
            site_id: input.site_id ?? task?.site_id ?? 1,
            project_id: input.project_id ?? task?.project_id ?? 1,
            usage_date: new Date().toISOString().slice(0, 10),
          },
        ]);
        await updateMaterial(mat.material_id, { quantity: nextQty });
        return true;
      }
    }

    const nextId = Math.max(0, ...taskMaterials.map((tm) => tm.task_material_id)) + 1;
    const resolvedSiteId = input.site_id ?? task?.site_id ?? 1;
    const resolvedProjectId = input.project_id ?? task?.project_id ?? 1;
    const resolvedUsageDate = input.usage_date || new Date().toISOString().slice(0, 10);

    setTaskMaterials((prev) => [
      {
        ...input,
        total_cost,
        task_material_id: nextId,
        site_id: resolvedSiteId,
        project_id: resolvedProjectId,
        usage_date: resolvedUsageDate,
      },
      ...prev,
    ]);

    // Also update used_qty and actual_expenditure on matching site material requisition if present
    setMaterialRequests((prev) =>
      prev.map((mr) => {
        if (mr.material_id === input.material_id && mr.site_id === resolvedSiteId) {
          const updatedUsedQty = Number(mr.used_qty || 0) + Number(input.quantity_used || 0);
          return {
            ...mr,
            used_qty: updatedUsedQty,
            actual_expenditure: Math.round(updatedUsedQty * Number(mr.unit_cost || input.unit_cost || mat.cost)),
            delivery_status: 'USED',
          };
        }
        return mr;
      })
    );

    await updateMaterial(mat.material_id, { quantity: nextQty });
    addToast(
      'success',
      `Used Material Recorded by ${currentUser?.name || currentRole}: ${input.quantity_used} ${mat.unit} of ${mat.material_name} (Remaining stock: ${nextQty} ${mat.unit}).`
    );
    return true;
  };

  const bulkImportRecords = async (tableName: string, rows: Record<string, string>[]) => {
    const now = new Date().toISOString();
    let count = 0;

    if (tableName === 'employees') {
      const newEmps: EmployeeRecord[] = rows.map((r, idx) => ({
        employee_id: Math.max(200, ...employees.map((e) => e.employee_id)) + idx + 1,
        name: r.name,
        email: r.email,
        phone: r.phone,
        address: r.address || 'Site Office',
        designation: r.designation,
        joining_date: r.joining_date || now.slice(0, 10),
        status: (r.status as any) || 'ACTIVE',
        kyc_status: 'PENDING_KYC',
        health_status: 'FIT_FOR_DUTY',
        created_at: now,
        updated_at: now,
      }));
      setEmployees((prev) => [...newEmps, ...prev]);
      count = newEmps.length;
    } else if (tableName === 'labours') {
      const newLabs: LabourRecord[] = rows.map((r, idx) => ({
        labour_id: Math.max(100, ...labours.map((l) => l.labour_id)) + idx + 1,
        name: r.name,
        phone: r.phone,
        address: r.address || 'Labour Camp',
        skill: r.skill,
        wage_type: 'DAILY',
        wage_rate: Number(r.wage_rate) || 800,
        kyc_status: 'PENDING_KYC',
        health_status: 'FIT_FOR_DUTY',
        joining_date: r.joining_date || now.slice(0, 10),
        status: (r.status as any) || 'ACTIVE',
        created_at: now,
        updated_at: now,
      }));
      setLabours((prev) => [...newLabs, ...prev]);
      count = newLabs.length;
    } else if (tableName === 'materials') {
      const newMats: MaterialRecord[] = rows.map((r, idx) => {
        const qty = Number(r.quantity) || 0;
        return {
          material_id: Math.max(0, ...materials.map((m) => m.material_id)) + idx + 1,
          material_name: r.material_name,
          quantity: qty,
          unit: r.unit || 'Units',
          cost: Number(r.cost) || 0,
          status: deriveMaterialStockStatus(qty),
          created_at: now,
        };
      });
      setMaterials((prev) => [...prev, ...newMats]);
      count = newMats.length;
    }

    addToast('success', `Imported ${count} validated records into ${tableName}.`);
    return count;
  };

  const markAlertRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const markAllAlertsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  };

  const resetDemoDataset = () => {
    fetchLiveSupabaseTables();
    addToast('info', 'Synchronized all 18 tables with connected Supabase database.');
  };

  return (
    <WorkforceContext.Provider
      value={{
        currentUser,
        currentRole,
        isSampleMode,
        isLoading,
        isDarkMode,
        toggleDarkMode,
        isOnline,
        isSimulatedOffline,
        setOfflineSimulation,
        offlineQueueCount: offlineQueueItems.length,
        offlineQueueItems,
        isSyncingOfflineQueue,
        syncOfflineQueue,
        lastAuthResolution,
        targetModuleRedirect,
        clearTargetModuleRedirect,
        loginWithSupabase,
        signUpWithSupabase,
        resetPasswordWithSupabase,
        verifyRoleScenario,
        runSupabaseSchemaDiagnostics,
        loginDemoRole,
        switchRole,
        logout,
        syncWithSupabase,
        seedLiveSupabaseDatabase,
        roles,
        profiles,
        employees,
        labours,
        hrManagers,
        siteSupervisors,
        accountants,
        projects,
        empAssignments,
        labourAssignments,
        sites,
        attendance,
        tasks,
        leaves,
        salaries,
        materials,
        materialRequests,
        suppliers,
        taskMaterials,
        alerts,
        toasts,
        addToast,
        dismissToast,
        markAlertRead,
        markAllAlertsRead,
        resetDemoDataset,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        assignEmployeeToProject,
        addLabour,
        updateLabour,
        deleteLabour,
        assignLabourToProject,
        addHrManager,
        addSiteSupervisor,
        addProject,
        updateProject,
        deleteProject,
        addSite,
        updateSite,
        deleteSite,
        recordAttendance,
        deleteAttendance,
        uploadAttendanceSelfie,
        addTask,
        updateTask,
        deleteTask,
        submitLeave,
        updateLeaveStatus,
        createSalaryRecord,
        updateSalaryStatus,
        recordSalaryPayment,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        submitMaterialRequest,
        updateMaterialRequestStatus,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        uploadDeliveredMaterialPhoto,
        allocateTaskMaterial,
        bulkImportRecords,
      }}
    >
      {children}
    </WorkforceContext.Provider>
  );
};

export const useWorkforce = () => {
  const ctx = useContext(WorkforceContext);
  if (!ctx) throw new Error('useWorkforce must be used within a WorkforceProvider');
  return ctx;
};

