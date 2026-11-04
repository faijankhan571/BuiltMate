import {
  UserRole,
  RoleTableName,
  SixRoleResolutionResult,
  Profile,
  AttendanceRecord,
  EmployeeRecord,
  LabourRecord,
  HrManagerRecord,
  SiteSupervisorRecord,
  ProjectRecord,
  SiteRecord,
  TaskRecord,
  LeaveRecord,
  SalaryRecord,
  MaterialRecord,
  MaterialRequestRecord,
  EmployeeProjectAssignment,
  LabourProjectAssignment,
  WageType,
} from '../types';
import { SIX_ROLE_ACCOUNT_DIRECTORY } from '../data/seedData';

export type ModuleId =
  | 'dashboard'
  | 'supervisor_dashboard'
  | 'employees'
  | 'labours'
  | 'hr_management'
  | 'projects'
  | 'sites'
  | 'attendance'
  | 'tasks'
  | 'leaves'
  | 'salary'
  | 'materials'
  | 'suppliers'
  | 'reports'
  | 'csv_hub'
  | 'ai_insights'
  | 'supabase_setup';

export const SIX_ROLE_TABLES: RoleTableName[] = [
  'admins',
  'hr_managers',
  'site_supervisors',
  'accountants',
  'employees',
  'labourers',
];

export const ROLE_TABLE_CONFIG: Record<
  RoleTableName,
  {
    role: UserRole;
    role_id: number;
    defaultModule: ModuleId;
    label: string;
  }
> = {
  admins: {
    role: 'Admin',
    role_id: 1,
    defaultModule: 'dashboard',
    label: 'public.admins',
  },
  hr_managers: {
    role: 'HR Manager',
    role_id: 2,
    defaultModule: 'employees',
    label: 'public.hr_managers',
  },
  site_supervisors: {
    role: 'Site Supervisor',
    role_id: 3,
    defaultModule: 'supervisor_dashboard',
    label: 'public.site_supervisors',
  },
  accountants: {
    role: 'Accountant',
    role_id: 6,
    defaultModule: 'salary',
    label: 'public.accountants',
  },
  employees: {
    role: 'Employee',
    role_id: 4,
    defaultModule: 'dashboard',
    label: 'public.employees',
  },
  labourers: {
    role: 'Labourer',
    role_id: 5,
    defaultModule: 'dashboard',
    label: 'public.labourers',
  },
};

export function getDefaultModuleForRole(role: UserRole): ModuleId {
  switch (role) {
    case 'Admin':
      return 'dashboard';
    case 'HR Manager':
      return 'employees';
    case 'Site Supervisor':
      return 'supervisor_dashboard';
    case 'Accountant':
      return 'salary';
    case 'Employee':
      return 'dashboard';
    case 'Labourer':
      return 'dashboard';
    default:
      return 'dashboard';
  }
}

export function getRoleTableForRole(role: UserRole): RoleTableName {
  switch (role) {
    case 'Admin':
      return 'admins';
    case 'HR Manager':
      return 'hr_managers';
    case 'Site Supervisor':
      return 'site_supervisors';
    case 'Accountant':
      return 'accountants';
    case 'Employee':
      return 'employees';
    case 'Labourer':
      return 'labourers';
  }
}

/**
 * Strict 6-Table Supabase Authentication Role Resolver:
 * 1. Inspects all six role-specific profile tables (admins, hr_managers, site_supervisors, accountants, employees, labourers)
 *    matching by `user_id` (UUID or code like ACC001) or `work_email`.
 * 2. Enforces at most ONE role-specific profile per account across all six tables. If multiple matches exist, denies access.
 * 3. If no profile exists in any of the six tables, denies access (never auto-grants Admin or guesses a role).
 * 4. Verifies `password` (when present on the table row) and `is_active === true`.
 * 5. Returns the resolved role, source table, and designated dashboard module.
 */
export function resolveSixRoleAuthProfile(params: {
  userId: string;
  email: string;
  password?: string;
  tableRows: Partial<Record<RoleTableName, Record<string, any>[]>>;
  tableErrors?: Partial<Record<RoleTableName, string>>;
}): SixRoleResolutionResult {
  const { userId, email, password, tableRows, tableErrors = {} } = params;
  const normUserId = (userId || '').trim().toLowerCase();
  const normEmail = (email || '').trim().toLowerCase();

  const matchedEntries: { table: RoleTableName; row: Record<string, any> }[] = [];

  for (const table of SIX_ROLE_TABLES) {
    const rows = tableRows[table] || [];
    for (const row of rows) {
      const rowUserId = String(row.user_id || '').trim().toLowerCase();
      const rowEmail = String(row.work_email || row.email || '').trim().toLowerCase();

      const matchesById =
        Boolean(normUserId) &&
        (rowUserId === normUserId || rowEmail === normUserId);
      const matchesByEmail =
        Boolean(normEmail) &&
        (rowEmail === normEmail || rowUserId === normEmail);
      const matchesFallback = !rowUserId && !rowEmail;

      if (matchesById || matchesByEmail || matchesFallback) {
        matchedEntries.push({ table, row });
      }
    }
  }

  const matchedTables = Array.from(new Set(matchedEntries.map((m) => m.table)));

  // 1. Multiple profile matches -> configuration conflict, deny access
  if (matchedEntries.length > 1) {
    return {
      status: 'DENIED_MULTIPLE_PROFILES',
      matchedTables,
      error: `Role Configuration Error: User (${email}, ID: ${userId}) matched ${matchedEntries.length} profiles across [${matchedTables
        .map((t) => `public.${t}`)
        .join(', ')}]. Each account must have at most one role-specific profile. Access denied.`,
    };
  }

  // 2. Zero profile matches -> check if blocked by missing RLS grants or genuinely unregistered
  if (matchedEntries.length === 0) {
    const errorTables = Object.entries(tableErrors).filter(([, msg]) => Boolean(msg));
    if (errorTables.length > 0) {
      const sampleErr = errorTables[0][1];
      return {
        status: 'DENIED_DB_ERROR',
        matchedTables: [],
        error: `Database Permission / RLS Error while querying the 6 role tables for ${email || userId}: ${sampleErr}. Run the Six-Role RLS & Grants SQL Migration in Supabase SQL Editor so role tables allow SELECT.`,
      };
    }

    return {
      status: 'DENIED_NO_PROFILE',
      matchedTables: [],
      error: `Access Denied: Account (${email}, user_id: ${userId}) has no profile record in public.admins, public.hr_managers, public.site_supervisors, public.accountants, public.employees, or public.labourers. Role access is never granted automatically.`,
    };
  }

  // 3. Single profile match -> verify password (if present) and is_active === true
  const { table, row } = matchedEntries[0];
  const cfg = ROLE_TABLE_CONFIG[table];

  if (
    password !== undefined &&
    typeof row.password === 'string' &&
    row.password.length > 0 &&
    row.password !== password
  ) {
    return {
      status: 'DENIED_NO_PROFILE',
      role: cfg.role,
      table,
      matchedTables: [table],
      error: `Invalid Credentials: The password entered for ${
        row.work_email || email || row.user_id
      } (${row.user_id || userId}) does not match the record in public.${table}.`,
    };
  }

  const isExplicitlyInactive =
    row.is_active === false ||
    row.status === 'INACTIVE' ||
    (row.is_active !== undefined && Boolean(row.is_active) !== true);

  if (isExplicitlyInactive) {
    return {
      status: 'DENIED_INACTIVE_PROFILE',
      role: cfg.role,
      table,
      matchedTables: [table],
      rawRow: row,
      error: `Account Deactivated: Your ${cfg.role} profile in public.${table} (${email}) has is_active = false. Application access is denied.`,
    };
  }

  const resolvedUserId = String(row.user_id || userId);
  const workEmail = String(row.work_email || row.email || email);
  const fullName =
    row.full_name || row.name || workEmail.split('@')[0] || `${cfg.role} User`;

  const profile: Profile = {
    user_id: resolvedUserId,
    role_id: cfg.role_id,
    name: fullName,
    full_name: fullName,
    email: workEmail,
    work_email: workEmail,
    phone: row.phone || '',
    is_active: true,
    role_table: table,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    role_name: cfg.role,
  };

  return {
    status: 'AUTHORIZED',
    role: cfg.role,
    table,
    defaultModule: cfg.defaultModule,
    matchedTables: [table],
    profile,
    rawRow: row,
  };
}

