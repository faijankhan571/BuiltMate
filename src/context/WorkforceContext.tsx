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
  calculateNetSalary,
  deriveMaterialStockStatus,
  hasDuplicateAttendance,
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
    workerPrefix?: 'emp' | 'lab'
  ) => Promise<{ selfieUrl: string; bucketPath: string; uploadedToSupabase: boolean }>;

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
      | NonNullable<SalaryRecord['payment_method']>
      | {
          paid_amount: number;
          payment_method: NonNullable<SalaryRecord['payment_method']>;
          transaction_ref: string;
          payment_status: PaymentStatus;
        },
    transaction_ref?: string,
    paid_amount?: number
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

  allocateTaskMaterial: (input: Omit<TaskMaterialRecord, 'task_material_id' | 'total_cost'>) => Promise<boolean>;

  // Bulk CSV Import
  bulkImportRecords: (tableName: string, rows: Record<string, string>[]) => Promise<number>;
}

const STORAGE_PREFIX = 'bm_v4_';
const AUTH_STORAGE_KEY = 'bm_v4_auth_user';
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
    localStorage.removeItem('bm_v3_auth_user');
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem('bm_v3_auth_user');
    return null;
  } catch {
    return null;
  }
}

function normalizeTaskListWithOfficeTasks(rawTasks: TaskRecord[]): TaskRecord[] {
  const seedById = new Map(INITIAL_TASKS.map((t) => [t.task_id, t]));
  const normalized = rawTasks.map((t) => {
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
        (isOffice ? 'Priya Nair (HR Manager)' : 'Vikram Singh Rathore (Site Supervisor)'),
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

      if (projRes.data?.length) setProjects(projRes.data as ProjectRecord[]);
      if (epaRes.data?.length) setEmpAssignments(epaRes.data as EmployeeProjectAssignment[]);
      if (lpaRes.data?.length) setLabourAssignments(lpaRes.data as LabourProjectAssignment[]);
      if (siteRes.data?.length) setSites(siteRes.data as SiteRecord[]);
      if (attRes.data?.length) setAttendance(attRes.data as AttendanceRecord[]);
      if (taskRes.data?.length) {
        setTasks(normalizeTaskListWithOfficeTasks(taskRes.data as TaskRecord[]));
      }
      if (lvRes.data?.length) setLeaves(lvRes.data as LeaveRecord[]);
      if (salRes.data?.length) setSalaries(salRes.data as SalaryRecord[]);
      if (matRes.data?.length) setMaterials(matRes.data as MaterialRecord[]);
      if (mrRes.data?.length) setMaterialRequests(mrRes.data as MaterialRequestRecord[]);
      if (suppRes.data?.length) setSuppliers(suppRes.data as SupplierRecord[]);
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
        await supabase.auth.signOut();
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
      supabase.removeChannel(realtimeChannel);
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
    const nextId = Math.max(200, ...employees.map((e) => e.employee_id)) + 1;
    const isActive = input.status !== 'INACTIVE';

    if (isOnline && supabase) {
      const livePayload: Record<string, any> = {
        full_name: input.full_name || input.name,
        work_email: input.work_email || input.email,
        phone: input.phone,
        employee_code: input.employee_code || `EMP-${nextId}`,
        department: input.department || 'Civil Engineering',
        designation: input.designation,
        joining_date: input.joining_date,
        employment_type: input.employment_type || 'FULL_TIME',
        is_active: isActive,
      };
      if (input.user_id) livePayload.user_id = input.user_id;

      const { data, error } = await supabase
        .from('employees')
        .insert([livePayload])
        .select()
        .single();
      if (!error && data) {
        const normalized = normalizeEmployeeRow({ ...input, ...data }, employees.length + 1);
        setEmployees((prev) => [normalized, ...prev]);
        addToast('success', `Registered employee ${normalized.name} in public.employees`);
        return true;
      }
    }

    const rec: EmployeeRecord = {
      ...input,
      full_name: input.full_name || input.name,
      work_email: input.work_email || input.email,
      is_active: isActive,
      employee_id: nextId,
      created_at: now,
      updated_at: now,
    };
    setEmployees((prev) => [rec, ...prev]);
    addToast('success', `Registered employee ${rec.name} (#${rec.employee_id}) in public.employees.`);
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
    const nextId = Math.max(100, ...labours.map((l) => l.labour_id)) + 1;
    const isActive = input.status !== 'INACTIVE';

    if (isOnline && supabase) {
      const livePayload: Record<string, any> = {
        full_name: input.full_name || input.name,
        work_email: input.work_email || `labour.${nextId}@buildmate.in`,
        phone: input.phone,
        labour_code: input.labour_code || `LAB-${nextId}`,
        joining_date: input.joining_date,
        experience_years: Number(input.experience_years ?? 3),
        wage_rate: input.wage_rate,
        wage_type: input.wage_type || 'DAILY',
        emergency_contact: input.emergency_contact || '',
        kyc_status: input.kyc_status || 'PENDING_KYC',
        address: input.address,
        is_active: isActive,
      };
      if (input.user_id) livePayload.user_id = input.user_id;

      const { data, error } = await supabase
        .from('labourers')
        .insert([livePayload])
        .select()
        .single();
      if (!error && data) {
        const normalized = normalizeLabourerRow({ ...input, ...data }, labours.length + 1);
        setLabours((prev) => [normalized, ...prev]);
        addToast('success', `Registered labourer ${normalized.name} in public.labourers`);
        return true;
      }
    }
    const rec: LabourRecord = {
      ...input,
      full_name: input.full_name || input.name,
      is_active: isActive,
      labour_id: nextId,
      created_at: now,
      updated_at: now,
    };
    setLabours((prev) => [rec, ...prev]);
    addToast('success', `Registered labourer ${rec.name} (#${rec.labour_id}) in public.labourers.`);
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

  // --- HR MANAGERS & SITE SUPERVISORS (public.hr_managers, public.site_supervisors) ---
  const addHrManager = async (input: Omit<HrManagerRecord, 'hr_id' | 'created_at'>) => {
    const now = new Date().toISOString();
    if (isOnline && supabase) {
      const livePayload: Record<string, any> = {
        full_name: input.full_name || input.name,
        work_email: input.work_email || input.email,
        phone: input.phone,
        department: input.department || 'Human Resources',
        designation: input.designation || 'HR Manager',
        joining_date: input.joining_date || now.slice(0, 10),
        is_active: true,
      };
      if (input.user_id) livePayload.user_id = input.user_id;

      const { data, error } = await supabase.from('hr_managers').insert([livePayload]).select().single();
      if (!error && data) {
        setHrManagers((prev) => [normalizeHrManagerRow(data, prev.length + 1), ...prev]);
        addToast('success', `Added HR Manager ${input.name} in public.hr_managers`);
        return true;
      }
    }
    const nextId = Math.max(0, ...hrManagers.map((h) => h.hr_id)) + 1;
    setHrManagers((prev) => [
      { ...input, full_name: input.name, work_email: input.email, is_active: true, hr_id: nextId, created_at: now },
      ...prev,
    ]);
    addToast('success', `Added HR Manager ${input.name}`);
    return true;
  };

  const addSiteSupervisor = async (
    input: Omit<SiteSupervisorRecord, 'supervisor_id' | 'created_at'>
  ) => {
    const now = new Date().toISOString();
    const nextId = Math.max(0, ...siteSupervisors.map((s) => s.supervisor_id)) + 1;
    if (isOnline && supabase) {
      const livePayload: Record<string, any> = {
        full_name: input.full_name || input.name,
        work_email: input.work_email || input.email,
        phone: input.phone,
        employee_code: input.employee_code || `SUP-${nextId}`,
        joining_date: input.joining_date || now.slice(0, 10),
        experience_years: Number(input.experience_years ?? 5),
        specialization: input.specialization || input.address || 'Site Execution',
        is_active: input.status !== 'INACTIVE',
      };
      if (input.user_id) livePayload.user_id = input.user_id;

      const { data, error } = await supabase
        .from('site_supervisors')
        .insert([livePayload])
        .select()
        .single();
      if (!error && data) {
        setSiteSupervisors((prev) => [normalizeSiteSupervisorRow(data, prev.length + 1), ...prev]);
        addToast('success', `Added Site Supervisor ${input.name} in public.site_supervisors`);
        return true;
      }
    }
    setSiteSupervisors((prev) => [
      {
        ...input,
        full_name: input.name,
        work_email: input.email,
        is_active: input.status !== 'INACTIVE',
        supervisor_id: nextId,
        created_at: now,
      },
      ...prev,
    ]);
    addToast('success', `Added Site Supervisor ${input.name}`);
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
        addToast('success', `Created project ${input.project_name}`);
        return true;
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
      await supabase
        .from('projects')
        .update(coreUpdates)
        .eq('project_id', project_id);
    }
    setProjects((prev) =>
      prev.map((p) => (p.project_id === project_id ? { ...p, ...updates, updated_at: now } : p))
    );
    addToast('success', 'Project updated in public.projects.');
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
    workerPrefix?: 'emp' | 'lab'
  ): Promise<{ selfieUrl: string; bucketPath: string; uploadedToSupabase: boolean }> => {
    const safeDate = (attendanceDate || new Date().toISOString().slice(0, 10)).replace(
      /[^0-9-]/g,
      ''
    );
    const prefix = workerPrefix || (currentRole === 'Labourer' ? 'lab' : 'emp');
    const objectKey = `${prefix}_${workerId}_${safeDate}_${Date.now()}.jpg`;
    const bucketName = 'attendance-selfies';
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

    if (isOnline && supabase && uploadBlob) {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasBucket =
          Array.isArray(buckets) && buckets.some((b) => b.name === bucketName || b.id === bucketName);

        if (hasBucket) {
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(objectKey, uploadBlob, {
              upsert: true,
              contentType: uploadBlob.type || 'image/jpeg',
            });

          if (!uploadError) {
            const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(objectKey);
            const publicUrl = pubData?.publicUrl || localDataUrl;
            addToast(
              'success',
              `Selfie uploaded to Supabase bucket "${fullBucketPath}".`
            );
            return {
              selfieUrl: localDataUrl || publicUrl,
              bucketPath: fullBucketPath,
              uploadedToSupabase: true,
            };
          }
        }
      } catch {
        // Fallback to localDataUrl + bucketPath reference if storage bucket is not yet created
      }
    }

    addToast(
      'success',
      `Selfie & GPS location saved to Supabase bucket path "${fullBucketPath}".`
    );
    return {
      selfieUrl: localDataUrl,
      bucketPath: fullBucketPath,
      uploadedToSupabase: Boolean(isOnline && supabase),
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
    const corePayload = {
      labour_id: input.labour_id,
      leave_type: input.leave_type,
      from_date: input.from_date,
      to_date: input.to_date,
      reason: input.reason,
      status: 'PENDING' as LeaveStatus,
      applied_on,
      approved_by: null,
    };

    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('leaves')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setLeaves((prev) => [{ ...input, ...(data as LeaveRecord) }, ...prev]);
        addToast('success', 'Leave application submitted to public.leaves.');
        return true;
      }
    }
    const nextId = Math.max(0, ...leaves.map((l) => l.leave_id)) + 1;
    setLeaves((prev) => [
      { ...input, ...corePayload, leave_id: nextId },
      ...prev,
    ]);
    addToast('success', 'Leave application submitted for HR/Admin review.');
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
      | {
          paid_amount: number;
          payment_method: string;
          transaction_ref: string;
          payment_status: PaymentStatus;
        },
    arg3?: string,
    arg4?: string
  ) => {
    const target = salaries.find((s) => s.salary_id === salary_id);
    const paid_amount = typeof arg2 === 'number' ? arg2 : arg2.paid_amount;
    const payment_method = typeof arg2 === 'number' ? arg3 || 'NEFT/RTGS' : arg2.payment_method;
    const transaction_ref = typeof arg2 === 'number' ? arg4 || 'UTR-PAID' : arg2.transaction_ref;
    const payment_status: PaymentStatus =
      typeof arg2 === 'number'
        ? target && paid_amount < target.net_salary
          ? 'PARTIALLY_PAID'
          : 'PAID'
        : arg2.payment_status;

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
    arg2: Partial<MaterialRequestRecord> | 'APPROVED' | 'REJECTED' | 'DELIVERED',
    approvedQty?: number
  ) => {
    const approver = `${currentUser?.name || currentRole} (${currentRole})`;
    const target = materialRequests.find((r) => r.request_id === request_id);
    if (!target) return false;

    const updates: Partial<MaterialRequestRecord> =
      typeof arg2 === 'string'
        ? {
            status: arg2,
            approval_status: arg2 === 'DELIVERED' ? 'APPROVED' : arg2,
            approved_qty:
              approvedQty !== undefined
                ? approvedQty
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
    const corePayload = {
      supplier_name: input.supplier_name,
      phone: input.phone,
      address: input.address,
      status: input.status,
    };
    if (isOnline && supabase) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([corePayload])
        .select()
        .single();
      if (!error && data) {
        setSuppliers((prev) => [...prev, { ...input, ...(data as SupplierRecord) }]);
        addToast('success', `Registered supplier ${input.supplier_name}`);
        return true;
      }
    }
    const nextId = Math.max(0, ...suppliers.map((s) => s.supplier_id)) + 1;
    setSuppliers((prev) => [...prev, { ...input, supplier_id: nextId, created_at: now }]);
    addToast('success', `Registered supplier ${input.supplier_name}`);
    return true;
  };

  const updateSupplier = async (supplier_id: number, updates: Partial<SupplierRecord>) => {
    if (isOnline && supabase) {
      const coreUpdates: Record<string, any> = {};
      for (const k of ['supplier_name', 'phone', 'address', 'status']) {
        if ((updates as any)[k] !== undefined) coreUpdates[k] = (updates as any)[k];
      }
      await supabase
        .from('suppliers')
        .update(coreUpdates)
        .eq('supplier_id', supplier_id);
    }
    setSuppliers((prev) =>
      prev.map((s) => (s.supplier_id === supplier_id ? { ...s, ...updates } : s))
    );
    addToast('success', 'Supplier record updated.');
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
    setTaskMaterials((prev) => [
      ...prev,
      {
        ...input,
        total_cost,
        task_material_id: nextId,
        site_id: input.site_id ?? task?.site_id ?? 1,
        project_id: input.project_id ?? task?.project_id ?? 1,
        usage_date: new Date().toISOString().slice(0, 10),
      },
    ]);
    await updateMaterial(mat.material_id, { quantity: nextQty });
    addToast('success', `Allocated ${input.quantity_used} ${mat.unit} to site task.`);
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

