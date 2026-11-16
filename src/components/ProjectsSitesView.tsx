import React, { useState, useEffect } from 'react';
import {
  Plus,
  MapPin,
  Trash2,
  Eye,
  X,
  UserCheck,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { ProjectRecord, SiteRecord } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { GoogleMapsSitesPanel } from './GoogleMapsSitesPanel';
import {
  validateWorkEmail,
  validate10DigitPhone,
  sanitize10DigitPhone,
} from '../utils/workforceLogic';


interface ProjectsSitesViewProps {
  initialTab?: 'projects' | 'sites';
}

export const ProjectsSitesView: React.FC<ProjectsSitesViewProps> = ({
  initialTab = 'projects',
}) => {
  const {
    projects,
    sites,
    siteSupervisors,
    employees,
    labours,
    empAssignments,
    labourAssignments,
    attendance,
    tasks,
    taskMaterials,
    currentRole,
    addProject,
    updateProject,
    deleteProject,
    addSite,
    updateSite,
    deleteSite,
    addSiteSupervisor,
  } = useWorkforce();

  const [activeTab, setActiveTab] = useState<'projects' | 'sites'>(initialTab);
  const [projectViewMode, setProjectViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const canManageProjects = currentRole === 'Admin' || currentRole === 'HR Manager';
  const canManageSites =
    currentRole === 'Admin' ||
    currentRole === 'HR Manager' ||
    currentRole === 'Site Supervisor';

  // Project Modal
  const [projModalOpen, setProjModalOpen] = useState(false);
  const [projForm, setProjForm] = useState({
    project_name: '',
    client_name: 'MMRCL / Urban Infra Corp',
    location: '',
    start_date: '2026-10-01',
    end_date: '2027-06-30',
    budget: 85000000,
    status: 'ACTIVE' as ProjectRecord['status'],
  });

  // Project Detail Drawer/Modal
  const [inspectProject, setInspectProject] = useState<ProjectRecord | null>(null);

  // Site Modal
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [siteForm, setSiteForm] = useState({
    project_id: projects[0]?.project_id || 1,
    supervisor_id: siteSupervisors[0]?.supervisor_id || 1,
    site_name: '',
    location: '',
    status: 'ACTIVE' as SiteRecord['status'],
  });

  // Add Supervisor Modal
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [supForm, setSupForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [supEmailError, setSupEmailError] = useState<string | null>(null);
  const [supPhoneError, setSupPhoneError] = useState<string | null>(null);

  // Delete Confirmations
  const [deleteProjTarget, setDeleteProjTarget] = useState<ProjectRecord | null>(null);
  const [deleteSiteTarget, setDeleteSiteTarget] = useState<SiteRecord | null>(null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projForm.project_name.trim()) return;
    await addProject(projForm);
    setProjModalOpen(false);
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.site_name.trim()) return;
    await addSite(siteForm);
    setSiteModalOpen(false);
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupEmailError(null);
    setSupPhoneError(null);

    const trimmedName = supForm.name.trim();
    const cleanEmail = supForm.email.trim().toLowerCase();
    const cleanPhone = sanitize10DigitPhone(supForm.phone);

    if (!trimmedName) return;

    const emailValidation = validateWorkEmail(cleanEmail);
    if (!emailValidation.valid) {
      setSupEmailError(emailValidation.error || 'Work email must end with @buildmate.ac.in');
      return;
    }

    const phoneValidation = validate10DigitPhone(cleanPhone);
    if (!phoneValidation.valid) {
      setSupPhoneError(phoneValidation.error || 'Phone number must have exactly 10 digits');
      return;
    }

    await addSiteSupervisor({
      ...supForm,
      name: trimmedName,
      email: cleanEmail,
      phone: cleanPhone,
      user_id: null,
      status: 'ACTIVE',
    });
    setSupModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Construction Projects &amp; Site Operations
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Multi-project infrastructure directory, operational construction sites, and site supervisor assignments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Projects ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sites')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                activeTab === 'sites'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sites &amp; Supervisors ({sites.length})
            </button>
          </div>

          {activeTab === 'projects' && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setProjectViewMode('grid')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                  projectViewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid View</span>
              </button>
              <button
                type="button"
                onClick={() => setProjectViewMode('table')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                  projectViewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>
          )}

          {canManageProjects && activeTab === 'projects' && (
            <button
              type="button"
              onClick={() => setProjModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}

          {canManageSites && activeTab === 'sites' && (
            <>
              <button
                type="button"
                onClick={() => setSupModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Add Supervisor</span>
              </button>
              <button
                type="button"
                onClick={() => setSiteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Site</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: PROJECTS (GRID OR TABLE VIEW) */}
      {activeTab === 'projects' && projectViewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {projects.map((proj) => {
            const projSites = sites.filter((s) => s.project_id === proj.project_id);
            const projSiteIds = projSites.map((s) => s.site_id);
            const projTasks = tasks.filter((t) => t.project_id === proj.project_id);
            const completedTasks = projTasks.filter((t) => t.status === 'COMPLETED').length;
            const projEmps = empAssignments.filter((a) => a.project_id === proj.project_id);
            const projLabs = labourAssignments.filter((a) => a.project_id === proj.project_id);
            const projAtt = attendance.filter((a) => projSiteIds.includes(a.site_id));
            const projPresent = projAtt.filter(
              (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
            ).length;
            const projAttRate =
              projAtt.length > 0 ? Math.round((projPresent / projAtt.length) * 100) : 90;
            const progress =
              projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : 35;

            return (
              <div
                key={proj.project_id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Project #{proj.project_id} · {proj.client_name || 'Infrastructure Client'}
                      </span>
                      <h2 className="font-display text-lg font-bold text-slate-900">
                        {proj.project_name}
                      </h2>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proj.location}</span>
                      </p>
                    </div>
                    <select
                      aria-label={`Status for ${proj.project_name}`}
                      value={proj.status}
                      disabled={!canManageProjects}
                      onChange={(e) =>
                        updateProject(proj.project_id, {
                          status: e.target.value as ProjectRecord['status'],
                        })
                      }
                      className="px-2.5 py-1 rounded border border-slate-200 text-xs font-mono font-semibold bg-slate-50"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PLANNING">PLANNING</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="ON_HOLD">ON_HOLD</option>
                    </select>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Contract Budget</span>
                      <strong className="font-mono text-slate-900">
                        INR {(proj.budget / 10000000).toFixed(2)} Cr
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Allocated Crew</span>
                      <strong className="font-mono text-slate-900">
                        {projEmps.length}E · {projLabs.length}L
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Attendance Rate</span>
                      <strong className="font-mono text-emerald-700">{projAttRate}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Sites &amp; Tasks</span>
                      <strong className="font-mono text-slate-900">
                        {projSites.length}S · {projTasks.length}T
                      </strong>
                    </div>
                  </div>

                  {/* Execution Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Task Execution Progress</span>
                      <span className="font-mono font-bold text-slate-900">{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-[#1D4ED8]"
                        style={{ width: `${Math.max(10, progress)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-500">
                    Timeline: {proj.start_date} → {proj.end_date}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectProject(proj)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-semibold hover:bg-blue-100 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Project Details</span>
                    </button>
                    {canManageProjects && (
                      <button
                        type="button"
                        title="Delete Project"
                        onClick={() => setDeleteProjTarget(proj)}
                        className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'projects' && projectViewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Project Name &amp; Location</th>
                  <th className="py-3 px-4">Sites &amp; Supervisors</th>
                  <th className="py-3 px-4">Assigned Crew</th>
                  <th className="py-3 px-4">Site Attendance Rate</th>
                  <th className="py-3 px-4">Budget &amp; Timeline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {projects.map((proj) => {
                  const projSites = sites.filter((s) => s.project_id === proj.project_id);
                  const projSiteIds = projSites.map((s) => s.site_id);
                  const projEmps = empAssignments.filter((a) => a.project_id === proj.project_id);
                  const projLabs = labourAssignments.filter((a) => a.project_id === proj.project_id);
                  const projAtt = attendance.filter((a) => projSiteIds.includes(a.site_id));
                  const projPresent = projAtt.filter(
                    (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
                  ).length;
                  const projAttRate =
                    projAtt.length > 0 ? Math.round((projPresent / projAtt.length) * 100) : 90;

                  return (
                    <tr key={proj.project_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          #{proj.project_id} · {proj.project_name}
                        </div>
                        <div className="text-[11px] text-slate-500">{proj.location}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-slate-800">
                          {projSites.length} Active Sites
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {projSites.map((s) => s.site_name).join(', ') || 'No sites'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {projEmps.length} Employees · {projLabs.length} Labourers
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold">
                          {projAttRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900">
                          INR {(proj.budget / 10000000).toFixed(2)} Cr
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {proj.start_date} → {proj.end_date}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-semibold">
                          {proj.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectProject(proj)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SITES & SUPERVISORS */}
      {activeTab === 'sites' && (
        <div className="space-y-6">
          {/* Interactive Google Maps Platform + Gemini Maps Grounding */}
          <GoogleMapsSitesPanel />

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Site ID &amp; Name</th>
                    <th className="py-3 px-4">Parent Project</th>
                    <th className="py-3 px-4">Assigned Site Supervisor</th>
                    <th className="py-3 px-4">Site Attendance Rate</th>
                    <th className="py-3 px-4">Active Tasks &amp; Material Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {sites.map((site) => {
                    const proj = projects.find((p) => p.project_id === site.project_id);
                    const siteTasks = tasks.filter((t) => t.site_id === site.site_id);
                    const siteTaskIds = siteTasks.map((t) => t.task_id);
                    const siteMatCost = taskMaterials
                      .filter((tm) => siteTaskIds.includes(tm.task_id))
                      .reduce((sum, tm) => sum + tm.total_cost, 0);
                    const siteAtt = attendance.filter((a) => a.site_id === site.site_id);
                    const sitePres = siteAtt.filter(
                      (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
                    ).length;
                    const siteAttRate =
                      siteAtt.length > 0 ? Math.round((sitePres / siteAtt.length) * 100) : 88;

                    return (
                      <tr key={site.site_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            #{site.site_id} · {site.site_name}
                          </div>
                          <div className="text-[11px] text-slate-500">{site.location}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {proj?.project_name || `Project #${site.project_id}`}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Supervisor for ${site.site_name}`}
                            value={site.supervisor_id || ''}
                            disabled={!canManageSites}
                            onChange={(e) =>
                              updateSite(site.site_id, {
                                supervisor_id: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs"
                          >
                            <option value="">Unassigned</option>
                            {siteSupervisors.map((s) => (
                              <option key={s.supervisor_id} value={s.supervisor_id}>
                                {s.name} ({s.phone})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold">
                            {siteAttRate}% ({sitePres}/{siteAtt.length} shifts)
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          <div>
                            {siteTasks.filter((t) => t.status === 'COMPLETED').length}/
                            {siteTasks.length} Tasks Done
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Mat. Used: INR {siteMatCost.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Status for ${site.site_name}`}
                            value={site.status}
                            disabled={!canManageSites}
                            onChange={(e) =>
                              updateSite(site.site_id, {
                                status: e.target.value as SiteRecord['status'],
                              })
                            }
                            className="px-2 py-1 rounded border border-slate-200 font-mono text-[11px] font-semibold bg-slate-50"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INSPECTION_DUE">INSPECTION_DUE</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="ON_HOLD">ON_HOLD</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canManageProjects && (
                            <button
                              type="button"
                              title="Delete Site"
                              onClick={() => setDeleteSiteTarget(site)}
                              className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Inspection Modal */}
      {inspectProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl text-xs space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {inspectProject.project_name}
                </h2>
                <p className="text-slate-500">
                  {inspectProject.location} · Budget: INR{' '}
                  {inspectProject.budget.toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectProject(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Assigned Employees (employee_project_assignments)
                </h4>
                <div className="space-y-1.5">
                  {empAssignments
                    .filter((a) => a.project_id === inspectProject.project_id)
                    .map((a) => {
                      const emp = employees.find((e) => e.employee_id === a.employee_id);
                      return (
                        <div key={a.assignment_id} className="flex justify-between">
                          <span className="font-medium text-slate-800">{emp?.name}</span>
                          <span className="text-slate-500">{emp?.designation}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Assigned Labourers (labour_project_assignments)
                </h4>
                <div className="space-y-1.5">
                  {labourAssignments
                    .filter((a) => a.project_id === inspectProject.project_id)
                    .map((a) => {
                      const lab = labours.find((l) => l.labour_id === a.labour_id);
                      return (
                        <div key={a.assignment_id} className="flex justify-between">
                          <span className="font-medium text-slate-800">{lab?.name}</span>
                          <span className="text-slate-500">{lab?.skill}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Project Sites &amp; Active Tasks</h4>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.project_id === inspectProject.project_id)
                  .map((t) => (
                    <div
                      key={t.task_id}
                      className="p-2.5 rounded border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{t.task_name}</span>
                        <span className="text-slate-500 block text-[11px]">{t.description}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-800">{t.status}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {projModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl text-xs">
            <h3 className="font-display text-base font-bold text-slate-900 mb-4">
              Create Construction Project
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={projForm.project_name}
                  onChange={(e) => setProjForm({ ...projForm, project_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location *</label>
                <input
                  type="text"
                  required
                  value={projForm.location}
                  onChange={(e) => setProjForm({ ...projForm, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={projForm.start_date}
                    onChange={(e) => setProjForm({ ...projForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={projForm.end_date}
                    onChange={(e) => setProjForm({ ...projForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Budget (INR)</label>
                <input
                  type="number"
                  value={projForm.budget}
                  onChange={(e) => setProjForm({ ...projForm, budget: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setProjModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Site Modal */}
      {siteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl text-xs">
            <h3 className="font-display text-base font-bold text-slate-900 mb-4">
              Register Construction Site
            </h3>
            <form onSubmit={handleCreateSite} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Site Name *</label>
                <input
                  type="text"
                  required
                  value={siteForm.site_name}
                  onChange={(e) => setSiteForm({ ...siteForm, site_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parent Project</label>
                <select
                  value={siteForm.project_id}
                  onChange={(e) => setSiteForm({ ...siteForm, project_id: Number(e.target.value) })}
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
                <label className="block font-semibold text-slate-700 mb-1">Site Supervisor</label>
                <select
                  value={siteForm.supervisor_id}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, supervisor_id: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {siteSupervisors.map((s) => (
                    <option key={s.supervisor_id} value={s.supervisor_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location *</label>
                <input
                  type="text"
                  required
                  value={siteForm.location}
                  onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSiteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Save Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supervisor Modal */}
      {supModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl text-xs">
            <h3 className="font-display text-base font-bold text-slate-900 mb-4">
              Register Site Supervisor
            </h3>
            <form onSubmit={handleCreateSupervisor} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supervisor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Imran Shaikh"
                  value={supForm.name}
                  onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Official Email *</label>
                  <span className="text-[10px] text-blue-700 font-mono">@buildmate.ac.in required</span>
                </div>
                <input
                  type="email"
                  required
                  pattern=".+@buildmate\.ac\.in"
                  title="Work email must end with @buildmate.ac.in"
                  placeholder="e.g. imran.shaikh@buildmate.ac.in"
                  value={supForm.email}
                  onChange={(e) => {
                    setSupForm({ ...supForm, email: e.target.value });
                    if (supEmailError) setSupEmailError(null);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none ${
                    supEmailError ? 'border-red-400 bg-red-50/30' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {supEmailError && (
                  <p className="text-[11px] text-red-600 mt-1">{supEmailError}</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Phone Number *</label>
                  <span className="text-[10px] text-slate-500 font-mono">10 digits only</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  title="Phone number must have exactly 10 digits"
                  placeholder="e.g. 9000000042"
                  value={supForm.phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setSupForm({ ...supForm, phone: digits });
                    if (supPhoneError) setSupPhoneError(null);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-none ${
                    supPhoneError ? 'border-red-400 bg-red-50/30' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {supPhoneError && (
                  <p className="text-[11px] text-red-600 mt-1">{supPhoneError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSupModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Register Supervisor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteProjTarget)}
        title="Delete Construction Project"
        message={`Are you sure you want to delete project "${deleteProjTarget?.project_name}"?`}
        confirmLabel="Delete Project"
        onConfirm={() => {
          if (deleteProjTarget) deleteProject(deleteProjTarget.project_id);
        }}
        onCancel={() => setDeleteProjTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteSiteTarget)}
        title="Delete Construction Site"
        message={`Are you sure you want to delete site "${deleteSiteTarget?.site_name}"?`}
        confirmLabel="Delete Site"
        onConfirm={() => {
          if (deleteSiteTarget) deleteSite(deleteSiteTarget.site_id);
        }}
        onCancel={() => setDeleteSiteTarget(null)}
      />
    </div>
  );
};
