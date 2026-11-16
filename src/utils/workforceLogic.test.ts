import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessModule,
  getRolePermissions,
  resolveSixRoleAuthProfile,
  authenticateSixRoleCredentials,
  checkActiveIdentifierInSixRoleTables,
  getDefaultModuleForRole,
  calculateNetSalary,
  calculateWorkerAttendanceMetrics,
  deriveMaterialStockStatus,
  hasDuplicateAttendance,
  parseAndValidateCsv,
  filterTasksForRole,
  isEmployeeOfficeTask,
  calculateHaversineDistanceMeters,
  resolveSiteGeofenceConfig,
  verifyCoordinatesAgainstSiteGeofence,
  getAttendanceBucketForRole,
  calculateUpdatedStockAfterMaterialUsage,
  isValidBuildMateEmail,
  validateWorkEmail,
  isValid10DigitPhone,
  sanitize10DigitPhone,
  validate10DigitPhone,
  computeWorkforceStats,
  normalizeLabourerRow,
  normalizeSupplierRow,
  getAllowedMaterialTabsForRole,
  ATTENDANCE_STORAGE_BUCKETS,
  normalizeProjectId,
  resolveSupervisorAssignedScope,
} from './workforceLogic.ts';
import {
  translateFullUiText,
  getUiDictionaryForLanguage,
} from './indicTranslationEngine.ts';
import {
  enqueueOfflineMutation,
  getPendingOfflineMutations,
  removeOfflineMutation,
  clearOfflineMutations,
  enqueueLocalCheckIn,
  loadLocalCheckInQueue,
  removeLocalCheckIn,
  clearLocalCheckInQueue,
  saveCheckInDraftToLocalStorage,
  loadCheckInDraftFromLocalStorage,
  clearCheckInDraftFromLocalStorage,
} from './offlineSyncDb.ts';
import {
  INITIAL_TASKS,
  INITIAL_SITES,
  INITIAL_EMPLOYEES,
  INITIAL_LABOURS,
  INITIAL_PROJECTS,
  INITIAL_SUPPLIERS,
  INITIAL_HR_MANAGERS,
  INITIAL_SITE_SUPERVISORS,
  INITIAL_ACCOUNTANTS,
} from '../data/seedData.ts';
import type { AttendanceRecord } from '../types/index.ts';

test('resolveSixRoleAuthProfile resolves each of the 6 role tables when active', () => {
  const adminRes = resolveSixRoleAuthProfile({
    userId: 'uuid-admin-1',
    email: 'admin@buildmate.in',
    tableRows: {
      admins: [
        {
          user_id: 'uuid-admin-1',
          full_name: 'Arjun Deshmukh',
          work_email: 'admin@buildmate.in',
          phone: '+91 98201 11001',
          is_active: true,
        },
      ],
    },
  });
  assert.equal(adminRes.status, 'AUTHORIZED');
  assert.equal(adminRes.role, 'Admin');
  assert.equal(adminRes.table, 'admins');
  assert.equal(adminRes.defaultModule, 'dashboard');
  assert.equal(adminRes.profile?.name, 'Arjun Deshmukh');

  const supRes = resolveSixRoleAuthProfile({
    userId: 'uuid-sup-1',
    email: 'vikram@buildmate.in',
    tableRows: {
      site_supervisors: [
        {
          user_id: 'uuid-sup-1',
          full_name: 'Vikram Singh Rathore',
          work_email: 'vikram@buildmate.in',
          phone: '+91 98201 11003',
          is_active: true,
        },
      ],
    },
  });
  assert.equal(supRes.status, 'AUTHORIZED');
  assert.equal(supRes.role, 'Site Supervisor');
  assert.equal(supRes.defaultModule, 'supervisor_dashboard');

  const acctRes = resolveSixRoleAuthProfile({
    userId: 'uuid-acct-1',
    email: 'accountant@buildmate.in',
    tableRows: {
      accountants: [
        {
          user_id: 'uuid-acct-1',
          full_name: 'Rohan Mehta',
          work_email: 'accountant@buildmate.in',
          phone: '+91 98201 11006',
          is_active: true,
        },
      ],
    },
  });
  assert.equal(acctRes.status, 'AUTHORIZED');
  assert.equal(acctRes.role, 'Accountant');
  assert.equal(acctRes.defaultModule, 'salary');

  const labRes = resolveSixRoleAuthProfile({
    userId: 'uuid-lab-1',
    email: 'rameshwar@buildmate.in',
    tableRows: {
      labourers: [
        {
          user_id: 'uuid-lab-1',
          full_name: 'Rameshwar Prasad Yadav',
          work_email: 'rameshwar@buildmate.in',
          phone: '+91 98450 11201',
          is_active: true,
        },
      ],
    },
  });
  assert.equal(labRes.status, 'AUTHORIZED');
  assert.equal(labRes.role, 'Labourer');
  assert.equal(labRes.defaultModule, 'dashboard');
});

test('resolveSixRoleAuthProfile denies access when profile is_active is false', () => {
  const inactiveRes = resolveSixRoleAuthProfile({
    userId: 'uuid-emp-inactive',
    email: 'former.emp@buildmate.in',
    tableRows: {
      employees: [
        {
          user_id: 'uuid-emp-inactive',
          full_name: 'Former Engineer',
          work_email: 'former.emp@buildmate.in',
          is_active: false,
        },
      ],
    },
  });
  assert.equal(inactiveRes.status, 'DENIED_INACTIVE_PROFILE');
  assert.equal(inactiveRes.role, 'Employee');
  assert.match(inactiveRes.error || '', /is_active = false/);
});

test('resolveSixRoleAuthProfile denies access when multiple role profiles exist for same user_id', () => {
  const conflictRes = resolveSixRoleAuthProfile({
    userId: 'uuid-conflict',
    email: 'conflict@buildmate.in',
    tableRows: {
      hr_managers: [{ user_id: 'uuid-conflict', full_name: 'Conflict User', is_active: true }],
      employees: [{ user_id: 'uuid-conflict', full_name: 'Conflict User', is_active: true }],
    },
  });
  assert.equal(conflictRes.status, 'DENIED_MULTIPLE_PROFILES');
  assert.deepEqual(conflictRes.matchedTables, ['hr_managers', 'employees']);
});

