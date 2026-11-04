import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FolderPlus,
  Eye,
  X,
  ShieldCheck,
  HeartPulse,
  UserX,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { EmployeeRecord, KycStatus, HealthStatus, TaskStatus } from '../types';
import {
  calculateWorkerAttendanceMetrics,
  filterTasksForRole,
  getRolePermissions,
  isEmployeeOfficeTask,
} from '../utils/workforceLogic';
import { ConfirmDialog } from './ConfirmDialog';

export const EmployeesView: React.FC = () => {
  const {
    currentUser,
    employees,
    projects,
    salaries,
    attendance,
    tasks,
    currentRole,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    assignEmployeeToProject,
    updateTask,
  } = useWorkforce();

  const perms = getRolePermissions(currentRole);
  const canEdit = perms.canEditEmployees;
  const displayName = currentUser?.full_name || currentUser?.name || currentRole;
  const loggedInEmployee =
    employees.find(
      (e) =>
        (currentUser?.user_id && e.user_id === currentUser.user_id) ||
        (currentUser?.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.name && e.name.toLowerCase() === currentUser.name.toLowerCase())
    ) || employees[0];
  const myOfficeTasks = filterTasksForRole(tasks, 'Employee', loggedInEmployee?.employee_id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    designation: '',
    department: 'Civil & Structural Engineering',
    joining_date: '2026-10-01',
    status: 'ACTIVE' as EmployeeRecord['status'],
    monthly_salary: 65000,
    kyc_status: 'VERIFIED' as KycStatus,
    kyc_document_ref: '',
    health_status: 'FIT_FOR_DUTY' as HealthStatus,
    health_checkup_date: '2026-10-01',
    medical_notes: '',
  });

  // Assign to Project Modal
  const [assignModalEmp, setAssignModalEmp] = useState<EmployeeRecord | null>(null);
  const [assignProjectId, setAssignProjectId] = useState<number>(projects[0]?.project_id || 1);
  const [assignStartDate, setAssignStartDate] = useState<string>('2026-10-22');

  // Profile Drawer / Modal
  const [profileEmp, setProfileEmp] = useState<EmployeeRecord | null>(null);

  // Confirm Delete
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.designation.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      designation: 'Civil Site Engineer',
      department: 'Civil & Structural Engineering',
      joining_date: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
      monthly_salary: 65000,
      kyc_status: 'PENDING_DOCS',
      kyc_document_ref: 'Aadhaar / PAN Pending',
      health_status: 'CHECKUP_DUE',
      health_checkup_date: new Date().toISOString().slice(0, 10),
      medical_notes: 'Pre-joining medical fitness evaluation scheduled.',
    });
    setModalOpen(true);
  };

  const openEditModal = (emp: EmployeeRecord) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      address: emp.address,
      designation: emp.designation,
      department: emp.department || 'Engineering & Operations',
      joining_date: emp.joining_date,
      status: emp.status,
      monthly_salary: emp.monthly_salary || 65000,
      kyc_status: emp.kyc_status || 'VERIFIED',
      kyc_document_ref: emp.kyc_document_ref || 'Aadhaar & PAN Verified',
      health_status: emp.health_status || 'FIT_FOR_DUTY',
      health_checkup_date: emp.health_checkup_date || '2026-10-01',
      medical_notes: emp.medical_notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (editingEmployee) {
      await updateEmployee(editingEmployee.employee_id, formData);
    } else {
      await addEmployee({ ...formData, user_id: null });
    }
    setModalOpen(false);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalEmp) return;
    await assignEmployeeToProject({
      employee_id: assignModalEmp.employee_id,
      project_id: assignProjectId,
      start_date: assignStartDate,
      end_date: null,
      status: 'ACTIVE',
    });
    setAssignModalEmp(null);
  };

  const handleRequestKyc = async (emp: EmployeeRecord) => {
    const nextStatus: KycStatus =
      emp.kyc_status === 'VERIFIED' ? 'PENDING_DOCS' : 'VERIFIED';
    await updateEmployee(emp.employee_id, {
      kyc_status: nextStatus,
      kyc_document_ref:
        nextStatus === 'VERIFIED'
          ? 'Aadhaar & PAN Verified by HR'
          : 'KYC Re-verification Requested',
    });
    if (profileEmp?.employee_id === emp.employee_id) {
      setProfileEmp({ ...emp, kyc_status: nextStatus });
    }
  };

  const handleToggleDeactivate = async (emp: EmployeeRecord) => {
    const nextStatus: EmployeeRecord['status'] =
      emp.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    await updateEmployee(emp.employee_id, { status: nextStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {currentRole === 'Employee'
              ? `Employee Profile & Office Workspace — ${displayName}`
              : 'Salaried Employee Management'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {currentRole === 'Employee' ? (
              <>
                Logged in as <strong className="text-slate-900">{displayName}</strong> · Salaried
                Employees perform <strong className="text-blue-700">Office Tasks only</strong>{' '}
                assigned by <strong className="text-slate-900">HR Manager</strong> or{' '}
                <strong className="text-slate-900">Admin</strong>
              </>
            ) : (
              <>
                Connected to <code className="font-mono text-blue-700">public.employees</code> ·
                Includes Office Task Assignments (from HR / Admin), Attendance Rate, KYC
                Verification &amp; Medical Fitness
              </>
            )}
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Register Salaried Employee</span>
          </button>
        )}
      </div>

      {/* Employee Role: Assigned Office Tasks Card (Assigned by HR Manager or Admin) */}
      {currentRole === 'Employee' && (
        <div
          data-testid="employee-role-office-tasks"
          className="bg-white rounded-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                My Office Tasks Assigned by HR Manager &amp; Admin ({myOfficeTasks.length})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Employees perform only office tasks and compliance work assigned by HR Manager or Admin
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-semibold self-start sm:self-auto">
              Scope: Office Tasks Only
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Office Task</th>
                  <th className="py-3 px-4">Task Type</th>
                  <th className="py-3 px-4">Assigned By (HR / Admin)</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {myOfficeTasks.map((task) => (
                  <tr key={task.task_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        #{task.task_id} · {task.task_name}
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
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search employees by name, email, or designation"
            placeholder="Search by employee name, email, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="emp-status-filter" className="text-xs font-medium text-slate-600">
            Status:
          </label>
          <select
            id="emp-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
          >
            <option value="ALL">All Statuses ({employees.length})</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Employee &amp; Contact</th>
                <th className="py-3 px-4">Designation &amp; Office Tasks (HR / Admin)</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4">KYC &amp; Health Checkup</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredEmployees.map((emp) => {
                const empOfficeTasks = tasks.filter(
                  (t) => t.employee_id === emp.employee_id && isEmployeeOfficeTask(t)
                );
                const metrics = calculateWorkerAttendanceMetrics(attendance, {
                  employee_id: emp.employee_id,
                });
                const kycStatus = emp.kyc_status || 'VERIFIED';
                const healthStatus = emp.health_status || 'FIT_FOR_DUTY';

                return (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                      #{emp.employee_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{emp.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        {emp.email} · {emp.phone}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {emp.designation} · <span className="text-slate-500">{emp.department || 'Office'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {empOfficeTasks.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">No office tasks assigned</span>
                        ) : (
                          empOfficeTasks.map((t) => (
                            <span
                              key={t.task_id}
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-medium"
                            >
                              Office: {t.task_name} (By {t.assigned_by_role || 'HR/Admin'})
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {metrics.attendanceRate}%
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ({metrics.presentDays}P / {metrics.halfDays}H)
                        </span>
                      </div>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-sm overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-600"
                          style={{ width: `${metrics.attendanceRate}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border w-fit ${
                            kycStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          KYC: {kycStatus}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border w-fit ${
                            healthStatus === 'FIT_FOR_DUTY'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <HeartPulse className="w-3 h-3" />
                          {healthStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                          emp.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : emp.status === 'ON_LEAVE'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="View Employee Profile, KYC & Health"
                          onClick={() => setProfileEmp(emp)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              title="Assign to Project"
                              onClick={() => {
                                setAssignModalEmp(emp);
                                setAssignProjectId(projects[0]?.project_id || 1);
                              }}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-700 cursor-pointer"
                            >
                              <FolderPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Edit Employee"
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title={
                                emp.status === 'INACTIVE'
                                  ? 'Reactivate Employee'
                                  : 'Soft-Deactivate Employee'
                              }
                              onClick={() => handleToggleDeactivate(emp)}
                              className="p-1.5 rounded hover:bg-amber-50 text-amber-700 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete Employee"
                              onClick={() => setDeleteTarget(emp)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingEmployee ? 'Edit Employee Record' : 'Register New Salaried Employee'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Base Salary (INR)</label>
                  <input
                    type="number"
                    value={formData.monthly_salary}
                    onChange={(e) =>
                      setFormData({ ...formData, monthly_salary: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KYC Status</label>
                  <select
                    value={formData.kyc_status}
                    onChange={(e) =>
                      setFormData({ ...formData, kyc_status: e.target.value as KycStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="PENDING_DOCS">PENDING_DOCS</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Health Checkup Status</label>
                  <select
                    value={formData.health_status}
                    onChange={(e) =>
                      setFormData({ ...formData, health_status: e.target.value as HealthStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="FIT_FOR_DUTY">FIT_FOR_DUTY</option>
                    <option value="CHECKUP_DUE">CHECKUP_DUE</option>
                    <option value="RESTRICTED_LIGHT_DUTY">RESTRICTED_LIGHT_DUTY</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as EmployeeRecord['status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KYC Document Reference</label>
                  <input
                    type="text"
                    value={formData.kyc_document_ref}
                    onChange={(e) => setFormData({ ...formData, kyc_document_ref: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              {perms.canViewMedicalNotes && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confidential Health / Medical Notes (Admin &amp; HR Only)
                  </label>
                  <input
                    type="text"
                    value={formData.medical_notes}
                    onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  {editingEmployee ? 'Save Changes' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employee to Project Modal */}
      {assignModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Assign {assignModalEmp.name} to Construction Project
            </h3>
            <form onSubmit={handleAssignSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Project</label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name} ({p.location})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignment Start Date</label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAssignModalEmp(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Employee Profile Modal with KYC, Health Checkup, Attendance Rate & Role-Guarded Salary */}
      {profileEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {profileEmp.name} (#{profileEmp.employee_id})
                </h3>
                <p className="text-slate-500">
                  {profileEmp.designation} · {profileEmp.department || 'Engineering'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileEmp(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const metrics = calculateWorkerAttendanceMetrics(attendance, {
                employee_id: profileEmp.employee_id,
              });
              const empTasks = tasks.filter(
                (t) => t.employee_id === profileEmp.employee_id && isEmployeeOfficeTask(t)
              );
              return (
                <>
                  {/* Contact & Attendance Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 block">Email</span>
                      <strong className="text-slate-900">{profileEmp.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phone</span>
                      <strong className="text-slate-900">{profileEmp.phone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Attendance Rate</span>
                      <strong className="font-mono text-emerald-700">
                        {metrics.attendanceRate}% ({metrics.effectiveWorkedDays} days)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Hours Logged</span>
                      <strong className="font-mono text-slate-900">
                        {metrics.totalHours} hrs ({metrics.overtimeHours} OT)
                      </strong>
                    </div>
                  </div>

                  {/* KYC Verification & Health Checkup Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-blue-700" />
                          KYC Verification
                        </span>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {profileEmp.kyc_status || 'VERIFIED'}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Ref: {profileEmp.kyc_document_ref || 'Aadhaar & PAN Verified'}
                      </p>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRequestKyc(profileEmp)}
                          className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold border border-blue-200 cursor-pointer"
                        >
                          {profileEmp.kyc_status === 'VERIFIED'
                            ? 'Request KYC Re-Verification'
                            : 'Mark KYC Verified'}
                        </button>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <HeartPulse className="w-4 h-4 text-emerald-700" />
                          Health Checkup Status
                        </span>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {profileEmp.health_status || 'FIT_FOR_DUTY'}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Checkup Date: <span className="font-mono">{profileEmp.health_checkup_date || '2026-10-01'}</span>
                      </p>
                      {perms.canViewMedicalNotes ? (
                        <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                          <strong>Medical Notes:</strong>{' '}
                          {profileEmp.medical_notes || 'Cleared for all high-elevation and site duties.'}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Detailed medical notes restricted to HR/Admin.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Assigned Office Tasks (HR / Admin) */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">
                      Assigned Office Tasks by HR Manager / Admin ({empTasks.length})
                    </h4>
                    {empTasks.length === 0 ? (
                      <p className="text-slate-500">No office tasks assigned by HR or Admin.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {empTasks.map((t) => (
                          <div
                            key={t.task_id}
                            className="flex items-center justify-between p-2 rounded border border-slate-200"
                          >
                            <div>
                              <span className="font-medium text-slate-900 block">
                                {t.task_name}
                              </span>
                              <span className="text-[11px] text-blue-700">
                                Assigned by: {t.assigned_by_name || t.assigned_by_role || 'HR Manager'}
                              </span>
                            </div>
                            <span className="font-mono text-[11px]">{t.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Role-Guarded Salary History */}
                  {perms.canViewSalary ? (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Salary &amp; Payroll History</h4>
                      <div className="space-y-1.5">
                        {salaries
                          .filter((s) => s.employee_id === profileEmp.employee_id)
                          .map((s) => (
                            <div
                              key={s.salary_id}
                              className="flex items-center justify-between p-2 rounded border border-slate-200"
                            >
                              <span className="font-mono">{s.month}</span>
                              <span className="font-mono font-bold">
                                INR {s.net_salary.toLocaleString('en-IN')}
                              </span>
                              <span className="font-mono text-[11px] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {s.payment_status}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Salary and bank disbursement details are restricted to Admin, HR Manager, and Accountant roles.</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Employee Record"
        message={`Are you sure you want to permanently remove ${deleteTarget?.name} (#${deleteTarget?.employee_id}) from public.employees?`}
        confirmLabel="Delete Employee"
        onConfirm={() => {
          if (deleteTarget) deleteEmployee(deleteTarget.employee_id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
