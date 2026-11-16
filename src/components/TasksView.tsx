import React, { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Briefcase, HardHat } from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { TaskRecord, TaskStatus } from '../types';
import { filterTasksForRole, isEmployeeOfficeTask } from '../utils/workforceLogic';
import { ConfirmDialog } from './ConfirmDialog';

export const TasksView: React.FC = () => {
  const {
    currentUser,
    tasks,
    projects,
    sites,
    siteSupervisors,
    labours,
    employees,
    currentRole,
    addTask,
    updateTask,
    deleteTask,
  } = useWorkforce();

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
          (l.work_email || '').toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.name && l.name.toLowerCase() === currentUser.name.toLowerCase())
    ) || labours[0];

  const canCreateOrDelete =
    currentRole === 'Admin' ||
    currentRole === 'HR Manager' ||
    currentRole === 'Site Supervisor';

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'OFFICE' | 'SITE'>(
    currentRole === 'Employee' ? 'OFFICE' : 'ALL'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskRecord | null>(null);

  const defaultTaskCategory: 'OFFICE' | 'SITE' =
    currentRole === 'HR Manager' || currentRole === 'Admin' ? 'OFFICE' : 'SITE';

  const [formData, setFormData] = useState({
    task_category: defaultTaskCategory as 'OFFICE' | 'SITE',
    project_id: projects[0]?.project_id || 1,
    site_id: (defaultTaskCategory === 'OFFICE' ? null : sites[0]?.site_id || 1) as number | null,
    supervisor_id: (defaultTaskCategory === 'OFFICE'
      ? null
      : siteSupervisors[0]?.supervisor_id || 1) as number | null,
    employee_id: (defaultTaskCategory === 'OFFICE'
      ? employees[0]?.employee_id || 201
      : null) as number | null,
    labour_id: (defaultTaskCategory === 'OFFICE'
      ? null
      : labours[0]?.labour_id || 101) as number | null,
    priority: 'HIGH' as NonNullable<TaskRecord['priority']>,
    task_name: '',
    description: '',
    start_date: '2026-10-22',
    end_date: '2026-10-29',
    status: 'IN_PROGRESS' as TaskStatus,
  });

  const roleScopedTasks = filterTasksForRole(
    tasks,
    currentRole,
    currentRole === 'Labourer' ? loggedInLabourer?.labour_id : loggedInEmployee?.employee_id
  );

  const filteredTasks = roleScopedTasks.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    if (currentRole === 'Employee' || currentRole === 'Labourer') return matchesStatus;
    const isOffice = isEmployeeOfficeTask(t);
    const matchesCategory =
      categoryFilter === 'ALL' ||
      (categoryFilter === 'OFFICE' && isOffice) ||
      (categoryFilter === 'SITE' && !isOffice);
    return matchesStatus && matchesCategory;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task_name.trim()) return;
    const isOffice = formData.task_category === 'OFFICE';
    const assignedByRole =
      isOffice && (currentRole === 'Admin' || currentRole === 'HR Manager')
        ? currentRole
        : isOffice
        ? 'HR Manager'
        : 'Site Supervisor';
    const assignedByName = `${displayName} (${assignedByRole})`;

    await addTask({
      ...formData,
      task_category: formData.task_category,
      assigned_by_role: assignedByRole,
      assigned_by_name: assignedByName,
      site_id: isOffice ? null : formData.site_id,
      supervisor_id: isOffice ? null : formData.supervisor_id,
      employee_id: isOffice ? formData.employee_id || employees[0]?.employee_id || 201 : null,
      labour_id: isOffice ? null : formData.labour_id,
    });
    setModalOpen(false);
    setFormData({ ...formData, task_name: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {currentRole === 'Employee'
              ? `Employee Office Tasks — ${displayName}`
              : currentRole === 'Labourer'
              ? `My Assigned Tasks — ${displayName}`
              : 'Task & Work Order Management (Office & Site)'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {currentRole === 'Employee' ? (
              <>
                Logged in as <strong className="text-slate-900">{displayName}</strong> · Showing{' '}
                <strong className="text-blue-700">Office Tasks only</strong> assigned by{' '}
                <strong className="text-slate-900">HR Manager</strong> or{' '}
                <strong className="text-slate-900">Admin</strong>
              </>
            ) : currentRole === 'Labourer' ? (
              <>
                Logged in as <strong className="text-slate-900">{displayName}</strong> (#{loggedInLabourer?.labour_id || 101}) · Showing{' '}
                <strong className="text-amber-700">only your assigned tasks</strong> assigned by{' '}
                <strong className="text-slate-900">HR Manager</strong>,{' '}
                <strong className="text-slate-900">Admin</strong>, or{' '}
                <strong className="text-slate-900">Site Supervisor</strong>
              </>
            ) : (
              <>
                Task management for employee office workflows (assigned by HR / Admin) and site construction tasks
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentRole !== 'Employee' &&
            currentRole !== 'Labourer' &&
            currentRole !== 'Site Supervisor' && (
              <select
                aria-label="Filter tasks by category"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as 'ALL' | 'OFFICE' | 'SITE')
                }
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
              >
                <option value="ALL">All Categories ({roleScopedTasks.length})</option>
                <option value="OFFICE">
                  Employee Office Tasks (HR / Admin)
                </option>
                <option value="SITE">Site Construction Tasks (Labourers)</option>
              </select>
            )}

          <select
            aria-label="Filter tasks by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
          >
            <option value="ALL">All Statuses ({filteredTasks.length})</option>
            <option value="NOT_STARTED">NOT_STARTED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="DELAYED">DELAYED</option>
          </select>

          {canCreateOrDelete && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {currentRole === 'HR Manager'
                  ? 'Assign Employee Office Task'
                  : 'Assign New Task'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Task ID &amp; Title</th>
                <th className="py-3 px-4">Category &amp; Scope</th>
                <th className="py-3 px-4">
                  {currentRole === 'Employee'
                    ? 'Assigned Employee & Authorized By (HR / Admin)'
                    : 'Assignee & Assigned By'}
                </th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Execution Status</th>
                {canCreateOrDelete && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredTasks.map((task) => {
                const proj = projects.find((p) => p.project_id === task.project_id);
                const site = sites.find((s) => s.site_id === task.site_id);
                const sup = siteSupervisors.find((s) => s.supervisor_id === task.supervisor_id);
                const lab = labours.find((l) => l.labour_id === task.labour_id);
                const emp = employees.find((e) => e.employee_id === task.employee_id);
                const isOffice = isEmployeeOfficeTask(task);
                const isOverdue =
                  task.status !== 'COMPLETED' && task.end_date < '2026-10-22';

                return (
                  <tr key={task.task_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-slate-400">#{task.task_id}</span>
                        <span className="font-semibold text-slate-900">{task.task_name}</span>
                        {task.priority && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                            {task.priority}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-mono">
                            <AlertTriangle className="w-3 h-3" />
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      {isOffice ? (
                        <div>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-semibold">
                            <Briefcase className="w-3 h-3" />
                            OFFICE TASK
                          </span>
                          <div className="text-[11px] text-slate-600 mt-1">
                            {emp?.department || 'Corporate & Engineering Office'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-semibold">
                            <HardHat className="w-3 h-3" />
                            SITE TASK
                          </span>
                          <div className="font-medium text-slate-800 mt-1">
                            {proj?.project_name}
                          </div>
                          <div className="text-[11px] text-slate-500">{site?.site_name}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isOffice ? (
                        <div>
                          <div className="font-semibold text-slate-900">
                            Employee: {emp?.name || displayName} ({emp?.designation || 'Office Staff'})
                          </div>
                          <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                            Assigned By: {task.assigned_by_name || `${task.assigned_by_role || 'HR Manager'}`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-800">
                            Labour: {lab?.name || displayName} ({lab?.skill || 'Skilled Trade'})
                          </div>
                          <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                            Assigned By:{' '}
                            {task.assigned_by_name || `Sup: ${sup?.name || 'Site Supervisor'}`}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-700">
                            Authorized by {task.assigned_by_role || 'Site Supervisor'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <div>Start: {task.start_date}</div>
                      <div>Due: {task.end_date}</div>
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
                            : task.status === 'DELAYED'
                            ? 'bg-red-50 text-red-800 border-red-200'
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
                    {canCreateOrDelete && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          title="Delete Task"
                          onClick={() => setDeleteTarget(task)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl text-xs">
            <h3 className="font-display text-base font-bold text-slate-900 mb-4">
              {formData.task_category === 'OFFICE'
                ? `Assign Office Task to Employee (By ${currentRole}: ${displayName})`
                : 'Create & Assign Site Construction Task'}
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              {(currentRole === 'Admin' || currentRole === 'HR Manager') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Task Category *
                  </label>
                  <select
                    value={formData.task_category}
                    onChange={(e) => {
                      const cat = e.target.value as 'OFFICE' | 'SITE';
                      setFormData({
                        ...formData,
                        task_category: cat,
                        employee_id: cat === 'OFFICE' ? employees[0]?.employee_id || 201 : null,
                        labour_id: cat === 'SITE' ? labours[0]?.labour_id || 101 : null,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="OFFICE">
                      OFFICE TASK — For Salaried Employee (Assigned by {currentRole})
                    </option>
                    <option value="SITE">
                      SITE TASK — For Construction Labourer
                    </option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Name *</label>
                <input
                  type="text"
                  required
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  placeholder={
                    formData.task_category === 'OFFICE'
                      ? 'e.g., Prepare Monthly HR Compliance & Structural BOQ Audit Report'
                      : 'e.g., 15th Floor Slab Formwork & Rebar Tying'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {formData.task_category === 'OFFICE' ? (
                  <>
                    <div className="col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Assign to Salaried Employee *
                      </label>
                      <select
                        value={formData.employee_id || employees[0]?.employee_id || 201}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            employee_id: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {employees.map((emp) => (
                          <option key={emp.employee_id} value={emp.employee_id}>
                            {emp.user_id || emp.employee_code} · {emp.name} ({emp.designation})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Project</label>
                      <select
                        value={formData.project_id}
                        onChange={(e) =>
                          setFormData({ ...formData, project_id: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {projects.map((p) => (
                          <option key={p.project_id} value={p.project_id}>
                            {p.project_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Site</label>
                      <select
                        value={formData.site_id || sites[0]?.site_id || 1}
                        onChange={(e) =>
                          setFormData({ ...formData, site_id: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {sites.map((s) => (
                          <option key={s.site_id} value={s.site_id}>
                            {s.site_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Supervisor</label>
                      <select
                        value={formData.supervisor_id || siteSupervisors[0]?.supervisor_id || 1}
                        onChange={(e) =>
                          setFormData({ ...formData, supervisor_id: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {siteSupervisors.map((s) => (
                          <option key={s.supervisor_id} value={s.supervisor_id}>
                            {s.user_id || s.employee_code} · {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Assigned Labourer
                      </label>
                      <select
                        value={formData.labour_id || labours[0]?.labour_id || 101}
                        onChange={(e) =>
                          setFormData({ ...formData, labour_id: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {labours.map((l) => (
                          <option key={l.labour_id} value={l.labour_id}>
                            {l.user_id || l.labour_code} · {l.name} ({l.skill_or_trade || l.skill})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as NonNullable<TaskRecord['priority']>,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  {formData.task_category === 'OFFICE'
                    ? 'Assign Office Task'
                    : 'Create Site Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Task"
        message={`Are you sure you want to delete task "${deleteTarget?.task_name}"?`}
        confirmLabel="Delete Task"
        onConfirm={() => {
          if (deleteTarget) deleteTask(deleteTarget.task_id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