test('resolveSixRoleAuthProfile denies access when no profile exists and never auto-grants Admin', () => {
  const missingRes = resolveSixRoleAuthProfile({
    userId: 'uuid-unregistered',
    email: 'stranger@buildmate.in',
    tableRows: {},
  });
  assert.equal(missingRes.status, 'DENIED_NO_PROFILE');
  assert.equal(missingRes.role, undefined);
});

test('6-Role least-privilege RBAC enforces strict boundaries including Accountant', () => {
  assert.equal(canAccessModule('Admin', 'salary'), true);
  assert.equal(canAccessModule('Admin', 'supabase_setup'), true);
  assert.equal(getRolePermissions('Admin').canApproveMaterialRequests, true);
  assert.equal(getDefaultModuleForRole('Admin'), 'dashboard');

  assert.equal(canAccessModule('HR Manager', 'hr_management'), true);
  assert.equal(canAccessModule('HR Manager', 'salary'), true);
  assert.equal(canAccessModule('HR Manager', 'materials'), false);
  assert.equal(getRolePermissions('HR Manager').canViewMedicalDetails, true);

  assert.equal(canAccessModule('Accountant', 'salary'), true);
  assert.equal(canAccessModule('Accountant', 'materials'), true);
  assert.equal(getRolePermissions('Accountant').canManagePayroll, true);
  assert.equal(getRolePermissions('Accountant').canViewMedicalDetails, false);
  assert.equal(getDefaultModuleForRole('Accountant'), 'salary');

  assert.equal(canAccessModule('Site Supervisor', 'supervisor_dashboard'), true);
  assert.equal(canAccessModule('Site Supervisor', 'tasks'), true);
  assert.equal(canAccessModule('Site Supervisor', 'salary'), false);
  assert.equal(getRolePermissions('Site Supervisor').canRequestMaterials, true);
  assert.equal(getRolePermissions('Site Supervisor').canViewSalaryDetails, false);

  assert.equal(canAccessModule('Employee', 'employees'), false);
  assert.equal(canAccessModule('Employee', 'salary'), true);
  assert.equal(canAccessModule('Employee', 'attendance'), true);
  assert.equal(getDefaultModuleForRole('Employee'), 'dashboard');
  assert.equal(canAccessModule('Employee', 'materials'), false);

  assert.equal(canAccessModule('Labourer', 'labours'), false);
  assert.equal(canAccessModule('Labourer', 'leaves'), true);
  assert.equal(canAccessModule('Labourer', 'salary'), true);
  assert.equal(canAccessModule('Labourer', 'attendance'), true);
  assert.equal(getDefaultModuleForRole('Labourer'), 'dashboard');
});

test('calculateNetSalary computes basic + overtime + bonus - deductions accurately', () => {
  assert.equal(calculateNetSalary(50000, 4500, 2500, 1000), 53000);
  assert.equal(calculateNetSalary(30000, 0, 35000), 0);
});

test('calculateWorkerAttendanceMetrics computes attendance rate, worked days, overtime, and earned wages', () => {
  const records: AttendanceRecord[] = [
    {
      attendance_id: 1,
      site_id: 1,
      labour_id: 101,
      employee_id: null,
      attendance_date: '2026-10-20',
      status: 'PRESENT',
      hours_worked: 10,
      overtime_hours: 2,
    },
    {
      attendance_id: 2,
      site_id: 1,
      labour_id: 101,
      employee_id: null,
      attendance_date: '2026-10-21',
      status: 'HALF_DAY',
      hours_worked: 4,
      overtime_hours: 0,
    },
  ];

  const metrics = calculateWorkerAttendanceMetrics({
    attendance: records,
    labour_id: 101,
    wage_type: 'DAILY',
    daily_rate: 800,
    hourly_rate: 100,
  });

  assert.equal(metrics.workedDays, 1.5);
  assert.equal(metrics.attendanceRate, 75);
  assert.equal(metrics.overtimeHours, 2);
  assert.equal(metrics.estimatedBasic, 1200);
  assert.equal(metrics.estimatedOvertimePay, 200);
});

test('deriveMaterialStockStatus flags LOW_STOCK and OUT_OF_STOCK accurately', () => {
  assert.equal(deriveMaterialStockStatus(0), 'OUT_OF_STOCK');
  assert.equal(deriveMaterialStockStatus(15), 'LOW_STOCK');
  assert.equal(deriveMaterialStockStatus(120), 'IN_STOCK');
});

test('hasDuplicateAttendance prevents duplicate worker + site + date entries', () => {
  const existing: AttendanceRecord[] = [
    {
      attendance_id: 1,
      site_id: 101,
      labour_id: 5,
      employee_id: null,
      attendance_date: '2026-10-22',
      status: 'PRESENT',
      hours_worked: 8,
    },
  ];

  const dup = hasDuplicateAttendance(existing, {
    site_id: 101,
    labour_id: 5,
    attendance_date: '2026-10-22',
  });
  assert.equal(Boolean(dup), true);

  const nonDup = hasDuplicateAttendance(existing, {
    site_id: 101,
    labour_id: 6,
    attendance_date: '2026-10-22',
  });
  assert.equal(Boolean(nonDup), false);
});

test('parseAndValidateCsv validates columns, required fields, duplicates, and foreign keys', () => {
  const csv = `name,phone,skill,wage_rate,project_id
Ramesh Yadav,9845011201,Mason,950,1
Suresh Kumar,9845011202,Carpenter,900,99
,9845011203,Helper,650,1`;

  const existingPhones = new Set(['9800000000']);
  const validProjects = new Set([1, 2, 3]);

  const result = parseAndValidateCsv(
    csv,
    ['name', 'phone', 'skill', 'wage_rate'],
    existingPhones,
    'phone',
    { col: 'project_id', validSet: validProjects, label: 'Project' }
  );

  assert.equal(result.validRows.length, 1);
  assert.equal(result.validRows[0].name, 'Ramesh Yadav');
  assert.equal(result.errors.length, 2);
});

