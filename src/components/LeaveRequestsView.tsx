import React, { useState } from 'react';
import { Clock, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { LeaveRecord } from '../types';

export const LeaveRequestsView: React.FC = () => {
  const {
    leaves,
    labours,
    currentRole,
    submitLeave,
    updateLeaveStatus,
  } = useWorkforce();

  const canApprove = currentRole === 'Admin' || currentRole === 'HR Manager';

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [labourId, setLabourId] = useState<number>(labours[0]?.labour_id || 101);
  const [leaveType, setLeaveType] = useState<LeaveRecord['leave_type']>('CASUAL');
  const [fromDate, setFromDate] = useState<string>('2026-10-24');
  const [toDate, setToDate] = useState<string>('2026-10-26');
  const [reason, setReason] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await submitLeave({
      labour_id: labourId,
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
            Labour Leave Requests &amp; Approvals
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connected to <code className="font-mono text-blue-700">public.leaves</code> · Submit
            worker leave applications and record manager approvals
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit Leave Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-700" />
            <span>Submit Leave Application</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create a new leave request in <code className="font-mono">public.leaves</code>
          </p>

          <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Labourer</label>
              <select
                value={labourId}
                onChange={(e) => setLabourId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {labours.map((l) => (
                  <option key={l.labour_id} value={l.labour_id}>
                    #{l.labour_id} · {l.name} ({l.skill})
                  </option>
                ))}
              </select>
            </div>

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
              Submit Leave Request
            </button>
          </form>
        </div>

        {/* Leave Requests Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">ID &amp; Worker</th>
                  <th className="py-3 px-4">Leave Type &amp; Dates</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status &amp; Approver</th>
                  <th className="py-3 px-4 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredLeaves.map((lv) => {
                  const lab = labours.find((l) => l.labour_id === lv.labour_id);
                  return (
                    <tr key={lv.leave_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {lab?.name || `Labour #${lv.labour_id}`}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Leave #{lv.leave_id} · {lab?.skill}
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
                            {lv.status === 'PENDING' ? 'HR Review' : 'Closed'}
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