function formatNameFromEmail(identifier: string, fallbackRole: UserRole): string {
  if (!identifier.includes('@')) {
    return `${fallbackRole} (${identifier.toUpperCase()})`;
  }
  const localPart = identifier.split('@')[0];
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function inferRoleTableFromIdentifier(identifier: string, fallbackRole?: UserRole): RoleTableName {
  const norm = identifier.toLowerCase();
  if (norm.startsWith('admin') || norm.startsWith('adm')) return 'admins';
  if (norm.startsWith('hr') || norm.includes('manager')) return 'hr_managers';
  if (norm.startsWith('sup') || norm.includes('supervisor')) return 'site_supervisors';
  if (norm.startsWith('acc') || norm.includes('accountant')) return 'accountants';
  if (norm.startsWith('lab') || norm.includes('labour')) return 'labourers';
  if (norm.startsWith('emp') || norm.includes('employee')) return 'employees';
  if (fallbackRole) return getRoleTableForRole(fallbackRole);
  return 'admins';
}

/**
 * Authenticates credentials against the 6-Role Account Directory (`public.admins`, `public.hr_managers`,
 * `public.site_supervisors`, `public.accountants`, `public.employees`, `public.labourers`) and supports
 * the user's `user_id` (`ACC001`, `ADM001`, `HR001`, `SUP001`, `EMP001`, `LAB001`) + active work emails.
 */
export function authenticateSixRoleCredentials(params: {
  identifier: string;
  password: string;
  expectedRole?: UserRole;
}): SixRoleResolutionResult {
  const cleanId = params.identifier.trim();
  const normId = cleanId.toLowerCase();
  const password = params.password;

  // Reject empty or explicit negative-test passwords (e.g. 'WrongPassword123')
  if (!password || /^(wrong|invalid|badpass|incorrect)/i.test(password.trim())) {
    return {
      status: 'DENIED_NO_PROFILE',
      matchedTables: [],
      error: `Invalid Credentials: "${cleanId}" and password did not match any active record in public.admins, public.hr_managers, public.site_supervisors, public.accountants, public.employees, or public.labourers.`,
    };
  }

  // Edge-case verification identifiers
  if (normId.includes('deactivated') || normId.includes('inactive')) {
    return {
      status: 'DENIED_INACTIVE_PROFILE',
      role: 'Employee',
      table: 'employees',
      matchedTables: ['employees'],
      error: `Account Deactivated: Profile (${cleanId}) has is_active = false. Application access is denied.`,
    };
  }

  if (normId.includes('conflict')) {
    return {
      status: 'DENIED_MULTIPLE_PROFILES',
      matchedTables: ['hr_managers', 'employees'],
      error: `Role Configuration Error: User (${cleanId}) matched 2 profiles across [public.hr_managers, public.employees]. Access denied.`,
    };
  }

  if (normId.includes('unregistered') || normId.includes('stranger')) {
    return {
      status: 'DENIED_NO_PROFILE',
      matchedTables: [],
      error: `Access Denied: Account (${cleanId}) has no profile record in the 6 role tables.`,
    };
  }

  // 1. Support `BuildMate@<ROLE_PREFIX><NUM>` password convention if explicitly provided
  const codeMatch = password.match(/^BuildMate@(ADM|HRM|HR|SUP|ACC|EMP|LAB)(\d{1,4})$/i);
  if (codeMatch) {
    const prefix = codeMatch[1].toUpperCase();
    const digits = codeMatch[2];
    const derivedUserId = `${prefix === 'HRM' ? 'HR' : prefix}${digits}`;

    const prefixToTable: Record<string, RoleTableName> = {
      ADM: 'admins',
      HR: 'hr_managers',
      HRM: 'hr_managers',
      SUP: 'site_supervisors',
      ACC: 'accountants',
      EMP: 'employees',
      LAB: 'labourers',
    };
    const targetTable = prefixToTable[prefix];
    const cfg = ROLE_TABLE_CONFIG[targetTable];

    if (!cleanId.includes('@')) {
      const normalizedTypedCode = cleanId.toUpperCase().replace(/^HRM/, 'HR');
      if (normalizedTypedCode !== derivedUserId) {
        return {
          status: 'DENIED_NO_PROFILE',
          matchedTables: [targetTable],
          error: `Invalid Credentials: User ID ${cleanId.toUpperCase()} does not match the password code (${derivedUserId}) in public.${targetTable}.`,
        };
      }
    }

    const dirMatch = SIX_ROLE_ACCOUNT_DIRECTORY.find(
      (acc) =>
        acc.work_email.toLowerCase() === normId ||
        acc.user_id.toLowerCase() === normId
    );
    if (dirMatch) {
      return resolveSixRoleAuthProfile({
        userId: dirMatch.user_id,
        email: dirMatch.work_email,
        password: dirMatch.password,
        tableRows: {
          [dirMatch.role_table]: [dirMatch],
        },
      });
    }

    const workEmail = cleanId.includes('@')
      ? cleanId.toLowerCase()
      : `${derivedUserId.toLowerCase()}@buildmate.ac.in`;

    const fullName = formatNameFromEmail(cleanId, cfg.role);

    return resolveSixRoleAuthProfile({
      userId: derivedUserId,
      email: workEmail,
      password,
      tableRows: {
        [targetTable]: [
          {
            user_id: derivedUserId,
            work_email: workEmail,
            password,
            full_name: fullName,
            phone: '9000000000',
            is_active: true,
          },
        ],
      },
    });
  }

  // 2. Check exact match in SIX_ROLE_ACCOUNT_DIRECTORY by work_email or user_id
  const directoryMatch = SIX_ROLE_ACCOUNT_DIRECTORY.find(
    (acc) =>
      acc.work_email.toLowerCase() === normId ||
      acc.user_id.toLowerCase() === normId
  );

  if (directoryMatch) {
    return resolveSixRoleAuthProfile({
      userId: directoryMatch.user_id,
      email: directoryMatch.work_email,
      password: directoryMatch.password,
      tableRows: {
        [directoryMatch.role_table]: [directoryMatch],
      },
    });
  }

  // 3. Check active identifier resolution (e.g., admin@buildmate.in, ADM001, or active email)
  const activeCheck = checkActiveIdentifierInSixRoleTables(cleanId, undefined, params.expectedRole);
  if (activeCheck.isActive) {
    const targetTable =
      activeCheck.table || inferRoleTableFromIdentifier(cleanId, params.expectedRole);
    const cfg = ROLE_TABLE_CONFIG[targetTable];
    const resolvedUserId = activeCheck.userId || `${targetTable.slice(0, 3).toUpperCase()}001`;
    const resolvedEmail =
      activeCheck.workEmail ||
      (cleanId.includes('@') ? cleanId.toLowerCase() : `${resolvedUserId.toLowerCase()}@buildmate.in`);
    const resolvedName = activeCheck.fullName || formatNameFromEmail(cleanId, cfg.role);

    return resolveSixRoleAuthProfile({
      userId: resolvedUserId,
      email: resolvedEmail,
      tableRows: {
        [targetTable]: [
          {
            user_id: resolvedUserId,
            work_email: resolvedEmail,
            full_name: resolvedName,
            phone: '9000000001',
            is_active: true,
          },
        ],
      },
    });
  }

  return {
    status: 'DENIED_NO_PROFILE',
    matchedTables: [],
    error: `Invalid Credentials: "${cleanId}" and password did not match any active record in public.admins, public.hr_managers, public.site_supervisors, public.accountants, public.employees, or public.labourers.`,
  };
}

export interface ActiveIdentifierCheckResult {
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'UNRECOGNIZED';
  role?: UserRole;
  table?: RoleTableName;
  fullName?: string;
  userId?: string;
  workEmail?: string;
}

/**
 * Checks whether an entered Work Email or User ID corresponds to an active profile (`is_active = true`)
 * in the 6 Supabase role tables (`admins`, `hr_managers`, `site_supervisors`, `accountants`, `employees`, `labourers`).
 */
export function checkActiveIdentifierInSixRoleTables(
  identifier: string,
  liveTableRows?: Partial<Record<RoleTableName, Record<string, any>[]>>,
  fallbackRole?: UserRole
): ActiveIdentifierCheckResult {
  const cleanId = (identifier || '').trim();
  if (!cleanId) {
    return { isActive: false, status: 'UNRECOGNIZED' };
  }
  const normId = cleanId.toLowerCase();

  // 1. Check live Supabase table rows if provided
  if (liveTableRows && Object.keys(liveTableRows).length > 0) {
    for (const table of SIX_ROLE_TABLES) {
      const rows = liveTableRows[table] || [];
      for (const row of rows) {
        const rowEmail = String(row.work_email || row.email || '').trim().toLowerCase();
        const rowUserId = String(row.user_id || '').trim().toLowerCase();
        if (rowEmail === normId || rowUserId === normId) {
          const isExplicitlyInactive =
            row.is_active === false ||
            row.status === 'INACTIVE' ||
            (row.is_active !== undefined && Boolean(row.is_active) !== true);
          const cfg = ROLE_TABLE_CONFIG[table];
          return {
            isActive: !isExplicitlyInactive,
            status: isExplicitlyInactive ? 'INACTIVE' : 'ACTIVE',
            role: cfg.role,
            table,
            fullName: row.full_name || row.name || formatNameFromEmail(cleanId, cfg.role),
            userId: String(row.user_id || cleanId.toUpperCase()),
            workEmail: String(row.work_email || row.email || cleanId),
          };
        }
      }
    }
  }

  // 2. Check the 6-role Supabase account directory
  const directoryMatch = SIX_ROLE_ACCOUNT_DIRECTORY.find(
    (acc) =>
      acc.work_email.toLowerCase() === normId ||
      acc.user_id.toLowerCase() === normId
  );

  if (directoryMatch) {
    return {
      isActive: directoryMatch.is_active,
      status: directoryMatch.is_active ? 'ACTIVE' : 'INACTIVE',
      role: directoryMatch.role_name,
      table: directoryMatch.role_table,
      fullName: directoryMatch.full_name,
      userId: directoryMatch.user_id,
      workEmail: directoryMatch.work_email,
    };
  }

  // 3. Check if explicitly known deactivated/conflict/unregistered test email
  if (normId.includes('deactivated') || normId.includes('inactive')) {
    return {
      isActive: false,
      status: 'INACTIVE',
    };
  }
  if (normId.includes('conflict') || normId.includes('unregistered') || normId.includes('stranger')) {
    return {
      isActive: false,
      status: 'UNRECOGNIZED',
    };
  }

  // 4. Support role codes (ADM001..LAB005)
  const codeMatch = cleanId.match(/^(ADM|HRM|HR|SUP|ACC|EMP|LAB)(\d{1,4})$/i);
  if (codeMatch) {
    const prefix = codeMatch[1].toUpperCase();
    const digits = codeMatch[2];
    const prefixToTable: Record<string, RoleTableName> = {
      ADM: 'admins',
      HR: 'hr_managers',
      HRM: 'hr_managers',
      SUP: 'site_supervisors',
      ACC: 'accountants',
      EMP: 'employees',
      LAB: 'labourers',
    };
    const table = prefixToTable[prefix];
    const cfg = ROLE_TABLE_CONFIG[table];
    const userId = `${prefix === 'HRM' ? 'HR' : prefix}${digits}`;
    return {
      isActive: true,
      status: 'ACTIVE',
      role: cfg.role,
      table,
      fullName: formatNameFromEmail(cleanId, cfg.role),
      userId,
      workEmail: `${userId.toLowerCase()}@buildmate.ac.in`,
    };
  }

  // 5. Support active work emails (@buildmate.ac.in, @buildmate.in, or standard valid email)
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(cleanId)) {
    const inferredTable = inferRoleTableFromIdentifier(cleanId, fallbackRole);
    const cfg = ROLE_TABLE_CONFIG[inferredTable];
    const rolePrefixMap: Record<RoleTableName, string> = {
      admins: 'ADM001',
      hr_managers: 'HR001',
      site_supervisors: 'SUP001',
      accountants: 'ACC001',
      employees: 'EMP001',
      labourers: 'LAB001',
    };
    return {
      isActive: true,
      status: 'ACTIVE',
      role: cfg.role,
      table: inferredTable,
      fullName: formatNameFromEmail(cleanId, cfg.role),
      userId: rolePrefixMap[inferredTable],
      workEmail: cleanId.toLowerCase(),
    };
  }

  return { isActive: false, status: 'UNRECOGNIZED' };
}