test('authenticateSixRoleCredentials authenticates work_email and user_id against 6 role tables and rejects bad passwords', () => {
  const neelByEmail = authenticateSixRoleCredentials({
    identifier: 'neel.shah@buildmate.ac.in',
    password: 'BuildMate@ACC001',
  });
  assert.equal(neelByEmail.status, 'AUTHORIZED');
  assert.equal(neelByEmail.role, 'Accountant');
  assert.equal(neelByEmail.table, 'accountants');
  assert.equal(neelByEmail.profile?.user_id, 'ACC001');
  assert.equal(neelByEmail.profile?.name, 'Neel Shah');
  assert.equal(neelByEmail.defaultModule, 'salary');

  const neelByCode = authenticateSixRoleCredentials({
    identifier: 'ACC001',
    password: 'BuildMate@ACC001',
  });
  assert.equal(neelByCode.status, 'AUTHORIZED');
  assert.equal(neelByCode.role, 'Accountant');
  assert.equal(neelByCode.profile?.email, 'neel.shah@buildmate.ac.in');

  const badPassword = authenticateSixRoleCredentials({
    identifier: 'neel.shah@buildmate.ac.in',
    password: 'WrongPassword123',
  });
  assert.equal(badPassword.status, 'DENIED_NO_PROFILE');
  assert.match(badPassword.error || '', /Invalid Credentials/);

  const customAdmin = authenticateSixRoleCredentials({
    identifier: 'rahul.verma@buildmate.ac.in',
    password: 'BuildMate@ADM004',
  });
  assert.equal(customAdmin.status, 'AUTHORIZED');
  assert.equal(customAdmin.role, 'Admin');
  assert.equal(customAdmin.table, 'admins');
  assert.equal(customAdmin.profile?.user_id, 'ADM004');
  assert.equal(customAdmin.profile?.name, 'Rahul Verma');

  const standardAdminEmail = authenticateSixRoleCredentials({
    identifier: 'admin@buildmate.in',
    password: 'admin123',
    expectedRole: 'Admin',
  });
  assert.equal(standardAdminEmail.status, 'AUTHORIZED');
  assert.equal(standardAdminEmail.role, 'Admin');
  assert.equal(standardAdminEmail.table, 'admins');
});

test('checkActiveIdentifierInSixRoleTables returns isActive=true for active email and user_id across 6 role tables', () => {
  const activeEmailCheck = checkActiveIdentifierInSixRoleTables('neel.shah@buildmate.ac.in');
  assert.equal(activeEmailCheck.isActive, true);
  assert.equal(activeEmailCheck.status, 'ACTIVE');
  assert.equal(activeEmailCheck.role, 'Accountant');
  assert.equal(activeEmailCheck.table, 'accountants');
  assert.equal(activeEmailCheck.fullName, 'Neel Shah');

  const activeAdminCheck = checkActiveIdentifierInSixRoleTables('arjun.deshmukh@buildmate.ac.in');
  assert.equal(activeAdminCheck.isActive, true);
  assert.equal(activeAdminCheck.role, 'Admin');
  assert.equal(activeAdminCheck.table, 'admins');

  const inactiveCheck = checkActiveIdentifierInSixRoleTables('inactive.user@buildmate.ac.in', {
    employees: [
      {
        user_id: 'EMP999',
        full_name: 'Suspended Emp',
        work_email: 'inactive.user@buildmate.ac.in',
        is_active: false,
      },
    ],
  });
  assert.equal(inactiveCheck.isActive, false);
  assert.equal(inactiveCheck.status, 'INACTIVE');

  const emptyCheck = checkActiveIdentifierInSixRoleTables('');
  assert.equal(emptyCheck.isActive, false);
  assert.equal(emptyCheck.status, 'UNRECOGNIZED');
});

test('IndexedDB offlineSyncDb queues, lists, and removes attendance and task mutations', async () => {
  await clearOfflineMutations();
  const item1 = await enqueueOfflineMutation({
    type: 'RECORD_ATTENDANCE',
    recordedBy: 'Rameshwar Prasad Yadav',
    payload: {
      input: {
        site_id: 1,
        labour_id: 101,
        employee_id: null,
        attendance_date: '2026-10-25',
        status: 'PRESENT',
        hours_worked: 8,
        overtime_hours: 0,
      },
      allowOverwrite: true,
      tempAttendanceId: 9001,
    },
  });
  const item2 = await enqueueOfflineMutation({
    type: 'UPDATE_TASK',
    recordedBy: 'Rameshwar Prasad Yadav',
    payload: {
      task_id: 1,
      updates: { status: 'COMPLETED' },
    },
  });

  const pending = await getPendingOfflineMutations();
  assert.equal(pending.length, 2);
  assert.equal(pending[0].id, item1.id);
  assert.equal(pending[0].type, 'RECORD_ATTENDANCE');
  assert.equal(pending[1].id, item2.id);
  assert.equal(pending[1].type, 'UPDATE_TASK');

  await removeOfflineMutation(item1.id);
  const remaining = await getPendingOfflineMutations();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, item2.id);
  await clearOfflineMutations();
});

test('Employee role only accesses office modules and sees only Office Tasks assigned by HR or Admin', () => {
  assert.equal(canAccessModule('Employee', 'tasks'), true);
  assert.equal(canAccessModule('Employee', 'projects'), false);
  assert.equal(canAccessModule('Employee', 'sites'), false);
  assert.equal(canAccessModule('Employee', 'materials'), false);

  const empTasks = filterTasksForRole(INITIAL_TASKS, 'Employee', 201);
  assert.equal(empTasks.length > 0, true);
  for (const t of empTasks) {
    assert.equal(isEmployeeOfficeTask(t), true);
    assert.equal(t.task_category, 'OFFICE');
    assert.equal(
      t.assigned_by_role === 'Admin' || t.assigned_by_role === 'HR Manager',
      true
    );
  }
});

