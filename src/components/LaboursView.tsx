import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  FolderPlus,
  Eye,
  X,
  ShieldCheck,
  HeartPulse,
  KeyRound,
  UserX,
  Lock,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { LabourRecord, WageType, KycStatus, HealthStatus } from '../types';
import {
  calculateWorkerAttendanceMetrics,
  getRolePermissions,
  validate10DigitPhone,
  sanitize10DigitPhone,
} from '../utils/workforceLogic';
import { ConfirmDialog } from './ConfirmDialog';

export const LaboursView: React.FC = () => {
  const {
    labours,
    projects,
    labourAssignments,
    attendance,
    tasks,
    leaves,
    salaries,
    currentRole,
    addLabour,
    updateLabour,
    deleteLabour,
    assignLabourToProject,
  } = useWorkforce();

  const perms = getRolePermissions(currentRole);
  const canEdit = perms.canEditLabours;

  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [wageTypeFilter, setWageTypeFilter] = useState<string>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLabour, setEditingLabour] = useState<LabourRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergency_contact: '+91 98201 00000',
    address: '',
    skill: 'Mason',
    experience_years: 5,
    wage_type: 'DAILY' as WageType,
    wage_rate: 850,
    hourly_rate: 115,
    joining_date: '2026-10-01',
    status: 'ACTIVE' as LabourRecord['status'],
    auth_enabled: true,
    kyc_status: 'VERIFIED' as KycStatus,
    kyc_document_ref: 'Aadhaar & e-Shram Card Verified',
    health_status: 'FIT_FOR_DUTY' as HealthStatus,
    health_checkup_date: '2026-10-01',
    medical_notes: '',
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [assignModalLab, setAssignModalLab] = useState<LabourRecord | null>(null);
  const [assignProjectId, setAssignProjectId] = useState<number>(projects[0]?.project_id || 1);
  const [assignStartDate, setAssignStartDate] = useState<string>('2026-10-22');

  const [profileLab, setProfileLab] = useState<LabourRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabourRecord | null>(null);

  const uniqueSkills = Array.from(new Set(labours.map((l) => l.skill)));

  const filteredLabours = labours.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      l.name.toLowerCase().includes(q) ||
      l.skill.toLowerCase().includes(q) ||
      l.phone.includes(search) ||
      (l.user_id || '').toLowerCase().includes(q) ||
      (l.labour_code || '').toLowerCase().includes(q) ||
      (l.work_email || '').toLowerCase().includes(q);
    const matchesSkill = skillFilter === 'ALL' || l.skill === skillFilter;
    const matchesWageType =
      wageTypeFilter === 'ALL' || (l.wage_type || 'DAILY') === wageTypeFilter;
    return matchesSearch && matchesSkill && matchesWageType;
  });

  const openCreate = () => {
    setEditingLabour(null);
    setFormData({
      name: '',
      phone: '',
      emergency_contact: '+91 98201 00000',
      address: '',
      skill: 'Mason',
      experience_years: 4,
      wage_type: 'DAILY',
      wage_rate: 850,
      hourly_rate: 115,
      joining_date: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
      auth_enabled: true,
      kyc_status: 'PENDING_DOCS',
      kyc_document_ref: 'Aadhaar & e-Shram Verification Pending',
      health_status: 'FIT_FOR_DUTY',
      health_checkup_date: new Date().toISOString().slice(0, 10),
      medical_notes: 'Site safety induction & basic health screening completed.',
    });
    setPhoneError(null);
    setModalOpen(true);
  };

  const openEdit = (lab: LabourRecord) => {
    setEditingLabour(lab);
    setFormData({
      name: lab.name,
      phone: sanitize10DigitPhone(lab.phone),
      emergency_contact: sanitize10DigitPhone(lab.emergency_contact || '9820100000'),
      address: lab.address,
      skill: lab.skill,
      experience_years: lab.experience_years || 5,
      wage_type: lab.wage_type || 'DAILY',
      wage_rate: lab.wage_rate,
      hourly_rate: lab.hourly_rate || Math.round(lab.wage_rate / 8),
      joining_date: lab.joining_date,
      status: lab.status,
      auth_enabled: lab.auth_enabled ?? true,
      kyc_status: lab.kyc_status || 'VERIFIED',
      kyc_document_ref: lab.kyc_document_ref || 'Aadhaar & e-Shram Verified',
      health_status: lab.health_status || 'FIT_FOR_DUTY',
      health_checkup_date: lab.health_checkup_date || '2026-10-01',
      medical_notes: lab.medical_notes || '',
    });
    setPhoneError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    const trimmedName = formData.name.trim();
    const cleanPhone = sanitize10DigitPhone(formData.phone);
    const cleanEmergency = sanitize10DigitPhone(formData.emergency_contact);

    if (!trimmedName) return;

    const phoneValidation = validate10DigitPhone(cleanPhone);
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error || 'Phone number must have exactly 10 digits');
      return;
    }

    const payload = {
      ...formData,
      name: trimmedName,
      phone: cleanPhone,
      emergency_contact: cleanEmergency,
    };

    if (editingLabour) {
      await updateLabour(editingLabour.labour_id, payload);
    } else {
      await addLabour({ ...payload, user_id: null });
    }
    setModalOpen(false);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalLab) return;
    await assignLabourToProject({
      labour_id: assignModalLab.labour_id,
      project_id: assignProjectId,
      start_date: assignStartDate,
      end_date: null,
      status: 'ACTIVE',
    });
    setAssignModalLab(null);
  };

  const handleToggleDeactivate = async (lab: LabourRecord) => {
    const nextStatus: LabourRecord['status'] =
      lab.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    await updateLabour(lab.labour_id, { status: nextStatus });
  };

  const handleToggleKyc = async (lab: LabourRecord) => {
    const nextStatus: KycStatus =
      lab.kyc_status === 'VERIFIED' ? 'PENDING_DOCS' : 'VERIFIED';
    await updateLabour(lab.labour_id, {
      kyc_status: nextStatus,
      kyc_document_ref:
        nextStatus === 'VERIFIED'
          ? 'Aadhaar & e-Shram Card Verified'
          : 'KYC Re-verification Requested',
    });
    if (profileLab?.labour_id === lab.labour_id) {
      setProfileLab({ ...lab, kyc_status: nextStatus });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Construction Labour Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Skilled construction labour directory · Supports daily (₹/Day), hourly (₹/Hour) &amp; contract wages, KYC verification, health &amp; portal access
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Register Skilled Labourer</span>
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search labourers by name, trade skill, or phone"
            placeholder="Search labourers by name, trade skill, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="labour-skill-filter" className="text-xs font-medium text-slate-600">
            Trade:
          </label>
          <select
            id="labour-skill-filter"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
          >
            <option value="ALL">All Trades ({labours.length})</option>
            {uniqueSkills.map((sk) => (
              <option key={sk} value={sk}>
                {sk}
              </option>
            ))}
          </select>

          <label htmlFor="labour-wagetype-filter" className="text-xs font-medium text-slate-600">
            Wage Type:
          </label>
          <select
            id="labour-wagetype-filter"
            value={wageTypeFilter}
            onChange={(e) => setWageTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
          >
            <option value="ALL">All Wage Types</option>
            <option value="DAILY">Daily Wage (₹/Day)</option>
            <option value="HOURLY">Hourly Wage (₹/Hour)</option>
            <option value="CONTRACT">Contract Basis</option>
          </select>
        </div>
      </div>

      {/* Labours Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Labourer &amp; Auth Status</th>
                <th className="py-3 px-4">Skill &amp; Assigned Project</th>
                <th className="py-3 px-4">Wage Basis (₹/Day or ₹/Hr)</th>
                <th className="py-3 px-4">Attendance &amp; Earned Wage</th>
                <th className="py-3 px-4">KYC &amp; Health</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredLabours.map((lab) => {
                const assigns = labourAssignments.filter((a) => a.labour_id === lab.labour_id);
                const metrics = calculateWorkerAttendanceMetrics(attendance, {
                  labour_id: lab.labour_id,
                });
                const wageType = lab.wage_type || 'DAILY';
                const hourlyRate = lab.hourly_rate || Math.round(lab.wage_rate / 8);
                const earnedWage =
                  wageType === 'HOURLY'
                    ? metrics.totalHours * hourlyRate
                    : Math.round(
                        metrics.effectiveWorkedDays * lab.wage_rate +
                          metrics.overtimeHours * hourlyRate
                      );
                const kycStatus = lab.kyc_status || 'VERIFIED';
                const healthStatus = lab.health_status || 'FIT_FOR_DUTY';

                return (
                  <tr key={lab.labour_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                      {lab.user_id || lab.labour_code || `#${lab.labour_id}`}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{lab.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        {lab.work_email ? `${lab.work_email} · ` : ''}
                        {lab.phone} · {lab.experience_years || 5} yrs exp
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          lab.auth_enabled !== false
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <KeyRound className="w-2.5 h-2.5" />
                        {lab.auth_enabled !== false ? 'Portal Auth Active' : 'Field Roster Only'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                        <Wrench className="w-3 h-3 text-slate-500" />
                        {lab.skill}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assigns.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">Unassigned</span>
                        ) : (
                          assigns.map((asg) => {
                            const proj = projects.find((p) => p.project_id === asg.project_id);
                            return (
                              <span
                                key={asg.assignment_id}
                                className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium"
                              >
                                {proj?.project_name || `Project #${asg.project_id}`}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">
                        {wageType === 'HOURLY'
                          ? `₹${hourlyRate} / Hour`
                          : `₹${lab.wage_rate} / Day`}
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {wageType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900">
                        {metrics.attendanceRate}% · {metrics.effectiveWorkedDays}d ({metrics.totalHours}h)
                      </div>
                      <div className="text-[11px] font-mono text-emerald-700 font-bold">
                        Earned: INR {earnedWage.toLocaleString('en-IN')}
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
                          lab.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : lab.status === 'ON_LEAVE'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {lab.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="View Labour Profile, KYC & Wage Ledger"
                          onClick={() => setProfileLab(lab)}
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
                                setAssignModalLab(lab);
                                setAssignProjectId(projects[0]?.project_id || 1);
                              }}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-700 cursor-pointer"
                            >
                              <FolderPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Edit Labourer"
                              onClick={() => openEdit(lab)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title={
                                lab.status === 'INACTIVE'
                                  ? 'Reactivate Labourer'
                                  : 'Soft-Deactivate Labourer'
                              }
                              onClick={() => handleToggleDeactivate(lab)}
                              className="p-1.5 rounded hover:bg-amber-50 text-amber-700 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete Labourer"
                              onClick={() => setDeleteTarget(lab)}
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

      {/* Create / Edit Labour Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingLabour ? 'Edit Labourer Profile' : 'Register Skilled Construction Labourer'}
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
                    placeholder="e.g. 9000000101"
                    value={formData.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: digits });
                      if (phoneError) setPhoneError(null);
                    }}
                    className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-none ${
                      phoneError ? 'border-red-400 bg-red-50/30' : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                  {phoneError && (
                    <p className="text-[11px] text-red-600 mt-1">{phoneError}</p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade Skill *</label>
                  <input
                    type="text"
                    required
                    value={formData.skill}
                    onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Wage Basis (₹/Day vs ₹/Hour)
                  </label>
                  <select
                    value={formData.wage_type}
                    onChange={(e) =>
                      setFormData({ ...formData, wage_type: e.target.value as WageType })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="DAILY">DAILY (₹ / Day)</option>
                    <option value="HOURLY">HOURLY (₹ / Hour)</option>
                    <option value="CONTRACT">CONTRACT (Lump Sum / Milestone)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Daily Wage Rate (₹/Day) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={formData.wage_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, wage_rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hourly / Overtime Rate (₹/Hour)
                  </label>
                  <input
                    type="number"
                    min={20}
                    value={formData.hourly_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, hourly_rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KYC Verification</label>
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
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Health Checkup</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as LabourRecord['status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
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
              <div className="flex items-center gap-2">
                <input
                  id="labour-auth-toggle"
                  type="checkbox"
                  checked={formData.auth_enabled}
                  onChange={(e) => setFormData({ ...formData, auth_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="labour-auth-toggle" className="text-slate-700 font-medium">
                  Enable Self-Service Portal Authentication for this Labourer
                </label>
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
                  {editingLabour ? 'Save Changes' : 'Register Labourer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Labourer to Project Modal */}
      {assignModalLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-slate-900">
              Assign {assignModalLab.name} ({assignModalLab.skill}) to Project
            </h3>
            <form onSubmit={handleAssignSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project</label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(Number(e.target.value))}
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
                <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
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
                  onClick={() => setAssignModalLab(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Assign to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Labour Profile Modal */}
      {profileLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {profileLab.name} ({profileLab.user_id || profileLab.labour_code || `#${profileLab.labour_id}`})
                </h3>
                <p className="text-slate-500">
                  Trade: {profileLab.skill} · Wage Basis: {profileLab.wage_type || 'DAILY'} (₹
                  {profileLab.wage_rate}/day · ₹
                  {profileLab.hourly_rate || Math.round(profileLab.wage_rate / 8)}/hr)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileLab(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const metrics = calculateWorkerAttendanceMetrics(attendance, {
                labour_id: profileLab.labour_id,
              });
              const wageType = profileLab.wage_type || 'DAILY';
              const hourlyRate = profileLab.hourly_rate || Math.round(profileLab.wage_rate / 8);
              const earnedWage =
                wageType === 'HOURLY'
                  ? metrics.totalHours * hourlyRate
                  : Math.round(
                      metrics.effectiveWorkedDays * profileLab.wage_rate +
                        metrics.overtimeHours * hourlyRate
                    );
              const labSalaries = salaries.filter((s) => s.labour_id === profileLab.labour_id);

              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 block">Attendance Rate</span>
                      <strong className="font-mono text-emerald-700">
                        {metrics.attendanceRate}% ({metrics.effectiveWorkedDays}d)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Hours &amp; Overtime</span>
                      <strong className="font-mono text-slate-900">
                        {metrics.totalHours}h ({metrics.overtimeHours}h OT)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Attendance-Earned Wage</span>
                      <strong className="font-mono text-blue-700">
                        INR {earnedWage.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Emergency Contact</span>
                      <strong className="font-mono text-slate-900">
                        {profileLab.emergency_contact || profileLab.phone}
                      </strong>
                    </div>
                  </div>

                  {/* KYC & Health Checkup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-blue-700" />
                          KYC &amp; e-Shram Status
                        </span>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {profileLab.kyc_status || 'VERIFIED'}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        {profileLab.kyc_document_ref || 'Aadhaar & e-Shram Card Verified'}
                      </p>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleToggleKyc(profileLab)}
                          className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold border border-blue-200 cursor-pointer"
                        >
                          {profileLab.kyc_status === 'VERIFIED'
                            ? 'Request KYC Re-Verification'
                            : 'Verify KYC Now'}
                        </button>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <HeartPulse className="w-4 h-4 text-emerald-700" />
                          Health Checkup Status
                        </span>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {profileLab.health_status || 'FIT_FOR_DUTY'}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Checkup Date: <span className="font-mono">{profileLab.health_checkup_date || '2026-10-01'}</span>
                      </p>
                      {perms.canViewMedicalNotes ? (
                        <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                          <strong>Medical Notes:</strong>{' '}
                          {profileLab.medical_notes || 'Cleared for scaffolding and heavy site operations.'}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Medical notes restricted to Admin &amp; HR.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Assigned Tasks */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1.5">Assigned Site Tasks</h4>
                    <div className="space-y-1">
                      {tasks
                        .filter((t) => t.labour_id === profileLab.labour_id)
                        .map((t) => (
                          <div
                            key={t.task_id}
                            className="p-2 rounded border border-slate-200 flex justify-between"
                          >
                            <span>{t.task_name}</span>
                            <span className="font-mono font-semibold">{t.status}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Wage Settlements & Leave History */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1.5">
                      Wage Settlements &amp; Leave History
                    </h4>
                    <div className="space-y-1">
                      {labSalaries.map((s) => (
                        <div
                          key={s.salary_id}
                          className="p-2 rounded bg-emerald-50/40 border border-emerald-200 flex justify-between font-mono"
                        >
                          <span>Wage Slip ({s.month})</span>
                          <span className="font-bold">
                            INR {s.net_salary.toLocaleString('en-IN')}
                          </span>
                          <span>{s.payment_status}</span>
                        </div>
                      ))}
                      {leaves
                        .filter((l) => l.labour_id === profileLab.labour_id)
                        .map((l) => (
                          <div
                            key={l.leave_id}
                            className="p-2 rounded bg-amber-50/50 border border-amber-200 flex justify-between"
                          >
                            <span>
                              Leave ({l.leave_type}): {l.from_date} → {l.to_date}
                            </span>
                            <span className="font-mono font-semibold">{l.status}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Labourer Record"
        message={`Are you sure you want to delete ${deleteTarget?.name} (${deleteTarget?.user_id || `#${deleteTarget?.labour_id}`}) from the labour directory?`}
        confirmLabel="Delete Labourer"
        onConfirm={() => {
          if (deleteTarget) deleteLabour(deleteTarget.labour_id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
