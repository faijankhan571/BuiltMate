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
} from './workforceLogic.ts';
import {
  enqueueOfflineMutation,
  getPendingOfflineMutations,
  removeOfflineMutation,
  clearOfflineMutations,
} from './offlineSyncDb.ts';
import { INITIAL_TASKS, INITIAL_SITES } from '../data/seedData.ts';
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
    payload: {
      record: {
        site_id: 1,
        labour_id: 101,
        employee_id: null,
        attendance_date: '2026-10-25',
        status: 'PRESENT',
        hours_worked: 8,
        overtime_hours: 0,
      },
      allowOverwrite: true,
    },
  });
  const item2 = await enqueueOfflineMutation({
    type: 'UPDATE_TASK',
    payload: {
      taskId: 1,
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
  const site1 = INITIAL_SITES[0]; // 12.9698, 77.7500, radius 250m
  const geoCfg = resolveSiteGeofenceConfig(site1);
  assert.equal(geoCfg.centerLat, 12.9698);
  assert.equal(geoCfg.centerLng, 77.75);
  assert.equal(geoCfg.radiusMeters, 250);

  // 1. Exact center -> 0m -> INSIDE_GEOFENCE
  const exactRes = verifyCoordinatesAgainstSiteGeofence({
    userLat: 12.9698,
    userLng: 77.75,
    site: site1,
  });
  assert.equal(exactRes.isWithinBoundary, true);
  assert.equal(exactRes.distanceMeters, 0);
  assert.equal(exactRes.status, 'INSIDE_GEOFENCE');

  // 2. ~30m away -> INSIDE_GEOFENCE
  const nearRes = verifyCoordinatesAgainstSiteGeofence({
    userLat: 12.97,
    userLng: 77.7502,
    site: site1,
  });
  assert.equal(nearRes.isWithinBoundary, true);
  assert.equal(nearRes.distanceMeters <= 250, true);
  assert.equal(nearRes.status, 'INSIDE_GEOFENCE');

  // 3. ~1.8km away -> OUTSIDE_GEOFENCE -> blocked
  const farRes = verifyCoordinatesAgainstSiteGeofence({
    userLat: 12.9833,
    userLng: 77.7625,
    site: site1,
  });
  assert.equal(farRes.isWithinBoundary, false);
  assert.equal(farRes.distanceMeters > 250, true);
  assert.equal(farRes.status, 'OUTSIDE_GEOFENCE');
  assert.match(farRes.message, /Geofence Boundary Violation/);

  // 4. Invalid coordinates -> INVALID_COORDINATES -> blocked
  const invalidRes = verifyCoordinatesAgainstSiteGeofence({
    userLat: 120,
    userLng: 77.75,
    site: site1,
  });
  assert.equal(invalidRes.isWithinBoundary, false);
  assert.equal(invalidRes.status, 'INVALID_COORDINATES');

  assert.equal(calculateHaversineDistanceMeters(12.9698, 77.75, 12.9698, 77.75), 0);
});