test('Labourer role removes labours module and sees only their own assigned tasks by HR Manager, Admin, or Site Supervisor', () => {
  assert.equal(canAccessModule('Labourer', 'labours'), false);
  assert.equal(canAccessModule('Labourer', 'tasks'), true);
  assert.equal(canAccessModule('Labourer', 'salary'), true);
  assert.equal(canAccessModule('Labourer', 'attendance'), true);

  const labTasks = filterTasksForRole(INITIAL_TASKS, 'Labourer', 101);
  assert.equal(labTasks.length, 3);
  const assignerRoles = new Set(labTasks.map((t) => t.assigned_by_role));
  assert.equal(assignerRoles.has('Site Supervisor'), true);
  assert.equal(assignerRoles.has('HR Manager'), true);
  assert.equal(assignerRoles.has('Admin'), true);
  for (const t of labTasks) {
    assert.equal(t.labour_id, 101);
    assert.equal(t.task_category !== 'OFFICE', true);
  }
});

test('verifyCoordinatesAgainstSiteGeofence validates coordinates against project site geofenced boundaries', () => {
  const site1 = INITIAL_SITES[0]; // 18.559, 73.7868, radius 250m
  const geoCfg = resolveSiteGeofenceConfig(site1);
  assert.equal(geoCfg.centerLat, 18.559);
  assert.equal(geoCfg.centerLng, 73.7868);
  assert.equal(geoCfg.radiusMeters, 250);

  // 1. Exact center -> 0m -> INSIDE_GEOFENCE
  const exactRes = verifyCoordinatesAgainstSiteGeofence({
    userLat: 18.559,
    userLng: 73.7868,
    site: site1,
  });
  assert.equal(exactRes.isWithinBoundary, true);
  assert.equal(exactRes.distanceMeters, 0);
  assert.equal(exactRes.status, 'INSIDE_GEOFENCE');

  // 2. ~30m away -> INSIDE_GEOFENCE
  const nearRes = verifyCoordinatesAgainstSiteGeofence({
    userLat: 18.5592,
    userLng: 73.787,
    site: site1,
  });
  assert.equal(nearRes.isWithinBoundary, true);
  assert.equal(nearRes.distanceMeters <= 250, true);
  assert.equal(nearRes.status, 'INSIDE_GEOFENCE');

  // 3. ~1.8km away -> OUTSIDE_GEOFENCE -> blocked
  const farRes = verifyCoordinatesAgainstSiteGeofence({
    userLat: 18.58,
    userLng: 73.81,
    site: site1,
  });
  assert.equal(farRes.isWithinBoundary, false);
  assert.equal(farRes.distanceMeters > 250, true);
  assert.equal(farRes.status, 'OUTSIDE_GEOFENCE');
  assert.match(farRes.message, /Geofence Boundary Violation/);

  // 4. Invalid coordinates -> INVALID_COORDINATES -> blocked
  const invalidRes = verifyCoordinatesAgainstSiteGeofence({
    userLat: 120,
    userLng: 73.7868,
    site: site1,
  });
  assert.equal(invalidRes.isWithinBoundary, false);
  assert.equal(invalidRes.status, 'INVALID_COORDINATES');

  assert.equal(calculateHaversineDistanceMeters(12.9698, 77.75, 12.9698, 77.75), 0);
});

test('localStorage check-in queue and draft cache persist, deduplicate, and remove labourer check-in records', () => {
  clearLocalCheckInQueue();
  clearCheckInDraftFromLocalStorage();

  // 1. Draft caching for labourer check-in
  saveCheckInDraftToLocalStorage({
    workerId: 101,
    siteId: 1,
    attendanceDate: '2026-10-22',
    status: 'PRESENT',
    hoursWorked: 8,
    selfieDataUrl: 'data:image/jpeg;base64,DRAFT_SELFIE',
    selfieFileName: 'selfie_lab_101_2026-10-22.jpg',
    locationLat: 12.9698,
    locationLng: 77.75,
    locationAddress: 'Tower A — RCC Core & Formwork, Whitefield, Bengaluru',
    savedAt: '2026-10-22T08:00:00.000Z',
  });

  const draft = loadCheckInDraftFromLocalStorage(101);
  assert.ok(draft);
  assert.equal(draft?.workerId, 101);
  assert.equal(draft?.selfieDataUrl, 'data:image/jpeg;base64,DRAFT_SELFIE');
  assert.equal(loadCheckInDraftFromLocalStorage(202), null);

  // 2. Enqueue check-in in poor reception mode
  const queued1 = enqueueLocalCheckIn({
    workerId: 101,
    workerName: 'Rameshwar Prasad Yadav',
    workerRole: 'Labourer',
    workerPrefix: 'lab',
    siteId: 1,
    siteName: 'Tower A — RCC Core & Formwork',
    attendanceDate: '2026-10-22',
    status: 'PRESENT',
    hoursWorked: 8,
    overtimeHours: 0,
    selfieDataUrl: 'data:image/jpeg;base64,QUEUED_SELFIE_1',
    selfieFileName: 'selfie_lab_101_2026-10-22.jpg',
    targetBucketPath: 'attendance-selfies/lab_101_2026-10-22.jpg',
    locationLat: 12.9698,
    locationLng: 77.75,
    locationAddress: 'Tower A — RCC Core & Formwork, Whitefield, Bengaluru',
    geofenceDistanceMeters: 0,
    geofenceRadiusMeters: 250,
    receptionState: 'POOR_RECEPTION',
  });

  assert.equal(loadLocalCheckInQueue().length, 1);
  assert.equal(loadLocalCheckInQueue()[0].queueId, queued1.queueId);
  assert.equal(loadLocalCheckInQueue()[0].workerName, 'Rameshwar Prasad Yadav');

  // 3. Re-queueing same worker + site + date replaces duplicate entry cleanly
  const queuedUpdated = enqueueLocalCheckIn({
    workerId: 101,
    workerName: 'Rameshwar Prasad Yadav',
    workerRole: 'Labourer',
    workerPrefix: 'lab',
    siteId: 1,
    siteName: 'Tower A — RCC Core & Formwork',
    attendanceDate: '2026-10-22',
    status: 'PRESENT',
    hoursWorked: 9,
    overtimeHours: 1,
    selfieDataUrl: 'data:image/jpeg;base64,QUEUED_SELFIE_2',
    selfieFileName: 'selfie_lab_101_2026-10-22.jpg',
    targetBucketPath: 'attendance-selfies/lab_101_2026-10-22.jpg',
    locationLat: 12.97,
    locationLng: 77.7501,
    locationAddress: 'Tower A — RCC Core & Formwork, Whitefield, Bengaluru',
    geofenceDistanceMeters: 25,
    geofenceRadiusMeters: 250,
    receptionState: 'OFFLINE',
  });

  const queueAfterDedupe = loadLocalCheckInQueue();
  assert.equal(queueAfterDedupe.length, 1);
  assert.equal(queueAfterDedupe[0].hoursWorked, 9);
  assert.equal(queueAfterDedupe[0].receptionState, 'OFFLINE');

  // 4. Remove queued check-in
  const afterRemove = removeLocalCheckIn(queuedUpdated.queueId);
  assert.equal(afterRemove.length, 0);
  clearCheckInDraftFromLocalStorage();
  assert.equal(loadCheckInDraftFromLocalStorage(101), null);
});