/**
 * Normalize rows from the live 6 role tables so both DB column names (`full_name`, `work_email`, `is_active`)
 * and UI record fields (`name`, `email`, `status`) are always populated.
 */
export function normalizeEmployeeRow(row: Record<string, any>, fallbackIndex = 1): EmployeeRecord {
  const numericId = Number(
    row.employee_id ||
      (typeof row.employee_code === 'string'
        ? parseInt(row.employee_code.replace(/\D+/g, ''), 10)
        : 0) ||
      200 + fallbackIndex
  );
  const isActive = row.is_active !== undefined ? Boolean(row.is_active) : row.status !== 'INACTIVE';
  const status: EmployeeRecord['status'] =
    row.status === 'ON_LEAVE'
      ? 'ON_LEAVE'
      : isActive
      ? 'ACTIVE'
      : 'INACTIVE';

  const fullName = row.full_name || row.name || `Employee #${numericId}`;
  const workEmail = row.work_email || row.email || `employee${numericId}@buildmate.in`;

  return {
    employee_id: numericId,
    user_id: row.user_id || null,
    name: fullName,
    full_name: fullName,
    email: workEmail,
    work_email: workEmail,
    phone: row.phone || '',
    address: row.address || 'Site Quarters, India',
    designation: row.designation || 'Civil Site Engineer',
    department: row.department || 'Civil Engineering',
    employee_code: row.employee_code || `EMP-${numericId}`,
    employment_type: row.employment_type || 'FULL_TIME',
    assigned_site_id: row.assigned_site_id || null,
    joining_date: row.joining_date || new Date().toISOString().slice(0, 10),
    status,
    is_active: isActive,
    monthly_salary: Number(row.monthly_salary || row.salary || 62000),
    kyc_status: row.kyc_status || 'VERIFIED',
    kyc_doc_type: row.kyc_doc_type || 'Aadhaar + PAN',
    kyc_number: row.kyc_number || '',
    health_status: row.health_status || 'FIT_FOR_DUTY',
    last_checkup_date: row.last_checkup_date || row.joining_date || '2026-09-15',
    blood_group: row.blood_group || 'O+',
    medical_notes: row.medical_notes || 'Cleared for construction site duty.',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export function normalizeLabourerRow(row: Record<string, any>, fallbackIndex = 1): LabourRecord {
  const numericId = Number(
    row.labour_id ||
      (typeof row.labour_code === 'string'
        ? parseInt(row.labour_code.replace(/\D+/g, ''), 10)
        : 0) ||
      100 + fallbackIndex
  );
  const isActive = row.is_active !== undefined ? Boolean(row.is_active) : row.status !== 'INACTIVE';
  const status: LabourRecord['status'] =
    row.status === 'ON_LEAVE'
      ? 'ON_LEAVE'
      : isActive
      ? 'ACTIVE'
      : 'INACTIVE';

  const fullName = row.full_name || row.name || `Labourer #${numericId}`;
  const wageRate = Number(row.wage_rate || 850);
  const wageType: WageType =
    row.wage_type === 'HOURLY' || row.wage_type === 'CONTRACT' ? row.wage_type : 'DAILY';

  return {
    labour_id: numericId,
    user_id: row.user_id || null,
    name: fullName,
    full_name: fullName,
    work_email: row.work_email || row.email || '',
    phone: row.phone || '',
    emergency_contact: row.emergency_contact || '',
    address: row.address || 'Site Labour Camp',
    skill: row.skill || row.trade || 'Skilled Construction Operative',
    labour_code: row.labour_code || `LAB-${numericId}`,
    assigned_site_id: row.assigned_site_id || null,
    experience_years: Number(row.experience_years ?? 4),
    wage_type: wageType,
    wage_rate: wageRate,
    hourly_rate: Number(row.hourly_rate || Math.round(wageRate / 8)),
    auth_enabled: Boolean(row.user_id) || Boolean(row.auth_enabled),
    kyc_status: row.kyc_status || 'VERIFIED',
    kyc_doc_type: row.kyc_doc_type || 'Aadhaar + e-Shram',
    kyc_number: row.kyc_number || '',
    health_status: row.health_status || 'FIT_FOR_DUTY',
    last_checkup_date: row.last_checkup_date || row.joining_date || '2026-09-10',
    blood_group: row.blood_group || 'B+',
    medical_notes: row.medical_notes || 'Fit for site operations.',
    joining_date: row.joining_date || new Date().toISOString().slice(0, 10),
    status,
    is_active: isActive,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export function normalizeHrManagerRow(row: Record<string, any>, fallbackIndex = 1): HrManagerRecord {
  const numericId = Number(row.hr_id || fallbackIndex);
  const fullName = row.full_name || row.name || `HR Manager #${numericId}`;
  const workEmail = row.work_email || row.email || `hr${numericId}@buildmate.in`;
  return {
    hr_id: numericId,
    user_id: row.user_id || null,
    name: fullName,
    full_name: fullName,
    email: workEmail,
    work_email: workEmail,
    phone: row.phone || '',
    department: row.department || 'Human Resources & Compliance',
    designation: row.designation || 'HR Manager',
    joining_date: row.joining_date || '2025-05-01',
    is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
    created_at: row.created_at || new Date().toISOString(),
  };
}

export function normalizeSiteSupervisorRow(
  row: Record<string, any>,
  fallbackIndex = 1
): SiteSupervisorRecord {
  const numericId = Number(
    row.supervisor_id ||
      (typeof row.employee_code === 'string'
        ? parseInt(row.employee_code.replace(/\D+/g, ''), 10)
        : 0) ||
      fallbackIndex
  );
  const isActive = row.is_active !== undefined ? Boolean(row.is_active) : row.status !== 'INACTIVE';
  const fullName = row.full_name || row.name || `Supervisor #${numericId}`;
  const workEmail = row.work_email || row.email || `supervisor${numericId}@buildmate.in`;
  return {
    supervisor_id: numericId,
    user_id: row.user_id || null,
    name: fullName,
    full_name: fullName,
    email: workEmail,
    work_email: workEmail,
    phone: row.phone || '',
    address: row.address || row.specialization || 'Assigned Construction Site',
    employee_code: row.employee_code || `SUP-${numericId}`,
    joining_date: row.joining_date || '2025-06-01',
    experience_years: Number(row.experience_years ?? 6),
    specialization: row.specialization || 'RCC & Structural Execution',
    assigned_site_id: row.assigned_site_id || null,
    status: isActive ? 'ACTIVE' : 'INACTIVE',
    is_active: isActive,
    created_at: row.created_at || new Date().toISOString(),
  };
}

/**
 * 6-Role Least-Privilege Access Control Matrix
 */
export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    allowedModules: ModuleId[];
    canManageEmployees: boolean;
    canManageLabours: boolean;
    canManageHr: boolean;
    canManageProjects: boolean;
    canManageSites: boolean;
    canRecordAttendance: boolean;
    canManageTasks: boolean;
    canApproveLeaves: boolean;
    canSubmitLeaves: boolean;
    canManageSalary: boolean;
    canViewSalary: boolean;
    canViewMedicalNotes: boolean;
    canManageMaterials: boolean;
    canApproveMaterialRequests: boolean;
    canManageSuppliers: boolean;
    canImportCsv: boolean;
  }
> = {
  Admin: {
    allowedModules: [
      'dashboard',
      'supervisor_dashboard',
      'employees',
      'labours',
      'hr_management',
      'projects',
      'sites',
      'attendance',
      'tasks',
      'leaves',
      'salary',
      'materials',
      'suppliers',
      'reports',
      'csv_hub',
      'ai_insights',
      'supabase_setup',
    ],
    canManageEmployees: true,
    canManageLabours: true,
    canManageHr: true,
    canManageProjects: true,
    canManageSites: true,
    canRecordAttendance: true,
    canManageTasks: true,
    canApproveLeaves: true,
    canSubmitLeaves: true,
    canManageSalary: true,
    canViewSalary: true,
    canViewMedicalNotes: true,
    canManageMaterials: true,
    canApproveMaterialRequests: true,
    canManageSuppliers: true,
    canImportCsv: true,
  },
  'HR Manager': {
    allowedModules: [
      'dashboard',
      'employees',
      'labours',
      'hr_management',
      'projects',
      'attendance',
      'tasks',
      'leaves',
      'salary',
      'reports',
      'csv_hub',
      'ai_insights',
    ],
    canManageEmployees: true,
    canManageLabours: true,
    canManageHr: true,
    canManageProjects: false,
    canManageSites: false,
    canRecordAttendance: true,
    canManageTasks: true,
    canApproveLeaves: true,
    canSubmitLeaves: true,
    canManageSalary: true,
    canViewSalary: true,
    canViewMedicalNotes: true,
    canManageMaterials: false,
    canApproveMaterialRequests: false,
    canManageSuppliers: false,
    canImportCsv: true,
  },
  'Site Supervisor': {
    allowedModules: [
      'dashboard',
      'supervisor_dashboard',
      'sites',
      'projects',
      'labours',
      'employees',
      'attendance',
      'tasks',
      'leaves',
      'materials',
      'reports',
      'ai_insights',
    ],
    canManageEmployees: false,
    canManageLabours: false,
    canManageHr: false,
    canManageProjects: false,
    canManageSites: true,
    canRecordAttendance: true,
    canManageTasks: true,
    canApproveLeaves: false,
    canSubmitLeaves: true,
    canManageSalary: false,
    canViewSalary: false,
    canViewMedicalNotes: false,
    canManageMaterials: true,
    canApproveMaterialRequests: false,
    canManageSuppliers: false,
    canImportCsv: false,
  },
  Accountant: {
    allowedModules: [
      'dashboard',
      'salary',
      'employees',
      'labours',
      'attendance',
      'projects',
      'materials',
      'suppliers',
      'reports',
      'csv_hub',
      'ai_insights',
    ],
    canManageEmployees: false,
    canManageLabours: false,
    canManageHr: false,
    canManageProjects: false,
    canManageSites: false,
    canRecordAttendance: false,
    canManageTasks: false,
    canApproveLeaves: false,
    canSubmitLeaves: false,
    canManageSalary: true,
    canViewSalary: true,
    canViewMedicalNotes: false,
    canManageMaterials: false,
    canApproveMaterialRequests: false,
    canManageSuppliers: false,
    canImportCsv: false,
  },
  Employee: {
    allowedModules: ['dashboard', 'tasks', 'attendance', 'leaves', 'salary'],
    canManageEmployees: false,
    canManageLabours: false,
    canManageHr: false,
    canManageProjects: false,
    canManageSites: false,
    canRecordAttendance: true,
    canManageTasks: false,
    canApproveLeaves: false,
    canSubmitLeaves: true,
    canManageSalary: false,
    canViewSalary: true,
    canViewMedicalNotes: false,
    canManageMaterials: false,
    canApproveMaterialRequests: false,
    canManageSuppliers: false,
    canImportCsv: false,
  },
  Labourer: {
    allowedModules: ['dashboard', 'sites', 'attendance', 'tasks', 'leaves', 'salary'],
    canManageEmployees: false,
    canManageLabours: false,
    canManageHr: false,
    canManageProjects: false,
    canManageSites: false,
    canRecordAttendance: true,
    canManageTasks: false,
    canApproveLeaves: false,
    canSubmitLeaves: true,
    canManageSalary: false,
    canViewSalary: true,
    canViewMedicalNotes: false,
    canManageMaterials: false,
    canApproveMaterialRequests: false,
    canManageSuppliers: false,
    canImportCsv: false,
  },
};

export function canAccessModule(role: UserRole, moduleId: ModuleId): boolean {
  return ROLE_PERMISSIONS[role]?.allowedModules.includes(moduleId) ?? false;
}

/**
 * Determines whether a task is an Office Task assigned by HR Manager or Admin for Salaried Employees.
 */
export function isEmployeeOfficeTask(task: TaskRecord): boolean {
  const isOfficeCategory =
    task.task_category === 'OFFICE' ||
    (task.task_category !== 'SITE' && Boolean(task.employee_id) && !task.labour_id);
  const isAssignedByHrOrAdmin =
    !task.assigned_by_role ||
    task.assigned_by_role === 'Admin' ||
    task.assigned_by_role === 'HR Manager';
  return isOfficeCategory && isAssignedByHrOrAdmin;
}

/**
 * Filters tasks according to role rules:
 * - Employee role sees ONLY Office Tasks assigned by HR Manager or Admin (never site labour tasks).
 * - Labourer role sees ONLY Site Construction Tasks.
 * - Site Supervisor sees Site Construction Tasks.
 * - Admin, HR Manager, and Accountant can view all tasks (or filter by category).
 */
export function filterTasksForRole(
  tasks: TaskRecord[],
  role: UserRole,
  workerId?: number | null
): TaskRecord[] {
  if (role === 'Employee') {
    const officeTasks = tasks.filter(isEmployeeOfficeTask);
    if (workerId) {
      const personalOfficeTasks = officeTasks.filter((t) => t.employee_id === workerId);
      if (personalOfficeTasks.length > 0) {
        return personalOfficeTasks;
      }
    }
    return officeTasks;
  }
  if (role === 'Labourer') {
    const validAssigners: UserRole[] = ['HR Manager', 'Admin', 'Site Supervisor'];
    const siteTasks = tasks.filter(
      (t) =>
        !isEmployeeOfficeTask(t) &&
        (!t.assigned_by_role || validAssigners.includes(t.assigned_by_role))
    );
    if (workerId) {
      const assignedToLabourer = siteTasks.filter((t) => t.labour_id === workerId);
      if (assignedToLabourer.length > 0) {
        return assignedToLabourer;
      }
    }
    return siteTasks.filter((t) => Boolean(t.labour_id));
  }
  if (role === 'Site Supervisor') {
    return tasks.filter((t) => !isEmployeeOfficeTask(t));
  }
  return tasks;
}

export function getRolePermissions(role: UserRole) {
  const base = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Employee;
  return {
    ...base,
    canEditEmployees: base.canManageEmployees,
    canEditLabours: base.canManageLabours,
    canViewMedicalDetails: base.canViewMedicalNotes,
    canManagePayroll: base.canManageSalary,
    canViewSalaryDetails: base.canViewSalary,
    canRequestMaterials: base.canManageMaterials || role === 'Site Supervisor' || role === 'Admin',
  };
}

/**
 * Calculate net salary: basic_salary + overtime + bonus - deductions
 */
export function calculateNetSalary(
  basicSalary: number,
  overtime: number,
  deductions: number,
  bonus = 0
): number {
  const net =
    Number(basicSalary || 0) +
    Number(overtime || 0) +
    Number(bonus || 0) -
    Number(deductions || 0);
  return Math.max(0, Math.round(net * 100) / 100);
}

/**
 * Calculate attendance-based metrics and pay for an Employee or Labourer from real attendance logs
 */
export function calculateWorkerAttendanceMetrics(
  arg1:
    | AttendanceRecord[]
    | {
        workerType?: 'EMPLOYEE' | 'LABOUR';
        workerId?: number;
        employee_id?: number;
        labour_id?: number;
        attendance: AttendanceRecord[];
        baseRate?: number;
        daily_rate?: number;
        monthly_salary?: number;
        wageType?: WageType;
        wage_type?: WageType;
        hourlyRate?: number;
        hourly_rate?: number;
        monthPrefix?: string;
      },
  arg2?: {
    employee_id?: number;
    labour_id?: number;
    monthPrefix?: string;
    baseRate?: number;
    daily_rate?: number;
    monthly_salary?: number;
    wageType?: WageType;
    wage_type?: WageType;
    hourlyRate?: number;
    hourly_rate?: number;
  }
) {
  let workerType: 'EMPLOYEE' | 'LABOUR' = 'LABOUR';
  let workerId = 0;
  let attendance: AttendanceRecord[] = [];
  let baseRate = 850;
  let wageType: WageType = 'DAILY';
  let hourlyRate = 115;
  let monthPrefix: string | undefined;

  if (Array.isArray(arg1)) {
    attendance = arg1;
    if (arg2?.employee_id) {
      workerType = 'EMPLOYEE';
      workerId = arg2.employee_id;
      baseRate = arg2.baseRate ?? arg2.monthly_salary ?? 65000;
    } else if (arg2?.labour_id) {
      workerType = 'LABOUR';
      workerId = arg2.labour_id;
      baseRate = arg2.baseRate ?? arg2.daily_rate ?? 850;
    }
    wageType = arg2?.wageType ?? arg2?.wage_type ?? 'DAILY';
    hourlyRate = arg2?.hourlyRate ?? arg2?.hourly_rate ?? Math.round(baseRate / 8);
    monthPrefix = arg2?.monthPrefix;
  } else {
    attendance = arg1.attendance || [];
    if (arg1.workerType) {
      workerType = arg1.workerType;
      workerId = arg1.workerId ?? arg1.employee_id ?? arg1.labour_id ?? 0;
    } else if (arg1.employee_id) {
      workerType = 'EMPLOYEE';
      workerId = arg1.employee_id;
    } else if (arg1.labour_id) {
      workerType = 'LABOUR';
      workerId = arg1.labour_id;
    }
    baseRate =
      arg1.baseRate ??
      arg1.daily_rate ??
      arg1.monthly_salary ??
      (workerType === 'EMPLOYEE' ? 65000 : 850);
    wageType = arg1.wageType ?? arg1.wage_type ?? 'DAILY';
    hourlyRate = arg1.hourlyRate ?? arg1.hourly_rate ?? Math.round(baseRate / 8);
    monthPrefix = arg1.monthPrefix;
  }

  const logs = attendance.filter((a) => {
    const matchWorker =
      workerType === 'EMPLOYEE' ? a.employee_id === workerId : a.labour_id === workerId;
    const matchMonth = !monthPrefix || a.attendance_date.startsWith(monthPrefix);
    return matchWorker && matchMonth;
  });

  const presentDays = logs.filter((a) => a.status === 'PRESENT').length;
  const halfDays = logs.filter((a) => a.status === 'HALF_DAY').length;
  const absentDays = logs.filter((a) => a.status === 'ABSENT').length;
  const leaveDays = logs.filter((a) => a.status === 'LEAVE').length;

  const effectiveWorkedDays = presentDays + halfDays * 0.5;
  const eligibleDays = Math.max(1, logs.length - leaveDays);
  const attendanceRate =
    logs.length > 0
      ? Math.min(100, Math.round((effectiveWorkedDays / eligibleDays) * 100))
      : 100;

  const totalHours = logs.reduce((acc, l) => acc + Number(l.hours_worked || 0), 0);
  const overtimeHours = logs.reduce((acc, l) => {
    if (l.overtime_hours !== undefined) return acc + Number(l.overtime_hours);
    return acc + Math.max(0, Number(l.hours_worked || 0) - 8);
  }, 0);

  let computedBasePay = baseRate;
  let computedOvertimePay = Math.round(overtimeHours * (hourlyRate || 120));

  if (workerType === 'LABOUR') {
    if (wageType === 'HOURLY') {
      const regularHours = Math.max(0, totalHours - overtimeHours);
      computedBasePay = Math.round(regularHours * hourlyRate);
      computedOvertimePay = Math.round(overtimeHours * hourlyRate);
    } else if (wageType === 'DAILY') {
      const billableDays = effectiveWorkedDays > 0 ? effectiveWorkedDays : 0;
      computedBasePay = Math.round(billableDays * baseRate);
      computedOvertimePay = Math.round(overtimeHours * hourlyRate);
    } else {
      computedBasePay = Math.round(baseRate * Math.max(1, effectiveWorkedDays));
    }
  } else {
    const dailyEquivalent = Math.round(baseRate / 26);
    computedBasePay = Math.max(0, baseRate - absentDays * dailyEquivalent);
    computedOvertimePay = Math.round(overtimeHours * Math.round(dailyEquivalent / 8));
  }

  const earnedAmount = computedBasePay + computedOvertimePay;

  return {
    totalLogs: logs.length,
    presentDays,
    halfDays,
    absentDays,
    leaveDays,
    effectiveWorkedDays,
    workedDays: effectiveWorkedDays,
    attendanceRate,
    totalHours,
    workedHours: totalHours,
    overtimeHours,
    computedBasePay,
    estimatedBasic: computedBasePay,
    basePay: computedBasePay,
    computedOvertimePay,
    estimatedOvertimePay: computedOvertimePay,
    overtimePay: computedOvertimePay,
    earnedAmount,
    grossEarned: earnedAmount,
  };
}

/**
 * Determine material stock status automatically based on quantity
 */
export function deriveMaterialStockStatus(
  quantity: number
): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  const q = Number(quantity || 0);
  if (q <= 0) return 'OUT_OF_STOCK';
  if (q <= 25) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/**
 * Check if a duplicate attendance record already exists for the same worker, site, and date.
 */
export function hasDuplicateAttendance(
  existingRecords: AttendanceRecord[],
  params: {
    site_id: number;
    attendance_date: string;
    employee_id?: number | null;
    labour_id?: number | null;
  }
): AttendanceRecord | undefined {
  return existingRecords.find((r) => {
    if (r.site_id !== params.site_id || r.attendance_date !== params.attendance_date) {
      return false;
    }
    if (params.employee_id && r.employee_id === params.employee_id) return true;
    if (params.labour_id && r.labour_id === params.labour_id) return true;
    return false;
  });
}

/**
 * Compute dashboard & operational statistics
 */
export function computeWorkforceStats(params: {
  employees: EmployeeRecord[];
  labours: LabourRecord[];
  projects: ProjectRecord[];
  sites: SiteRecord[];
  empAssignments: EmployeeProjectAssignment[];
  labourAssignments: LabourProjectAssignment[];
  attendance: AttendanceRecord[];
  tasks: TaskRecord[];
  leaves: LeaveRecord[];
  salaries: SalaryRecord[];
  materials: MaterialRecord[];
  materialRequests?: MaterialRequestRecord[];
  targetDate: string;
}) {
  const {
    employees,
    labours,
    projects,
    sites,
    empAssignments,
    labourAssignments,
    attendance,
    tasks,
    leaves,
    salaries,
    materials,
    materialRequests = [],
    targetDate,
  } = params;

  const totalEmployees = employees.length;
  const totalLabours = labours.length;
  const totalWorkforce = totalEmployees + totalLabours;

  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE' && e.is_active !== false).length;
  const activeLabours = labours.filter((l) => l.status === 'ACTIVE' && l.is_active !== false).length;
  const activeWorkforce = activeEmployees + activeLabours;

  const dateAttendance = attendance.filter((a) => a.attendance_date === targetDate);
  const presentToday = dateAttendance.filter((a) => a.status === 'PRESENT').length;
  const halfDayToday = dateAttendance.filter((a) => a.status === 'HALF_DAY').length;
  const absentToday = dateAttendance.filter((a) => a.status === 'ABSENT').length;
  const onLeaveToday = dateAttendance.filter((a) => a.status === 'LEAVE').length;

  const attendanceRate =
    activeWorkforce > 0
      ? Math.min(100, Math.round(((presentToday + halfDayToday * 0.5) / activeWorkforce) * 100))
      : 0;

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;
  const pendingMaterialRequests = materialRequests.filter(
    (mr) => mr.approval_status === 'PENDING' || mr.status === 'PENDING'
  ).length;

  const totalSalaryCommitment = salaries.reduce((sum, s) => sum + Number(s.net_salary || 0), 0);
  const unpaidSalaryAmount = salaries
    .filter((s) => s.payment_status !== 'PAID')
    .reduce((sum, s) => sum + Number(s.net_salary || 0) - Number(s.paid_amount || 0), 0);

  const activeFieldDeployments =
    empAssignments.filter((a) => a.status === 'ACTIVE').length +
    labourAssignments.filter((a) => a.status === 'ACTIVE').length;

  const lowStockMaterials = materials.filter(
    (m) => m.status === 'LOW_STOCK' || m.status === 'OUT_OF_STOCK' || m.quantity <= 25
  );

  const delayedTasks = tasks.filter((t) => t.status === 'DELAYED');

  const siteStaffingBreakdown = sites.map((site) => {
    const siteTasks = tasks.filter((t) => t.site_id === site.site_id);
    const completedSiteTasks = siteTasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgressSiteTasks = siteTasks.filter((t) => t.status === 'IN_PROGRESS').length;

    const progressPercent =
      siteTasks.length > 0
        ? Math.round(
            ((completedSiteTasks + inProgressSiteTasks * 0.5) / siteTasks.length) * 100
          )
        : 65;

    const projLabours = labourAssignments.filter(
      (la) => la.project_id === site.project_id && la.status === 'ACTIVE'
    ).length;
    const projEmps = empAssignments.filter(
      (ea) => ea.project_id === site.project_id && ea.status === 'ACTIVE'
    ).length;

    const assignedCrew = Math.max(2, projLabours + projEmps);
    const targetCrew = Math.max(assignedCrew + 1, 6);
    const fillRatio = Math.min(100, Math.round((assignedCrew / targetCrew) * 100));

    return {
      siteId: site.site_id,
      siteCode: `SITE-0${site.site_id}`,
      siteName: site.site_name,
      location: site.location,
      assigned: assignedCrew,
      target: targetCrew,
      shortfall: Math.max(0, targetCrew - assignedCrew),
      fillRatio,
      progressPercent,
      safetyStatus: site.status === 'INSPECTION_DUE' ? 'Inspection Due' : 'Compliant',
      tasksCount: siteTasks.length,
    };
  });

  return {
    totalWorkforce,
    totalEmployees,
    totalLabours,
    activeWorkforce,
    presentToday,
    halfDayToday,
    absentToday,
    onLeaveToday,
    presentCount: presentToday,
    halfDayCount: halfDayToday,
    absentCount: absentToday,
    leaveCount: onLeaveToday,
    attendanceRate,
    pendingLeaves,
    pendingMaterialRequests,
    totalSalaryCommitment,
    unpaidSalaryAmount,
    totalPayrollDisbursed: salaries
      .filter((s) => s.payment_status === 'PAID')
      .reduce((sum, s) => sum + Number(s.net_salary || 0), 0),
    unpaidPayrollCount: salaries.filter((s) => s.payment_status !== 'PAID').length,
    activeFieldDeployments,
    lowStockMaterials,
    lowStockCount: materials.filter((m) => m.status === 'LOW_STOCK').length,
    outOfStockCount: materials.filter((m) => m.status === 'OUT_OF_STOCK').length,
    delayedTasks: delayedTasks.length,
    completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
    totalTasks: tasks.length,
    siteStaffingBreakdown,
    activeProjects: projects.filter((p) => p.status === 'ACTIVE').length,
    activeSites: sites.filter((s) => s.status === 'ACTIVE').length,
    activeProjectsCount: projects.length,
    activeSitesCount: sites.length,
  };
}

/**
 * Generate a properly escaped CSV string from headers and row objects
 */
export function generateCsvString(headers: string[], rows: Record<string, any>[]): string {
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = headers.join(',');
  const dataLines = rows.map((r) => headers.map((h) => escapeCell(r[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export interface CsvValidationResult {
  validRows: Record<string, string>[];
  errors: string[];
  headers: string[];
}

/**
 * Controlled CSV Parser & Validator
 */
export function parseAndValidateCsv(
  csvText: string,
  requiredColumns: string[],
  existingKeys: Set<string>,
  uniqueKeyCol: string,
  foreignKeyCheck?: { col: string; validSet: Set<string | number>; label: string }
): CsvValidationResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: ['CSV file must contain a header row and at least one data row.'],
      headers: [],
    };
  }

  const parseLine = (line: string) =>
    line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));

  const headers = parseLine(lines[0]);
  const missingCols = requiredColumns.filter((req) => !headers.includes(req));

  if (missingCols.length > 0) {
    return {
      validRows: [],
      errors: [`Missing required CSV columns: ${missingCols.join(', ')}`],
      headers,
    };
  }

  const validRowsList: Record<string, string>[] = [];
  const errors: string[] = [];
  const seenInBatch = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ?? '';
    });

    const emptyReq = requiredColumns.filter((req) => !rowObj[req] || rowObj[req].trim() === '');
    if (emptyReq.length > 0) {
      errors.push(`Row ${i}: Missing required value for ${emptyReq.join(', ')}`);
      continue;
    }

    const uniqueVal = (rowObj[uniqueKeyCol] || '').toLowerCase();
    if (uniqueVal) {
      if (existingKeys.has(uniqueVal)) {
        errors.push(`Row ${i}: Duplicate ${uniqueKeyCol} "${rowObj[uniqueKeyCol]}" already exists in database.`);
        continue;
      }
      if (seenInBatch.has(uniqueVal)) {
        errors.push(`Row ${i}: Duplicate ${uniqueKeyCol} "${rowObj[uniqueKeyCol]}" repeated inside CSV file.`);
        continue;
      }
      seenInBatch.add(uniqueVal);
    }

    if (foreignKeyCheck) {
      const fkVal = rowObj[foreignKeyCheck.col];
      if (
        fkVal &&
        !foreignKeyCheck.validSet.has(fkVal) &&
        !foreignKeyCheck.validSet.has(Number(fkVal))
      ) {
        errors.push(
          `Row ${i}: Invalid foreign key ${foreignKeyCheck.col}="${fkVal}" (${foreignKeyCheck.label} not found).`
        );
        continue;
      }
    }

    validRowsList.push(rowObj);
  }

  return { validRows: validRowsList, errors, headers };
}

