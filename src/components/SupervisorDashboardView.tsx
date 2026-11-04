import React, { useState } from 'react';
import {
  CheckSquare,
  CalendarCheck,
  MapPin,
  Package,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { AttendanceStatus, TaskStatus } from '../types';

export const SupervisorDashboardView: React.FC = () => {
  const {
    currentUser,
    sites,
    projects,
    siteSupervisors,
    tasks,
    labours,
    employees,
    labourAssignments,
    empAssignments,
    attendance,
    materials,
    materialRequests,
    recordAttendance,
    updateTask,
    submitMaterialRequest,
  } = useWorkforce();

  // Match supervisor by email or default to first supervisor (#1 Vikramaditya Rao)
  const activeSupervisor =
    siteSupervisors.find(
      (s) => s.email.toLowerCase() === currentUser?.email?.toLowerCase()
    ) || siteSupervisors[0];

  const assignedSites = sites.filter(
    (s) => s.supervisor_id === activeSupervisor?.supervisor_id
  );
  const [selectedSiteId, setSelectedSiteId] = useState<number>(
    assignedSites[0]?.site_id || sites[0]?.site_id || 1
  );
  const [attendanceDate, setAttendanceDate] = useState<string>('2026-10-22');

  // Quick Material Request state
  const [reqMatId, setReqMatId] = useState<number>(materials[0]?.material_id || 1);
  const [reqQty, setReqQty] = useState<number>(40);
  const [reqNotes, setReqNotes] = useState<string>('');

  const currentSite = sites.find((s) => s.site_id === selectedSiteId) || sites[0];
  const parentProject = projects.find((p) => p.project_id === currentSite?.project_id);

  const siteTasks = tasks.filter((t) => t.site_id === selectedSiteId);
  const siteRequisitions = materialRequests.filter((r) => r.site_id === selectedSiteId);
  const projectLabours = labourAssignments
    .filter((la) => la.project_id === currentSite?.project_id && la.status === 'ACTIVE')
    .map((la) => labours.find((l) => l.labour_id === la.labour_id))
    .filter(Boolean);

  const projectEmployees = empAssignments
    .filter((ea) => ea.project_id === currentSite?.project_id && ea.status === 'ACTIVE')
    .map((ea) => employees.find((e) => e.employee_id === ea.employee_id))
    .filter(Boolean);

  const handleQuickAttendance = async (
    workerType: 'labour' | 'employee',
    id: number,
    status: AttendanceStatus
  ) => {
    const hours =
      status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0;
    await recordAttendance(
      {
        site_id: selectedSiteId,
        employee_id: workerType === 'employee' ? id : null,
        labour_id: workerType === 'labour' ? id : null,
        attendance_date: attendanceDate,
        status,
        hours_worked: hours,
      },
      true
    );
  };

  const handleSupervisorMaterialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find((m) => m.material_id === reqMatId);
    if (!mat || !currentSite) return;
    await submitMaterialRequest({
      project_id: currentSite.project_id,
      site_id: currentSite.site_id,
      supervisor_id: activeSupervisor?.supervisor_id || 1,
      material_id: mat.material_id,
      material_name: mat.material_name,
      unit: mat.unit,
      requested_qty: reqQty,
      approved_qty: 0,
      delivered_qty: 0,
      used_qty: 0,
      unit_cost: mat.cost,
      estimated_value: reqQty * mat.cost,
      actual_expenditure: 0,
      request_date: attendanceDate,
      notes: reqNotes.trim() || `Requested by ${activeSupervisor?.name} for ${currentSite.site_name}`,
    });
    setReqNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Site Supervisor Operations Hub
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Assigned Supervisor:{' '}
            <strong className="text-slate-900">{activeSupervisor?.name}</strong> (
            {activeSupervisor?.phone}) · Managing {assignedSites.length} Active Sites
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sup-site-select" className="text-xs font-semibold text-slate-700">
            Active Site:
          </label>
          <select
            id="sup-site-select"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900"
          >
            {sites.map((s) => (
              <option key={s.site_id} value={s.site_id}>
                {s.site_name} {s.supervisor_id === activeSupervisor?.supervisor_id ? '(My Site)' : ''}
              </option>
            ))}
          </select>

          <input
            type="date"
            aria-label="Attendance Date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900"
          />
        </div>
      </div>

      {/* Site Summary Banner */}
      {currentSite && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-700 font-semibold">
              {parentProject?.project_name}
            </span>
            <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
              {currentSite.site_name}
            </h2>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentSite.location}</span>
            </p>
          </div>
          <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 flex flex-col justify-center">
            <span className="text-xs text-slate-500">Assigned Crew</span>
            <span className="font-mono text-xl font-bold text-slate-900 mt-0.5">
              {projectLabours.length} Labourers · {projectEmployees.length} Staff
            </span>
          </div>
          <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 flex flex-col justify-center">
            <span className="text-xs text-slate-500">Site Tasks Execution</span>
            <span className="font-mono text-xl font-bold text-slate-900 mt-0.5">
              {siteTasks.filter((t) => t.status === 'COMPLETED').length} / {siteTasks.length} Done
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Tasks & Status Updater */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-700" />
                <span>Site Tasks &amp; Field Progress</span>
              </h3>
              <p className="text-xs text-slate-500">
                Update execution status for tasks assigned to {currentSite?.site_name}
              </p>
            </div>
          </div>

          {siteTasks.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              No tasks currently assigned to this site.
            </p>
          ) : (
            <div className="space-y-3">
              {siteTasks.map((task) => {
                const assignedLabour = labours.find((l) => l.labour_id === task.labour_id);
                const assignedEmp = employees.find((e) => e.employee_id === task.employee_id);
                return (
                  <div
                    key={task.task_id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-xs text-slate-900">{task.task_name}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{task.description}</p>
                      </div>
                      <select
                        aria-label={`Status for ${task.task_name}`}
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.task_id, { status: e.target.value as TaskStatus })
                        }
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-800 cursor-pointer"
                      >
                        <option value="NOT_STARTED">NOT_STARTED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="DELAYED">DELAYED</option>
                      </select>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Assigned:{' '}
                        <strong className="text-slate-800">
                          {assignedLabour?.name || assignedEmp?.name || 'Site Squad'}
                        </strong>
                      </span>
                      <span className="font-mono">
                        Due: {task.end_date}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fast Site Roll-Call / Attendance Marking */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-700" />
                <span>Site Daily Roll-Call ({attendanceDate})</span>
              </h3>
              <p className="text-xs text-slate-500">
                One-click muster logging for labourers &amp; engineers on this site
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {projectLabours.map((lab) => {
              if (!lab) return null;
              const existing = attendance.find(
                (a) =>
                  a.site_id === selectedSiteId &&
                  a.labour_id === lab.labour_id &&
                  a.attendance_date === attendanceDate
              );
              return (
                <div
                  key={`lab-${lab.labour_id}`}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{lab.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Labourer · {lab.skill} · INR {lab.wage_rate}/day
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE'] as AttendanceStatus[]).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleQuickAttendance('labour', lab.labour_id, st)}
                          className={`px-2 py-1 rounded text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                            existing?.status === st
                              ? st === 'PRESENT'
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : st === 'HALF_DAY'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : st === 'LEAVE'
                                ? 'bg-blue-700 text-white border-blue-700'
                                : 'bg-red-700 text-white border-red-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Site Supervisor Material Requisition Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-700" />
            <span>Request Site Materials</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Raise a material requisition for {currentSite?.site_name} (synced to Admin Dashboard)
          </p>
          <form onSubmit={handleSupervisorMaterialRequest} className="space-y-3 mt-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Material</label>
              <select
                value={reqMatId}
                onChange={(e) => setReqMatId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {materials.map((m) => (
                  <option key={m.material_id} value={m.material_id}>
                    {m.material_name} (Stock: {m.quantity} {m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Requested Quantity</label>
              <input
                type="number"
                min={1}
                value={reqQty}
                onChange={(e) => setReqQty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Site Notes</label>
              <input
                type="text"
                placeholder="Urgent requirement for scheduled pour"
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
            >
              Submit Requisition to Admin
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <h4 className="font-display text-sm font-bold text-slate-900 mb-3">
            Material Requisition Status for {currentSite?.site_name} ({siteRequisitions.length})
          </h4>
          <div className="space-y-2">
            {siteRequisitions.map((req) => (
              <div
                key={req.request_id}
                className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{req.material_name}</span>
                  <span className="text-slate-500 block text-[11px]">{req.notes}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-slate-900">
                    {req.requested_qty} {req.unit}
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : req.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