test('Supabase 6-role records resolve exact full_name and user_id for HRM001, SUP001, EMP001, ACC001, LAB001', () => {
  const hrRes = authenticateSixRoleCredentials({
    identifier: 'HRM001',
    password: 'BuildMate@HRM001',
  });
  assert.equal(hrRes.status, 'AUTHORIZED');
  assert.equal(hrRes.role, 'HR Manager');
  assert.equal(hrRes.profile?.user_id, 'HRM001');
  assert.equal(hrRes.profile?.full_name, 'Manasi Pawar');

  const supRes = authenticateSixRoleCredentials({
    identifier: 'SUP001',
    password: 'BuildMate@SUP001',
  });
  assert.equal(supRes.status, 'AUTHORIZED');
  assert.equal(supRes.role, 'Site Supervisor');
  assert.equal(supRes.profile?.user_id, 'SUP001');
  assert.equal(supRes.profile?.full_name, 'Sachin Patil');

  const empRes = authenticateSixRoleCredentials({
    identifier: 'EMP001',
    password: 'BuildMate@EMP001',
  });
  assert.equal(empRes.status, 'AUTHORIZED');
  assert.equal(empRes.role, 'Employee');
  assert.equal(empRes.profile?.user_id, 'EMP001');
  assert.equal(empRes.profile?.full_name, 'Rohit Sharma');
});

test('getAttendanceBucketForRole routes each role and labour attendance photo to exact Supabase bucket', () => {
  assert.equal(getAttendanceBucketForRole('Site Supervisor', 'LABOUR'), 'Labour attendance Image');
  assert.equal(getAttendanceBucketForRole('Labourer', 'OWN'), 'Labour attendance Image');
  assert.equal(getAttendanceBucketForRole('Employee', 'OWN'), 'Employees Attendence Images');
  assert.equal(getAttendanceBucketForRole('Site Supervisor', 'OWN'), 'Employees Attendence Images');
  assert.equal(getAttendanceBucketForRole('Accountant', 'OWN'), 'Accountant Attendace Images');
  assert.equal(getAttendanceBucketForRole('HR Manager', 'OWN'), 'HR Managers Attendance Images');
  assert.equal(getAttendanceBucketForRole('Admin', 'OWN'), 'Admin Attendance Images');
});

test('calculateUpdatedStockAfterMaterialUsage deducts used material quantity and derives stock status', () => {
  const normalDeduction = calculateUpdatedStockAfterMaterialUsage(500, 120);
  assert.equal(normalDeduction.remainingQuantity, 380);
  assert.equal(normalDeduction.status, 'IN_STOCK');

  const lowStockDeduction = calculateUpdatedStockAfterMaterialUsage(50, 35);
  assert.equal(lowStockDeduction.remainingQuantity, 15);
  assert.equal(lowStockDeduction.status, 'LOW_STOCK');

  const depletedDeduction = calculateUpdatedStockAfterMaterialUsage(20, 25);
  assert.equal(depletedDeduction.remainingQuantity, 0);
  assert.equal(depletedDeduction.status, 'OUT_OF_STOCK');
});

test('translateFullUiText translates UI across modules into Indian languages without showing English words', () => {
  const hiDict = getUiDictionaryForLanguage('hi');
  assert.equal(hiDict.dashboard, 'डैशबोर्ड');
  assert.equal(hiDict.supervisor_dashboard, 'साइट सुपरवाइज़र हब');
  assert.equal(/[A-Za-z]/.test(hiDict.dashboard), false);

  const sampleHeading = 'Click Photo with Location for Labour Attendance — Sachin Patil';
  for (const lang of ['hi', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'gu', 'pa', 'or', 'ur']) {
    const out = translateFullUiText(sampleHeading, lang);
    assert.equal(/[A-Za-z]/.test(out), false, `Expected zero English letters for lang=${lang}, got: ${out}`);
  }
});

test('Supabase 20 Employees (EMP001..EMP020) and 20 Labourers (LAB001..LAB020) match exact table records', () => {
  assert.equal(INITIAL_EMPLOYEES.length, 20);
  assert.equal(INITIAL_EMPLOYEES[0].user_id, 'EMP001');
  assert.equal(INITIAL_EMPLOYEES[0].name, 'Rohit Sharma');
  assert.equal(INITIAL_EMPLOYEES[19].user_id, 'EMP020');
  assert.equal(INITIAL_EMPLOYEES[19].name, 'Tanvi Sawant');

  assert.equal(INITIAL_LABOURS.length, 20);
  assert.equal(INITIAL_LABOURS[0].user_id, 'LAB001');
  assert.equal(INITIAL_LABOURS[0].name, 'Ramesh Patil');
  assert.equal(INITIAL_LABOURS[0].work_email, 'ramesh.patil@buildmate.ac.in');
  assert.equal(INITIAL_LABOURS[0].phone, '9000000101');
  assert.equal(INITIAL_LABOURS[1].user_id, 'LAB002');
  assert.equal(INITIAL_LABOURS[1].name, 'Salim Shaikh');
  assert.equal(INITIAL_LABOURS[2].user_id, 'LAB003');
  assert.equal(INITIAL_LABOURS[2].name, 'Suresh Yadav');
  assert.equal(INITIAL_LABOURS[3].user_id, 'LAB004');
  assert.equal(INITIAL_LABOURS[3].name, 'Ganesh More');
  assert.equal(INITIAL_LABOURS[19].user_id, 'LAB020');
  assert.equal(INITIAL_LABOURS[19].name, 'Mahesh Patil');

  const labAuth = authenticateSixRoleCredentials({
    identifier: 'LAB001',
    password: 'BuildMate@LAB001',
  });
  assert.equal(labAuth.status, 'AUTHORIZED');
  assert.equal(labAuth.role, 'Labourer');
  assert.equal(labAuth.profile?.user_id, 'LAB001');
  assert.equal(labAuth.profile?.full_name, 'Ramesh Patil');
});

