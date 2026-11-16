import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Plus, CheckCircle2, XCircle, ShieldCheck, UserCheck, Wrench } from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { LeaveRecord } from '../types';
import { getRolePermissions } from '../utils/workforceLogic';

interface ApplicantOption {
  userId: string;
  numericId: number;
  name: string;
  skillOrTrade: string;
  workerType: 'LABOUR' | 'EMPLOYEE' | 'SUPERVISOR';
  phone: string;
  workEmail: string;
}

export const LeaveRequestsView: React.FC = () => {
  const {
    leaves,
    labours,
    employees,
    siteSupervisors,
    currentUser,
    currentRole,
    submitLeave,
    updateLeaveStatus,
  } = useWorkforce();

  const permissions = getRolePermissions(currentRole);
  const canApprove =
    permissions.canApproveLeaves && (currentRole === 'Admin' || currentRole === 'HR Manager');
  const canSubmit =
    permissions.canSubmitLeaves &&
    (currentRole === 'Site Supervisor' ||
      currentRole === 'Labourer' ||
      currentRole === 'Employee');

  // Build complete directory of applicants with guaranteed string user_id (never raw numbers)
  const allApplicants = useMemo<ApplicantOption[]>(() => {
    const labList: ApplicantOption[] = labours.map((l, idx) => {
      const rawIdx = l.labour_id > 100 ? l.labour_id - 100 : l.labour_id || idx + 1;
      const userId =
        l.user_id && /^[A-Z]+\d+$/i.test(l.user_id)
          ? l.user_id.toUpperCase()
          : l.labour_code && /^LAB\d+$/i.test(l.labour_code)
          ? l.labour_code.toUpperCase()
          : `LAB${String(Math.max(1, rawIdx)).padStart(3, '0')}`;
      const skill = l.skill_or_trade || l.skill || 'Mason';
      return {
        userId,
        numericId: l.labour_id,
        name: l.full_name || l.name,
        skillOrTrade: skill,
        workerType: 'LABOUR',
        phone: l.phone || '',
        workEmail: l.work_email || '',
      };
    });

    const supList: ApplicantOption[] = siteSupervisors.map((s, idx) => {
      const userId =
        s.user_id && /^[A-Z]+\d+$/i.test(s.user_id)
          ? s.user_id.toUpperCase()
          : `SUP${String(s.supervisor_id || idx + 1).padStart(3, '0')}`;
      return {
        userId,
        numericId: s.supervisor_id,
        name: s.full_name || s.name,
        skillOrTrade: s.specialization || 'Site Supervisor',
        workerType: 'SUPERVISOR',
        phone: s.phone || '',
        workEmail: s.work_email || s.email || '',
      };
    });

    const empList: ApplicantOption[] = employees.map((e, idx) => {
      const rawIdx = e.employee_id > 200 ? e.employee_id - 200 : e.employee_id || idx + 1;
      const userId =
        e.user_id && /^[A-Z]+\d+$/i.test(e.user_id)
          ? e.user_id.toUpperCase()
          : `EMP${String(Math.max(1, rawIdx)).padStart(3, '0')}`;
      return {
        userId,
        numericId: e.employee_id,
        name: e.full_name || e.name,
        skillOrTrade: e.designation || e.department || 'Engineer',
        workerType: 'EMPLOYEE',
        phone: e.phone || '',
        workEmail: e.work_email || e.email || '',
      };
    });

    return [...labList, ...supList, ...empList];
  }, [labours, siteSupervisors, employees]);

  // Filter dropdown options according to the submitting role
  const roleApplicantOptions = useMemo<ApplicantOption[]>(() => {
    if (currentRole === 'Employee') {
      return allApplicants.filter((a) => a.workerType === 'EMPLOYEE');
    }
    if (currentRole === 'Site Supervisor') {
      return allApplicants.filter(
        (a) => a.workerType === 'SUPERVISOR' || a.workerType === 'LABOUR'
      );
    }
    if (currentRole === 'Labourer') {
      return allApplicants.filter((a) => a.workerType === 'LABOUR');
    }
    return allApplicants;
  }, [allApplicants, currentRole]);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string>(
    roleApplicantOptions[0]?.userId || 'LAB001'
  );
  const [leaveType, setLeaveType] = useState<LeaveRecord['leave_type']>('CASUAL');
  const [fromDate, setFromDate] = useState<string>('2026-10-24');
  const [toDate, setToDate] = useState<string>('2026-10-26');
  const [reason, setReason] = useState<string>('');

  // Keep selectedUserId synced when role switches
  useEffect(() => {
    if (!roleApplicantOptions.length) return;
    const currentEmail = (currentUser?.email || '').toLowerCase();
    const matchedSelf = roleApplicantOptions.find(
      (a) =>
        (currentUser?.user_id &&
          a.userId.toLowerCase() === String(currentUser.user_id).toLowerCase()) ||
        (currentEmail && a.workEmail.toLowerCase() === currentEmail)
    );
    if (matchedSelf) {
      setSelectedUserId(matchedSelf.userId);
    } else if (!roleApplicantOptions.some((a) => a.userId === selectedUserId)) {
      setSelectedUserId(roleApplicantOptions[0].userId);
    }
  }, [roleApplicantOptions, currentUser, selectedUserId]);

  const selectedApplicant = useMemo(
    () =>
      roleApplicantOptions.find((a) => a.userId === selectedUserId) ||
      allApplicants.find((a) => a.userId === selectedUserId) ||
      roleApplicantOptions[0],
    [roleApplicantOptions, allApplicants, selectedUserId]
  );

  // Resolve any LeaveRecord row to its canonical User ID, Name, and Skill/Trade
  const resolveLeaveApplicant = (lv: LeaveRecord) => {
    const rawKey = String(lv.user_id || lv.labour_id || '').trim().toUpperCase();
    let matched = allApplicants.find((a) => a.userId.toUpperCase() === rawKey);

    if (!matched && /^\d+$/.test(rawKey)) {
      const num = parseInt(rawKey, 10);
      const paddedLab = `LAB${String(num > 100 ? num - 100 : num).padStart(3, '0')}`;
      matched =
        allApplicants.find((a) => a.userId === paddedLab) ||
        allApplicants.find((a) => a.numericId === num);
    }

    if (!matched && lv.worker_name) {
      matched = allApplicants.find(
        (a) => a.name.toLowerCase() === lv.worker_name?.trim().toLowerCase()
      );
    }

    const userId =
      matched?.userId ||
      (/^[A-Z]+\d+$/i.test(rawKey)
        ? rawKey
        : `LAB${String(Number(rawKey.replace(/\D+/g, '') || 1)).padStart(3, '0')}`);
    const workerName = lv.worker_name || matched?.name || `Worker (${userId})`;
    const skillOrTrade = lv.skill_or_trade || matched?.skillOrTrade || 'Mason';

    return {
      userId,
      workerName,
      skillOrTrade,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !reason.trim() || !selectedApplicant) return;

    await submitLeave({
      labour_id: selectedApplicant.userId,
      user_id: selectedApplicant.userId,
      worker_name: selectedApplicant.name,
      skill_or_trade: selectedApplicant.skillOrTrade,
      phone: selectedApplicant.phone,
      work_email: selectedApplicant.workEmail,
      worker_type: selectedApplicant.workerType,
      leave_type: leaveType,
      from_date: fromDate,
      to_date: toDate,
      reason: reason.trim(),
    });
    setReason('');
  };

  const filteredLeaves = leaves.filter(
    (l) => statusFilter === 'ALL' || l.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Workforce Leave Requests &amp; Approvals
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Only Site Supervisors, Labourers, and Employees can submit leave applications · Only HR Managers and Admins can approve or reject
          </p>
        </div>

        <select
          aria-label="Filter leave requests by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium self-start"
        >
          <option value="ALL">All Leave Applications ({leaves.length})</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {/* Role Access Policy Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-blue-950 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Active Role: <strong className="font-semibold">{currentRole}</strong> —{' '}
            {canSubmit
              ? 'Authorized to submit leave applications (Approval restricted to HR Manager & Admin).'
              : canApprove
              ? 'Authorized to approve or reject leave applications (Submission restricted to Site Supervisor, Labourer & Employee).'
              : 'Read-only leave register view.'}
          </span>
        </div>
        <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-white border border-blue-200 text-blue-800 font-semibold">
          {canSubmit ? 'SUBMIT_ENABLED' : canApprove ? 'APPROVAL_AUTHORITY' : 'VIEW_ONLY'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit Leave Form — ONLY visible for Site Supervisor, Labourer, and Employee */}
        {canSubmit && (
          <div data-testid="leave-submit-form-card" className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-700" />
              <span>Submit Leave Application</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select User ID to submit leave application for HR &amp; Admin approval
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Applicant (User ID · Name · Skill/Trade) *
                </label>
                <select
                  data-testid="leave-applicant-select"
                  aria-label="Select applicant by User ID"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                >
                  {roleApplicantOptions.map((applicant) => (
                    <option key={applicant.userId} value={applicant.userId}>
                      {applicant.userId} · {applicant.name} ({applicant.skillOrTrade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Applicant User ID, Name & Skill/Trade Summary Box */}
              {selectedApplicant && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">User ID</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedApplicant.userId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Applicant Name</span>
                    <span className="font-semibold text-slate-900">{selectedApplicant.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Skill / Trade</span>
                    <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedApplicant.skillOrTrade}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveRecord['leave_type'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                >
                  <option value="CASUAL">CASUAL</option>
                  <option value="SICK">SICK</option>
                  <option value="EMERGENCY">EMERGENCY</option>
                  <option value="UNPAID">UNPAID</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State medical or family reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                Submit Leave Application
              </button>
            </form>
          </div>
        )}

        {/* Leave Requests Table */}
        <div
          className={`${
            canSubmit ? 'lg:col-span-2' : 'lg:col-span-3'
          } bg-white rounded-xl border border-slate-200 overflow-hidden`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Worker Name &amp; Skill / Trade</th>
                  <th className="py-3 px-4">Leave Type &amp; Dates</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status &amp; Approver</th>
                  <th className="py-3 px-4 text-right">HR / Admin Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredLeaves.map((lv) => {
                  const resolved = resolveLeaveApplicant(lv);
                  return (
                    <tr key={lv.leave_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md font-mono text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {resolved.userId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{resolved.workerName}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Wrench className="w-3 h-3" />
                            {resolved.skillOrTrade}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Applied: {lv.applied_on}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-slate-800">{lv.leave_type}</div>
                        <div className="text-[11px] text-slate-500">
                          {lv.from_date} → {lv.to_date}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{lv.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                            lv.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : lv.status === 'REJECTED'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {lv.status}
                        </span>
                        {lv.approved_by && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            By: {lv.approved_by}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canApprove && lv.status === 'PENDING' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateLeaveStatus(lv.leave_id, 'APPROVED')}
                              className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLeaveStatus(lv.leave_id, 'REJECTED')}
                              className="px-2.5 py-1 rounded bg-white border border-red-200 text-red-700 font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {lv.status === 'PENDING' ? 'Pending HR/Admin Approval' : 'Closed'}
                          </span>
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
    </div>
  );
};
