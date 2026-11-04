import React from 'react';
import {
  Users,
  CalendarCheck,
  Building2,
  Wallet,
  Plus,
  Sparkles,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Package,
  CheckSquare,
  Briefcase,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { computeWorkforceStats, filterTasksForRole, ModuleId } from '../utils/workforceLogic';
import { TaskStatus } from '../types';

interface DashboardViewProps {
  onNavigate: (module: ModuleId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    currentUser,
    employees,
    labours,
    projects,
    sites,
    siteSupervisors,
    empAssignments,
    labourAssignments,
    attendance,
    tasks,
    leaves,
    salaries,
    materials,
    materialRequests,
    currentRole,
    updateTask,
    updateLeaveStatus,
    updateMaterialRequestStatus,
  } = useWorkforce();

  const todayStr = '2026-10-22';
  const stats = computeWorkforceStats({
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
    materialRequests,
    targetDate: todayStr,
  });

  const displayName = currentUser?.full_name || currentUser?.name || currentRole;
  const loggedInEmployee =
    employees.find(
      (e) =>
        (currentUser?.user_id && e.user_id === currentUser.user_id) ||
        (currentUser?.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.name && e.name.toLowerCase() === currentUser.name.toLowerCase())
    ) || employees[0];

  const loggedInLabourer =
    labours.find(
      (l) =>
        (currentUser?.user_id && l.user_id === currentUser.user_id) ||
        (currentUser?.email &&
          l.email &&
          l.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.name && l.name.toLowerCase() === currentUser.name.toLowerCase())
    ) || labours[0];

  const employeeOfficeTasks = filterTasksForRole(
    tasks,
    'Employee',
    loggedInEmployee?.employee_id
  );

  const labourerAssignedTasks = filterTasksForRole(
    tasks,
    'Labourer',
    loggedInLabourer?.labour_id
  );

  const canApproveLeave = currentRole === 'Admin' || currentRole === 'HR Manager';
  const canApproveMaterial = currentRole === 'Admin' || currentRole === 'HR Manager';
  const pendingLeaveItems = leaves.filter((l) => l.status === 'PENDING');
  const pendingMaterialItems = materialRequests.filter((r) => r.status === 'PENDING');
  const todayAttendanceRows = attendance.filter((a) => a.attendance_date === todayStr);

  if (currentRole === 'Labourer') {
    const myAttendance = attendance.filter(
      (a) => a.labour_id === loggedInLabourer?.labour_id
    );
    const mySalary = salaries.find(
      (s) => s.labour_id === loggedInLabourer?.labour_id
    );
    const assignedSite = sites.find((s) => s.site_id === (loggedInLabourer?.site_id || 1));
    const completedAssignedCount = labourerAssignedTasks.filter(
      (t) => t.status === 'COMPLETED'
    ).length;

    return (
      <div data-testid="labourer-dashboard-view" className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                Labourer Field Workspace — {displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                {currentRole} · Assigned Site &amp; Tasks
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Logged in as <strong className="text-slate-900">{displayName}</strong> (
              {loggedInLabourer?.skill || 'Skilled Mason'} · Daily Rate:{' '}
              <strong className="font-mono text-slate-900">
                INR {(loggedInLabourer?.daily_rate || loggedInLabourer?.wage_rate || 950).toLocaleString('en-IN')}/day
              </strong>
              ) · Tasks assigned by <strong className="text-blue-700">HR Manager</strong>,{' '}
              <strong className="text-blue-700">Admin</strong>, or{' '}
              <strong className="text-blue-700">Site Supervisor</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>My Assigned Tasks ({labourerAssignedTasks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark Attendance (Selfie &amp; Location)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('salary')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              <span>My Salary</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('leaves')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Leave Requests</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sites')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Assigned Site</span>
            </button>
          </div>
        </div>

        {/* Labourer KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              My Assigned Tasks (HR / Admin / Supervisor)
            </p>
            <p className="font-mono text-3xl font-bold text-slate-900 mt-2">
              {labourerAssignedTasks.length}
            </p>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              <strong className="font-mono text-emerald-700">{completedAssignedCount}</strong> Completed ·{' '}
              <strong className="font-mono text-blue-700">
                {labourerAssignedTasks.length - completedAssignedCount}
              </strong>{' '}
              Active
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              My Logged Attendance (Selfie + GPS)
            </p>
            <p className="font-mono text-3xl font-bold text-slate-900 mt-2">
              {myAttendance.length} Days
            </p>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              Bucket:{' '}
              <strong className="font-mono text-emerald-700">attendance-selfies</strong> ·{' '}
              {loggedInLabourer?.status || 'ACTIVE'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              My Salary ({mySalary?.month || '2026-10'})
            </p>
            <p className="font-mono text-2xl font-bold text-slate-900 mt-2">
              INR {(mySalary?.net_salary || 24640).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              Daily Wage:{' '}
              <strong className="font-mono text-slate-900">
                INR {(loggedInLabourer?.daily_rate || 950).toLocaleString('en-IN')}/day
              </strong>{' '}
              · <strong className="font-mono text-emerald-700">{mySalary?.payment_status || 'PAID'}</strong>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              My Assigned Construction Site
            </p>
            <p className="font-display text-base font-bold text-slate-900 mt-2 truncate">
              {assignedSite?.site_name || 'Skyline Residency Phase-II — Tower A'}
            </p>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 truncate">
              Location:{' '}
              <strong className="text-slate-800">
                {assignedSite?.location || 'Whitefield, Bengaluru'}
              </strong>
            </p>
          </div>
        </div>

        {/* Assigned Tasks by HR Manager, Admin & Site Supervisor */}
        <div
          data-testid="labourer-assigned-tasks-card"
          className="bg-white rounded-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                My Assigned Tasks (Assigned by HR Manager, Admin &amp; Site Supervisor)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing only tasks assigned to {displayName} by HR Manager, Admin, or Site Supervisor
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Open Full Assigned Tasks Board →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Assigned Task Title &amp; Description</th>
                  <th className="py-3 px-4">Construction Site</th>
                  <th className="py-3 px-4">Assigned By (HR / Admin / Supervisor)</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {labourerAssignedTasks.map((task) => {
                  const taskSite = sites.find((s) => s.site_id === task.site_id);
                  return (
                    <tr key={task.task_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">#{task.task_id}</span>
                          <span className="font-semibold text-slate-900">{task.task_name}</span>
                          {task.priority && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">
                          {taskSite?.site_name || 'Skyline Residency — Tower A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">
                          {task.assigned_by_name || `${task.assigned_by_role || 'Site Supervisor'}`}
                        </span>
                        <div className="text-[10px] font-mono text-emerald-700">
                          Assigned by {task.assigned_by_role || 'Site Supervisor'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {task.end_date}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Status for ${task.task_name}`}
                          value={task.status}
                          onChange={(e) =>
                            updateTask(task.task_id, { status: e.target.value as TaskStatus })
                          }
                          className={`px-2.5 py-1 rounded border font-mono text-[11px] font-semibold cursor-pointer ${
                            task.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="NOT_STARTED">NOT_STARTED</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="DELAYED">DELAYED</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (currentRole === 'Employee') {
    const myAttendance = attendance.filter(
      (a) => a.employee_id === loggedInEmployee?.employee_id
    );
    const mySalary = salaries.find(
      (s) => s.employee_id === loggedInEmployee?.employee_id
    );
    const completedOfficeCount = employeeOfficeTasks.filter(
      (t) => t.status === 'COMPLETED'
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                Employee Office Workspace — {displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                {currentRole} · Office Tasks Only
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Logged in as <strong className="text-slate-900">{displayName}</strong> (
              {loggedInEmployee?.designation || 'Salaried Office Employee'}) · Office tasks assigned exclusively by{' '}
              <strong className="text-blue-700">HR Manager</strong> or{' '}
              <strong className="text-blue-700">Admin</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>My Office Tasks ({employeeOfficeTasks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark Attendance (Selfie &amp; Location)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('leaves')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Leave Requests</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('salary')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              <span>My Salary</span>
            </button>
          </div>
        </div>

        {/* Employee KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned Office Tasks (HR / Admin)
            </p>
            <p className="font-mono text-3xl font-bold text-slate-900 mt-2">
              {employeeOfficeTasks.length}
            </p>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              <strong className="font-mono text-emerald-700">{completedOfficeCount}</strong> Completed ·{' '}
              <strong className="font-mono text-blue-700">
                {employeeOfficeTasks.length - completedOfficeCount}
              </strong>{' '}
              Active
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              My Logged Attendance Days
            </p>
            <p className="font-mono text-3xl font-bold text-slate-900 mt-2">
              {myAttendance.length} Days
            </p>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              Status: <strong className="font-mono text-emerald-700">{loggedInEmployee?.status || 'ACTIVE'}</strong>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monthly Net Salary ({mySalary?.month || '2026-10'})
            </p>
            <p className="font-mono text-2xl font-bold text-slate-900 mt-2">
              INR {(mySalary?.net_salary || loggedInEmployee?.monthly_salary || 68000).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
              Disbursement:{' '}
              <strong className="font-mono text-emerald-700">
                {mySalary?.payment_status || 'PAID'}
              </strong>
            </p>
          </div>
        </div>

        {/* Office Tasks Assigned by HR Manager or Admin */}
        <div
          data-testid="employee-office-tasks-card"
          className="bg-white rounded-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Office Tasks Assigned by HR Manager &amp; Admin
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Salaried employees perform office, engineering documentation, and compliance tasks assigned by HR or Admin
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Open Full Office Tasks Board →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Office Task Title &amp; Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Assigned By (HR / Admin)</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {employeeOfficeTasks.map((task) => (
                  <tr key={task.task_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">#{task.task_id}</span>
                        <span className="font-semibold text-slate-900">{task.task_name}</span>
                        {task.priority && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-semibold">
                        OFFICE TASK
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">
                        {task.assigned_by_name || `${task.assigned_by_role || 'HR Manager'}`}
                      </span>
                      <div className="text-[10px] font-mono text-emerald-700">
                        Authorized by {task.assigned_by_role || 'HR Manager'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {task.end_date}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={`Status for ${task.task_name}`}
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.task_id, { status: e.target.value as TaskStatus })
                        }
                        className={`px-2.5 py-1 rounded border font-mono text-[11px] font-semibold cursor-pointer ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="NOT_STARTED">NOT_STARTED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="DELAYED">DELAYED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Construction Workforce &amp; Site Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              {displayName} ({currentRole})
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Logged in as <strong className="text-slate-900">{displayName}</strong> · Daily field attendance, site allocation, material requests, project progress, and payroll operations for{' '}
            <span className="font-mono font-medium text-slate-800">{todayStr}</span>
          </p>
        </div>

        {/* 4 Quick-Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Log Daily Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('labours')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Register Worker</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Assign to Site</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ai_insights')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>AI Workforce Analysis</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Dashboard Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Workforce Roster */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Workforce Roster
              </p>
              <p className="font-mono text-3xl font-bold text-slate-900 mt-2">
                {stats.totalWorkforce}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              <strong className="font-mono text-slate-900">{stats.totalLabours}</strong> Labourers ·{' '}
              <strong className="font-mono text-slate-900">{stats.totalEmployees}</strong> Salaried
            </span>
            <span className="font-mono text-emerald-700 font-medium">
              {stats.activeWorkforce} Active
            </span>
          </div>
        </div>

        {/* Card 2: Today's Site Attendance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Today&apos;s Site Attendance
              </p>
              <p className="font-mono text-3xl font-bold text-slate-900 mt-2">
                {stats.attendanceRate}%
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              <strong className="font-mono text-emerald-700">{stats.presentCount}</strong> Present ·{' '}
              <strong className="font-mono text-amber-700">{stats.halfDayCount}</strong> Half-Day
            </span>
            <span className="font-mono text-red-700 font-medium">
              {stats.absentCount} Absent
            </span>
          </div>
        </div>

        {/* Card 3: Active Projects & Sites */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Projects &amp; Sites
              </p>
              <p className="font-mono text-3xl font-bold text-slate-900 mt-2">
                {stats.activeProjects}{' '}
                <span className="text-base font-normal text-slate-400">
                  / {stats.activeSites} Sites
                </span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              <strong className="font-mono text-slate-900">{stats.completedTasks}</strong>/
              {stats.totalTasks} Tasks Done
            </span>
            <span className="font-mono text-amber-700 font-medium">
              {stats.delayedTasks} Delayed
            </span>
          </div>
        </div>

        {/* Card 4: Monthly Payroll & Approvals */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Monthly Payroll &amp; Approvals
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2">
                INR {(stats.totalPayrollDisbursed / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              <strong className="font-mono text-amber-700">{stats.pendingLeaves}</strong> Leaves ·{' '}
              <strong className="font-mono text-blue-700">{stats.pendingMaterialRequests}</strong> Mat. Req
            </span>
            <span className="font-mono text-slate-700 font-medium">
              {stats.unpaidPayrollCount} Unpaid
            </span>
          </div>
        </div>
      </div>

      {/* Main Middle Section: Construction Site Staffing & Execution Progress + Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Construction Site Staffing & Execution Progress */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Construction Site Staffing &amp; Execution Progress
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live project completion, site staffing allocation, attendance rate, and active task execution status
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Manage Projects &amp; Sites</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {sites.map((site) => {
                const project = projects.find((p) => p.project_id === site.project_id);
                const supervisor = siteSupervisors.find(
                  (s) => s.supervisor_id === site.supervisor_id
                );
                const siteTasks = tasks.filter((t) => t.site_id === site.site_id);
                const completedSiteTasks = siteTasks.filter((t) => t.status === 'COMPLETED').length;
                const delayedSiteTasks = siteTasks.filter((t) => t.status === 'DELAYED').length;
                const siteAttendance = todayAttendanceRows.filter(
                  (a) => a.site_id === site.site_id
                );
                const sitePresent = siteAttendance.filter(
                  (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
                ).length;

                const projEmps = empAssignments.filter(
                  (a) => a.project_id === site.project_id && a.status === 'ACTIVE'
                ).length;
                const projLabs = labourAssignments.filter(
                  (a) => a.project_id === site.project_id && a.status === 'ACTIVE'
                ).length;
                const allocatedCount = projEmps + projLabs;
                const siteAttRate =
                  siteAttendance.length > 0
                    ? Math.round((sitePresent / siteAttendance.length) * 100)
                    : 88;
                const progressPct =
                  siteTasks.length > 0
                    ? Math.round((completedSiteTasks / siteTasks.length) * 100)
                    : 50;

                return (
                  <div key={site.site_id} className="py-4 first:pt-2 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-semibold text-sm text-slate-900">
                            {site.site_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-mono font-medium rounded border ${
                              site.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {site.status}
                          </span>
                          <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-blue-50 text-blue-800 border border-blue-200">
                            Att: {siteAttRate}%
                          </span>
                          {delayedSiteTasks > 0 && (
                            <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-red-50 text-red-800 border border-red-200">
                              {delayedSiteTasks} Task Delayed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{project?.project_name || 'Project'}</span>
                          <span>·</span>
                          <span>Supervisor: {supervisor?.name || 'Unassigned'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="text-right">
                          <span className="text-slate-500 block text-[11px]">Present / Crew</span>
                          <span className="font-bold text-slate-900">
                            {sitePresent} / {allocatedCount} ({projEmps}E · {projLabs}L)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-[11px]">Site Tasks</span>
                          <span className="font-bold text-slate-900">
                            {completedSiteTasks}/{siteTasks.length} Done
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-[#1D4ED8] transition-all"
                          style={{ width: `${Math.max(15, progressPct)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-700 w-10 text-right">
                        {progressPct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Material Alert Bar inside Site Progress Card */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Material Stock Watch:{' '}
                <strong className="font-mono text-slate-900">{stats.lowStockCount}</strong> Low
                Stock,{' '}
                <strong className="font-mono text-red-700">{stats.outOfStockCount}</strong> Out of
                Stock
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('materials')}
              className="text-blue-700 font-semibold hover:underline cursor-pointer"
            >
              Inspect Material Inventory &amp; Requisitions →
            </button>
          </div>
        </div>

        {/* Right Column: Pending Material Requests & Pending Leave Approvals */}
        <div className="space-y-6">
          {/* Pending Material Requests from Site Supervisors */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-700" />
                  <span>Site Material Requests</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Supervisor material requisitions awaiting approval
                </p>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-blue-50 text-blue-800 border border-blue-200">
                {pendingMaterialItems.length}
              </span>
            </div>

            {pendingMaterialItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                No pending material requests from site supervisors.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingMaterialItems.slice(0, 3).map((req) => {
                  const site = sites.find((s) => s.site_id === req.site_id);
                  return (
                    <div
                      key={req.request_id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{req.material_name}</span>
                        <span className="font-mono text-[11px] text-blue-700">
                          {req.requested_qty} {req.unit}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px]">
                        {site?.site_name} · Est. INR {req.estimated_value.toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                        <span className="font-mono text-[11px] text-slate-500">
                          Req: {req.request_date}
                        </span>
                        {canApproveMaterial ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateMaterialRequestStatus(
                                  req.request_id,
                                  'APPROVED',
                                  req.requested_qty
                                )
                              }
                              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-medium cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateMaterialRequestStatus(req.request_id, 'REJECTED', 0)
                              }
                              className="px-2 py-1 rounded bg-white hover:bg-red-50 text-red-700 border border-red-200 font-medium cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Admin Approval Req.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Leave Requests Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Pending Leave Requests
                </h2>
                <p className="text-xs text-slate-500">Worker leave applications awaiting action</p>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-50 text-amber-800 border border-amber-200">
                {pendingLeaveItems.length}
              </span>
            </div>

            {pendingLeaveItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                All worker leave applications have been processed.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeaveItems.slice(0, 3).map((lv) => {
                  const worker = labours.find((l) => l.labour_id === lv.labour_id);
                  return (
                    <div
                      key={lv.leave_id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{worker?.name || `Labour #${lv.labour_id}`}</span>
                        <span className="font-mono text-[11px] text-amber-700">{lv.leave_type}</span>
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-1">{lv.reason}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                        <span className="font-mono text-[11px] text-slate-500">
                          {lv.from_date} → {lv.to_date}
                        </span>
                        {canApproveLeave ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateLeaveStatus(lv.leave_id, 'APPROVED')}
                              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-medium cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLeaveStatus(lv.leave_id, 'REJECTED')}
                              className="px-2 py-1 rounded bg-white hover:bg-red-50 text-red-700 border border-red-200 font-medium cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">HR Approval Req.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Table: Recent Field Attendance & Workforce Roster */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Recent Field Attendance &amp; Workforce Roster
            </h2>
            <p className="text-xs text-slate-500">
              Latest shift logs across active construction sites ({todayStr})
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer self-start sm:self-auto"
          >
            Open Full Attendance Register →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Worker Name</th>
                <th className="py-3 px-4">Category &amp; Skill / Designation</th>
                <th className="py-3 px-4">Assigned Site</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Hours</th>
                <th className="py-3 px-4">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {todayAttendanceRows.slice(0, 8).map((row) => {
                const emp = row.employee_id
                  ? employees.find((e) => e.employee_id === row.employee_id)
                  : null;
                const lab = row.labour_id
                  ? labours.find((l) => l.labour_id === row.labour_id)
                  : null;
                const site = sites.find((s) => s.site_id === row.site_id);

                const workerName = emp
                  ? emp.name
                  : lab
                  ? lab.name
                  : `Worker #${row.employee_id || row.labour_id}`;
                const roleLabel = emp
                  ? `Employee · ${emp.designation}`
                  : lab
                  ? `Labourer · ${lab.skill}`
                  : 'Field Staff';

                return (
                  <tr key={row.attendance_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-semibold text-slate-900">{workerName}</td>
                    <td className="py-3 px-4 text-slate-600">{roleLabel}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {site?.site_name || `Site #${row.site_id}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{row.attendance_date}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">{row.hours_worked} hrs</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                          row.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : row.status === 'HALF_DAY'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : row.status === 'LEAVE'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {row.status === 'PRESENT' && <CheckCircle2 className="w-3 h-3" />}
                        {row.status === 'HALF_DAY' && <Clock className="w-3 h-3" />}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