test('Workforce validation enforces @buildmate.ac.in domain on official email addresses', () => {
  assert.equal(isValidBuildMateEmail('prasad.gaikwad@buildmate.ac.in'), true);
  assert.equal(isValidBuildMateEmail('manasi.pawar@buildmate.ac.in'), true);
  assert.equal(isValidBuildMateEmail('ADMIN@BUILDMATE.AC.IN'), true);
  assert.equal(isValidBuildMateEmail('user@buildforce.in'), false);
  assert.equal(isValidBuildMateEmail('user@gmail.com'), false);
  assert.equal(isValidBuildMateEmail('buildmate.ac.in'), false);

  const validRes = validateWorkEmail('prasad.gaikwad@buildmate.ac.in');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.error, undefined);

  const invalidRes = validateWorkEmail('prasad@gmail.com');
  assert.equal(invalidRes.valid, false);
  assert.match(invalidRes.error || '', /@buildmate\.ac\.in/);
});

test('Workforce validation enforces exactly 10 numeric digits for phone numbers', () => {
  assert.equal(isValid10DigitPhone('8555555555'), true);
  assert.equal(isValid10DigitPhone('9000000021'), true);
  assert.equal(isValid10DigitPhone('+91 85555 55555'), true);
  assert.equal(isValid10DigitPhone('85555-55555'), true);
  assert.equal(isValid10DigitPhone('12345'), false);
  assert.equal(isValid10DigitPhone('9876543210123'), false);
  assert.equal(isValid10DigitPhone('abcdefghij'), false);

  assert.equal(sanitize10DigitPhone('+91 85555 55555'), '8555555555');
  assert.equal(sanitize10DigitPhone('08555555555'), '8555555555');

  const validPhoneRes = validate10DigitPhone('8555555555');
  assert.equal(validPhoneRes.valid, true);

  const invalidPhoneRes = validate10DigitPhone('855555');
  assert.equal(invalidPhoneRes.valid, false);
  assert.match(invalidPhoneRes.error || '', /10 numeric digits/i);
});

test('HRM005 Prasad Gaikwad is registered in seed data and authenticates with BuildMate@HRM005', () => {
  const hrm005Auth = authenticateSixRoleCredentials({
    identifier: 'prasad.gaikwad@buildmate.ac.in',
    password: 'BuildMate@HRM005',
  });
  assert.equal(hrm005Auth.status, 'AUTHORIZED');
  assert.equal(hrm005Auth.role, 'HR Manager');
  assert.equal(hrm005Auth.profile?.user_id, 'HRM005');
  assert.equal(hrm005Auth.profile?.full_name, 'Prasad Gaikwad');
  assert.equal(hrm005Auth.profile?.phone, '8555555555');

  const byUserId = authenticateSixRoleCredentials({
    identifier: 'HRM005',
    password: 'BuildMate@HRM005',
  });
  assert.equal(byUserId.status, 'AUTHORIZED');
  assert.equal(byUserId.profile?.full_name, 'Prasad Gaikwad');
});

test('Total Workforce Roster calculates HR + Accountants + Site Supervisors + Labour accurately', () => {
  const stats = computeWorkforceStats({
    employees: INITIAL_EMPLOYEES,
    labours: INITIAL_LABOURS,
    hrManagers: INITIAL_HR_MANAGERS,
    accountants: INITIAL_ACCOUNTANTS,
    siteSupervisors: INITIAL_SITE_SUPERVISORS,
    projects: INITIAL_PROJECTS,
    sites: INITIAL_SITES,
    empAssignments: [],
    labourAssignments: [],
    attendance: [],
    tasks: [],
    leaves: [],
    salaries: [],
    materials: [],
    targetDate: '2026-10-22',
  });

  const expectedHr = INITIAL_HR_MANAGERS.filter((h) => h.is_active !== false).length;
  const expectedAcct = INITIAL_ACCOUNTANTS.filter((a) => a.is_active !== false).length;
  const expectedSup = INITIAL_SITE_SUPERVISORS.filter((s) => s.is_active !== false).length;
  const expectedLab = INITIAL_LABOURS.filter((l) => l.is_active !== false).length;
  const expectedTotal = expectedHr + expectedAcct + expectedSup + expectedLab;

  assert.equal(stats.hrCount, expectedHr);
  assert.equal(stats.accountantCount, expectedAcct);
  assert.equal(stats.supervisorCount, expectedSup);
  assert.equal(stats.labourCount, expectedLab);
  assert.equal(stats.totalWorkforce, expectedTotal);
  assert.equal(stats.totalWorkforce, stats.hrCount + stats.accountantCount + stats.supervisorCount + stats.labourCount);
});

test('Full-app translation engine strictly preserves English email addresses in original Latin characters', () => {
  const testEmails = [
    'arjun.deshmukh@buildmate.ac.in',
    'admin@buildmate.com',
    'contact@punebuildsupplies.in',
    'prasad.gaikwad@buildmate.ac.in',
  ];

  for (const email of testEmails) {
    // Isolated email should never be modified
    assert.equal(translateFullUiText(email, 'hi'), email);
    assert.equal(translateFullUiText(email, 'mr'), email);
    assert.equal(translateFullUiText(email, 'ta'), email);
    assert.equal(translateFullUiText(email, 'gu'), email);

    // Email embedded in UI sentence should preserve original email unchanged
    const sentence = `Work Email: ${email} registered for account`;
    const translatedHi = translateFullUiText(sentence, 'hi');
    assert.match(translatedHi, new RegExp(email.replace('.', '\\.')));

    const translatedMr = translateFullUiText(sentence, 'mr');
    assert.match(translatedMr, new RegExp(email.replace('.', '\\.')));
  }
});

