import React, { useState } from 'react';
import { UserCog, Plus, CheckCircle2, XCircle, Wallet, Users, Clock } from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { ModuleId } from '../utils/workforceLogic';

interface HrManagementViewProps {
  onNavigate: (module: ModuleId) => void;
}

export const HrManagementView: React.FC<HrManagementViewProps> = ({ onNavigate }) => {
  const {
    hrManagers,
    employees,
    labours,
    leaves,
    salaries,
    currentRole,
    addHrManager,
    updateLeaveStatus,
    updateSalaryStatus,
  } = useWorkforce();

  const canManageHr = currentRole === 'Admin' || currentRole === 'HR Manager';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleAddHr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    await addHrManager({
      user_id: null,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '+91 98200 00000',
    });
    setName('');
    setEmail('');
    setPhone('');
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');
  const pendingSalaries = salaries.filter((s) => s.payment_status !== 'PAID');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            HR Management &amp; Workforce Governance
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connected to <code className="font-mono text-blue-700">public.hr_managers</code>,
            employee administration, salary disbursements, and leave approvals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('employees')}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            Employee Roster ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('salary')}
            className="px-3.5 py-2 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
          >
            Open Full Payroll Register
          </button>
        </div>
      </div>

      {/* HR Managers Directory & Registration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-blue-700" />
            <span>Registered HR Managers (public.hr_managers)</span>
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-3">HR ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Processed Payrolls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {hrManagers.map((hr) => {
                  const count = salaries.filter((s) => s.hr_id === hr.hr_id).length;
                  return (
                    <tr key={hr.hr_id}>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">
                        #{hr.hr_id}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{hr.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{hr.email}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{hr.phone}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {count} records
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add HR Manager Form */}
        {canManageHr && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-display text-base font-bold text-slate-900">
              Add HR Officer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Insert new record into <code className="font-mono">public.hr_managers</code>
            </p>
            <form onSubmit={handleAddHr} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meera Krishnan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  placeholder="meera.hr@buildforce.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="+91 98201 55110"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add HR Manager</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Leave Approval Queue & Pending Salary Disbursements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Approval Workflow */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Labour Leave Approval Queue</span>
              </h3>
              <p className="text-xs text-slate-500">
                Approve or reject pending worker leave requests
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {pendingLeaves.length} Pending
            </span>
          </div>

          {pendingLeaves.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              All leave requests have been reviewed.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((lv) => {
                const worker = labours.find((l) => l.labour_id === lv.labour_id);
                return (
                  <div
                    key={lv.leave_id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {worker?.name || `Labourer #${lv.labour_id}`} ({worker?.skill})
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        {lv.leave_type}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">{lv.reason}</p>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-slate-500">
                        {lv.from_date} to {lv.to_date}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateLeaveStatus(lv.leave_id, 'APPROVED')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLeaveStatus(lv.leave_id, 'REJECTED')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-red-200 text-red-700 font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Salary Disbursement Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span>Pending Salary Disbursements</span>
              </h3>
              <p className="text-xs text-slate-500">
                Authorize pending monthly employee salary payouts
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
              {pendingSalaries.length} Awaiting Payout
            </span>
          </div>

          {pendingSalaries.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              All monthly salaries are marked PAID.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingSalaries.map((sal) => {
                const emp = employees.find((e) => e.employee_id === sal.employee_id);
                return (
                  <div
                    key={sal.salary_id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {emp?.name || `Employee #${sal.employee_id}`}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Month: {sal.month} · Net: INR {sal.net_salary.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSalaryStatus(sal.salary_id, 'PAID')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Mark PAID
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