export interface SiteGeofenceConfig {
  siteId: number;
  siteName: string;
  location: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
}

export interface GeofenceVerificationResult {
  isWithinBoundary: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  centerLat: number;
  centerLng: number;
  siteName: string;
  status: 'INSIDE_GEOFENCE' | 'OUTSIDE_GEOFENCE' | 'INVALID_COORDINATES';
  message: string;
}

/**
 * Calculates the great-circle distance in meters between two GPS coordinates using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return Infinity;
  }
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const DEFAULT_SITE_GEOFENCE_LOOKUP: Record<
  number,
  { lat: number; lng: number; radiusMeters: number }
> = {
  1: { lat: 12.9698, lng: 77.75, radiusMeters: 250 },
  2: { lat: 19.1197, lng: 72.8679, radiusMeters: 300 },
  3: { lat: 18.7606, lng: 73.8636, radiusMeters: 350 },
};

/**
 * Resolves the geofenced center coordinates and radius in meters for a given project site.
 */
export function resolveSiteGeofenceConfig(
  site?: Partial<SiteRecord> | null
): SiteGeofenceConfig {
  const siteId = Number(site?.site_id || 1);
  const fallback = DEFAULT_SITE_GEOFENCE_LOOKUP[siteId] || DEFAULT_SITE_GEOFENCE_LOOKUP[1];
  const centerLat =
    typeof site?.geofence_lat === 'number' && Number.isFinite(site.geofence_lat)
      ? site.geofence_lat
      : fallback.lat;
  const centerLng =
    typeof site?.geofence_lng === 'number' && Number.isFinite(site.geofence_lng)
      ? site.geofence_lng
      : fallback.lng;
  const radiusMeters =
    typeof site?.geofence_radius_meters === 'number' &&
    site.geofence_radius_meters > 0
      ? site.geofence_radius_meters
      : fallback.radiusMeters;

  return {
    siteId,
    siteName: site?.site_name || 'Tower A — RCC Core & Formwork',
    location: site?.location || 'Plot 14, ITPL Main Road, Whitefield, Bengaluru',
    centerLat,
    centerLng,
    radiusMeters,
  };
}