test('Supabase projects table reflects exact 3 Pune projects from image_821136ab.png', () => {
  assert.equal(INITIAL_PROJECTS.length, 3);
  assert.equal(INITIAL_PROJECTS[0].project_name, 'Green Heights Residential Tower');
  assert.equal(INITIAL_PROJECTS[0].location, 'Baner, Pune');
  assert.equal(INITIAL_PROJECTS[0].budget, 12500000);
  assert.equal(INITIAL_PROJECTS[0].status, 'ACTIVE');

  assert.equal(INITIAL_PROJECTS[1].project_name, 'Riverside Commercial Complex');
  assert.equal(INITIAL_PROJECTS[1].location, 'Kharadi, Pune');
  assert.equal(INITIAL_PROJECTS[1].budget, 18500000);
  assert.equal(INITIAL_PROJECTS[1].status, 'ACTIVE');

  assert.equal(INITIAL_PROJECTS[2].project_name, 'Community Health Centre');
  assert.equal(INITIAL_PROJECTS[2].location, 'Hadapsar, Pune');
  assert.equal(INITIAL_PROJECTS[2].budget, 7200000);
  assert.equal(INITIAL_PROJECTS[2].status, 'COMPLETED');
});

test('Supabase suppliers table reflects exact 3 Pune suppliers from image_3db4020b.png', () => {
  assert.equal(INITIAL_SUPPLIERS.length, 3);
  assert.equal(INITIAL_SUPPLIERS[0].supplier_name, 'Pune Build Supplies');
  assert.equal(INITIAL_SUPPLIERS[0].phone, '9876542001');
  assert.equal(INITIAL_SUPPLIERS[0].address, 'Market Yard, Pune');

  assert.equal(INITIAL_SUPPLIERS[1].supplier_name, 'Western Steel Traders');
  assert.equal(INITIAL_SUPPLIERS[1].phone, '9876542002');
  assert.equal(INITIAL_SUPPLIERS[1].address, 'Bhosari MIDC, Pune');

  assert.equal(INITIAL_SUPPLIERS[2].supplier_name, 'ElectroPro Distributors');
  assert.equal(INITIAL_SUPPLIERS[2].phone, '9876542003');
  assert.equal(INITIAL_SUPPLIERS[2].address, 'Shivajinagar, Pune');
});

test('normalizeSupplierRow preserves exact delivery_status, delivery_address, and project_id from public.suppliers', () => {
  const s1 = normalizeSupplierRow({
    supplier_id: 1,
    supplier_name: 'Pune Build Supplies',
    phone: '9876542001',
    address: 'Market Yard, Pune',
    supplied_materials: 'UltraTech OPC 53 Cement',
    quoted_rate: 410,
    quoted_qty: 1200,
    rate_unit: 'Bag (50kg)',
    delivery_status: 'ON_SCHEDULE',
    delivery_address: 'Baner, Pune',
    project_id: 1,
    status: 'ACTIVE',
  });
  assert.equal(s1.delivery_status, 'ON_SCHEDULE');
  assert.equal(s1.delivery_address, 'Baner, Pune');
  assert.equal(s1.project_id, 1);
  assert.equal(s1.quoted_rate, 410);
  assert.equal(s1.quoted_qty, 1200);
  assert.equal(s1.total_quotation_amount, 492000);

  const s3 = normalizeSupplierRow({
    supplier_id: 3,
    supplier_name: 'ElectroPro Distributors',
    phone: '9876542003',
    address: 'Shivajinagar, Pune',
    quoted_rate: 1850,
    quoted_qty: 150,
    rate_unit: 'Coil (100m)',
    delivery_status: 'PENDING_DELIVERY',
    delivery_address: 'Hadapsar, Pune',
    project_id: 3,
  });
  assert.equal(s3.delivery_status, 'PENDING_DELIVERY');
  assert.equal(s3.delivery_address, 'Hadapsar, Pune');
  assert.equal(s3.project_id, 3);
});

test('Materials & Requests role tabs and Delivered Material bucket follow strict role access rules', () => {
  assert.deepEqual(getAllowedMaterialTabsForRole('Admin'), [
    'materials',
    'requests',
    'suppliers',
    'usage',
  ]);
  assert.deepEqual(getAllowedMaterialTabsForRole('Accountant'), ['materials', 'usage']);
  assert.deepEqual(getAllowedMaterialTabsForRole('Site Supervisor'), ['requests', 'usage']);
  assert.deepEqual(getAllowedMaterialTabsForRole('HR Manager'), []);
  assert.deepEqual(getAllowedMaterialTabsForRole('Employee'), []);
  assert.deepEqual(getAllowedMaterialTabsForRole('Labourer'), []);

  assert.equal(canAccessModule('Accountant', 'materials'), true);
  assert.equal(canAccessModule('Accountant', 'suppliers'), false);
  assert.equal(getRolePermissions('Site Supervisor').canRequestMaterials, true);
  assert.equal(getRolePermissions('Site Supervisor').canManageMaterials, false);
  assert.equal(getRolePermissions('Site Supervisor').canApproveMaterialRequests, false);
  assert.equal(ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED, 'Material Delivered images');
});

test('Leave submission is restricted to Site Supervisor, Labourer, and Employee; approval restricted to HR Manager and Admin', () => {
  assert.equal(getRolePermissions('Site Supervisor').canSubmitLeaves, true);
  assert.equal(getRolePermissions('Labourer').canSubmitLeaves, true);
  assert.equal(getRolePermissions('Employee').canSubmitLeaves, true);
  assert.equal(getRolePermissions('Admin').canSubmitLeaves, false);
  assert.equal(getRolePermissions('HR Manager').canSubmitLeaves, false);
  assert.equal(getRolePermissions('Accountant').canSubmitLeaves, false);

  assert.equal(getRolePermissions('Admin').canApproveLeaves, true);
  assert.equal(getRolePermissions('HR Manager').canApproveLeaves, true);
  assert.equal(getRolePermissions('Site Supervisor').canApproveLeaves, false);
  assert.equal(getRolePermissions('Labourer').canApproveLeaves, false);
  assert.equal(getRolePermissions('Employee').canApproveLeaves, false);
});

test('normalizeLabourerRow maps skill_or_trade and guarantees string user_id (not raw numbers)', () => {
  const lab = normalizeLabourerRow({
    labour_id: 13,
    user_id: 'LAB013',
    full_name: 'Deepak Kumar',
    phone: '9100000013',
    skill_or_trade: 'Carpenter',
    wage_rate: 850,
    is_active: true,
  });
  assert.equal(lab.user_id, 'LAB013');
  assert.equal(lab.skill, 'Carpenter');
  assert.equal(lab.skill_or_trade, 'Carpenter');
  assert.equal(lab.name, 'Deepak Kumar');
});

test('Controlled CSV Import is disabled across all roles and Employees module is removed from Site Supervisor role', () => {
  const allRoles = [
    'Admin',
    'HR Manager',
    'Site Supervisor',
    'Accountant',
    'Employee',
    'Labourer',
  ] as const;

  for (const role of allRoles) {
    assert.equal(
      getRolePermissions(role).canImportCsv,
      false,
      `Expected canImportCsv=false for role ${role}`
    );
  }

  assert.equal(canAccessModule('Site Supervisor', 'employees'), false);
  assert.equal(canAccessModule('Site Supervisor', 'dashboard'), true);
  assert.equal(canAccessModule('Site Supervisor', 'labours'), true);
  assert.equal(canAccessModule('Site Supervisor', 'projects'), true);
  assert.equal(canAccessModule('Site Supervisor', 'sites'), true);
});

test('resolveSupervisorAssignedScope returns only assigned projects, site labour count, and assigned employees for Site Supervisor', () => {
  assert.equal(normalizeProjectId('PRJ001'), 1);
  assert.equal(normalizeProjectId('PRJ002'), 2);
  assert.equal(normalizeProjectId('PRJ003'), 3);
  assert.equal(normalizeProjectId(2), 2);

  // Simulate live Supabase projects/sites with PRJ001..PRJ003 and numeric assignments 1..3
  const scopeSachin = resolveSupervisorAssignedScope({
    currentUser: {
      user_id: 'SUP001',
      email: 'sachin.patil@buildmate.ac.in',
      full_name: 'Sachin Patil',
    },
    siteSupervisors: INITIAL_SITE_SUPERVISORS,
    sites: [
      {
        site_id: 1,
        project_id: 'PRJ001' as unknown as number,
        supervisor_id: 1,
        site_name: 'Green Heights Main Site',
        location: 'Baner, Pune',
        status: 'ACTIVE',
        created_at: '2026-01-01',
      },
      {
        site_id: 2,
        project_id: 'PRJ002' as unknown as number,
        supervisor_id: 2,
        site_name: 'Riverside East Site',
        location: 'Kharadi, Pune',
        status: 'ACTIVE',
        created_at: '2026-01-01',
      },
      {
        site_id: 3,
        project_id: 'PRJ003' as unknown as number,
        supervisor_id: 1,
        site_name: 'Health Centre Site',
        location: 'Hadapsar, Pune',
        status: 'COMPLETED',
        created_at: '2026-01-01',
      },
    ],
    projects: INITIAL_PROJECTS,
    employees: INITIAL_EMPLOYEES,
    labours: INITIAL_LABOURS,
    empAssignments: [
      { assignment_id: 1, employee_id: 1, project_id: 1, start_date: '2026-01-10', status: 'ACTIVE', created_at: '2026-01-10' },
      { assignment_id: 2, employee_id: 2, project_id: 2, start_date: '2026-02-05', status: 'ACTIVE', created_at: '2026-02-05' },
      { assignment_id: 3, employee_id: 3, project_id: 3, start_date: '2025-05-05', status: 'COMPLETED', created_at: '2025-05-05' },
    ],
    labourAssignments: [
      { assignment_id: 1, labour_id: 1, project_id: 1, start_date: '2026-01-12', status: 'ACTIVE', created_at: '2026-01-12' },
      { assignment_id: 2, labour_id: 2, project_id: 2, start_date: '2026-02-08', status: 'ACTIVE', created_at: '2026-02-08' },
      { assignment_id: 3, labour_id: 3, project_id: 1, start_date: '2026-01-15', status: 'ACTIVE', created_at: '2026-01-15' },
    ],
  });

  // Sachin Patil (SUP001, supervisor_id=1) is assigned ONLY to Site 1 & Site 3 (Projects 1 & 3), NOT Site 2 (Riverside East Site)
  assert.equal(scopeSachin.assignedSites.length, 2);
  assert.deepEqual(
    scopeSachin.assignedSites.map((s) => s.site_name),
    ['Green Heights Main Site', 'Health Centre Site']
  );
  assert.equal(scopeSachin.assignedProjects.length, 2);
  assert.deepEqual(
    scopeSachin.assignedProjects.map((p) => p.project_name),
    ['Green Heights Residential Tower', 'Community Health Centre']
  );

  // Site Labour Count = 2 (LAB001 Ramesh Patil & LAB003 Suresh Yadav on Project 1; excludes LAB002 on Project 2)
  assert.equal(scopeSachin.siteLabourCount, 2);
  assert.deepEqual(
    scopeSachin.assignedLabours.map((l) => l.userIdCode),
    ['LAB001', 'LAB003']
  );

  // Assigned Employees = 2 (EMP001 Rohit Sharma on Project 1 & EMP003 Rohan Deshmukh on Project 3; excludes EMP002 on Project 2)
  assert.equal(scopeSachin.assignedEmployeeCount, 2);
  assert.deepEqual(
    scopeSachin.assignedEmployees.map((e) => e.userIdCode),
    ['EMP001', 'EMP003']
  );
});