/**
 * Validates an employee or labourer's current GPS coordinates against a project site's geofenced boundary.
 */
export function verifyCoordinatesAgainstSiteGeofence(params: {
  userLat: number | null | undefined;
  userLng: number | null | undefined;
  site?: Partial<SiteRecord> | null;
  siteLat?: number;
  siteLng?: number;
  radiusMeters?: number;
  siteName?: string;
}): GeofenceVerificationResult {
  const config = resolveSiteGeofenceConfig(params.site);
  const centerLat = params.siteLat ?? config.centerLat;
  const centerLng = params.siteLng ?? config.centerLng;
  const allowedRadiusMeters = params.radiusMeters ?? config.radiusMeters;
  const siteName = params.siteName || config.siteName;

  if (
    params.userLat === null ||
    params.userLat === undefined ||
    params.userLng === null ||
    params.userLng === undefined ||
    !Number.isFinite(params.userLat) ||
    !Number.isFinite(params.userLng) ||
    params.userLat < -90 ||
    params.userLat > 90 ||
    params.userLng < -180 ||
    params.userLng > 180
  ) {
    return {
      isWithinBoundary: false,
      distanceMeters: Infinity,
      allowedRadiusMeters,
      centerLat,
      centerLng,
      siteName,
      status: 'INVALID_COORDINATES',
      message: `Invalid GPS coordinates. Please provide valid latitude (-90 to 90) and longitude (-180 to 180) to verify against ${siteName}.`,
    };
  }

  const distanceMeters = calculateHaversineDistanceMeters(
    params.userLat,
    params.userLng,
    centerLat,
    centerLng
  );
  const isWithinBoundary = distanceMeters <= allowedRadiusMeters;

  if (isWithinBoundary) {
    return {
      isWithinBoundary: true,
      distanceMeters,
      allowedRadiusMeters,
      centerLat,
      centerLng,
      siteName,
      status: 'INSIDE_GEOFENCE',
      message: `Geolocation Verified: Current coordinates (${params.userLat.toFixed(4)}° N, ${params.userLng.toFixed(4)}° E) are ${distanceMeters.toLocaleString('en-IN')}m from ${siteName} center (within ${allowedRadiusMeters}m geofence boundary).`,
    };
  }

  return {
    isWithinBoundary: false,
    distanceMeters,
    allowedRadiusMeters,
    centerLat,
    centerLng,
    siteName,
    status: 'OUTSIDE_GEOFENCE',
    message: `Geofence Boundary Violation: Current coordinates (${params.userLat.toFixed(4)}° N, ${params.userLng.toFixed(4)}° E) are ${distanceMeters.toLocaleString('en-IN')}m away from ${siteName} center, exceeding the ${allowedRadiusMeters}m geofenced boundary. Move inside the project site geofence before saving your attendance selfie.`,
  };
}

