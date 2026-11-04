import React, { useState } from 'react';
import {
  Plus,
  Printer,
  X,
  HardHat,
  Calculator,
  CreditCard,
  CheckCircle2,
  Wallet,
  CalendarCheck,
  TrendingUp,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { SalaryRecord, PaymentStatus } from '../types';
import {
  calculateNetSalary,
  calculateWorkerAttendanceMetrics,
  getRolePermissions,
} from '../utils/workforceLogic';

export const PayrollView: React.FC = () => {
  const {
    currentUser,
    salaries,
    employees,
    labours,
    hrManagers,
    attendance,
    currentRole,
    createSalaryRecord,
    recordSalaryPayment,
  } = useWorkforce();

  const perms = getRolePermissions(currentRole);
  const canManagePayroll = perms.canManageSalary;

  const [activeTab, setActiveTab] = useState<'ledger' | 'attendance_calc'>('ledger');
  const [modalOpen, setModalOpen] = useState(false);
  const [statementRecord, setStatementRecord] = useState<SalaryRecord | null>(null);
  const [paymentModalRecord, setPaymentModalRecord] = useState<SalaryRecord | null>(null);
  const [selectedEmpMonth, setSelectedEmpMonth] = useState<string>('2026-10');

  // Create Salary / Wage Slip Form
  const [workerType, setWorkerType] = useState<'EMPLOYEE' | 'LABOUR'>('EMPLOYEE');
  const [employeeId, setEmployeeId] = useState<number>(employees[0]?.employee_id || 201);
  const [labourId, setLabourId] = useState<number>(labours[0]?.labour_id || 101);
  const [month, setMonth] = useState<string>('2026-10');
  const [basicSalary, setBasicSalary] = useState<number>(65000);
  const [overtime, setOvertime] = useState<number>(4000);
  const [deductions, setDeductions] = useState<number>(2000);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');

  // Record Payment Transaction Modal State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('NEFT/RTGS');
  const [payRef, setPayRef] = useState<string>('UTR202610259918');

  const previewNet = calculateNetSalary(basicSalary, overtime, deductions);

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

  if (
    (currentRole === 'Employee' && loggedInEmployee) ||
    (currentRole === 'Labourer' && loggedInLabourer)
  ) {
    const isLabourerRole = currentRole === 'Labourer';
    const displayName =
      currentUser?.full_name ||
      currentUser?.name ||
      (isLabourerRole ? loggedInLabourer.name : loggedInEmployee.name);

    const mySalaries = isLabourerRole
      ? salaries.filter((s) => s.labour_id === loggedInLabourer.labour_id)
      : salaries.filter(
          (s) =>
            s.employee_id === loggedInEmployee.employee_id && s.worker_type !== 'LABOUR'
        );

    const activeSlip =
      mySalaries.find((s) => s.month === selectedEmpMonth) || mySalaries[0];

    const standardWorkingDays = 26;
    const perDaySalaryRate = isLabourerRole
      ? loggedInLabourer.wage_rate || 950
      : Math.round(
          (activeSlip?.basic_salary || loggedInEmployee.monthly_salary || 68000) /
            standardWorkingDays
        );
    const perHourOvertimeRate = isLabourerRole
      ? loggedInLabourer.hourly_rate || Math.round(perDaySalaryRate / 8)
      : Math.round(perDaySalaryRate / 8);

    const myAttendanceMetrics = calculateWorkerAttendanceMetrics(
      attendance,
      isLabourerRole
        ? {
            labour_id: loggedInLabourer.labour_id,
            monthPrefix: selectedEmpMonth,
            daily_rate: perDaySalaryRate,
            hourly_rate: perHourOvertimeRate,
            wage_type: loggedInLabourer.wage_type || 'DAILY',
          }
        : {
            employee_id: loggedInEmployee.employee_id,
            monthPrefix: selectedEmpMonth,
            monthly_salary:
              activeSlip?.basic_salary || loggedInEmployee.monthly_salary || 68000,
          }
    );

    const workedDaysCount =
      activeSlip?.worked_days ??
      activeSlip?.days_present ??
      Math.max(isLabourerRole ? 24 : 22, myAttendanceMetrics.effectiveWorkedDays);
    const workedHoursCount =
      activeSlip?.worked_hours ??
      activeSlip?.hours_worked ??
      Math.max(isLabourerRole ? 198.5 : 176, myAttendanceMetrics.totalHours);

    const monthlyContractBase =
      activeSlip?.basic_salary ??
      (isLabourerRole
        ? Math.round(workedDaysCount * perDaySalaryRate)
        : loggedInEmployee.monthly_salary || 68000);

    const overtimeAmount =
      activeSlip?.overtime ?? myAttendanceMetrics.computedOvertimePay;
    const deductionAmount = activeSlip?.deductions ?? (isLabourerRole ? 800 : 3600);
    const epfContribution = Math.round(deductionAmount * 0.65);
    const professionalTaxAndTds = deductionAmount - epfContribution;
    const netSalaryAmount =
      activeSlip?.net_salary ??
      calculateNetSalary(monthlyContractBase, overtimeAmount, deductionAmount);
    const grossEarnings = monthlyContractBase + overtimeAmount;

    const totalEarnedYtd = mySalaries.reduce((sum, s) => sum + s.net_salary, 0);
    const workerIdDisplay = isLabourerRole
      ? `#${loggedInLabourer.labour_id} (${loggedInLabourer.user_id || 'LAB001'})`
      : `#${loggedInEmployee.employee_id} (${loggedInEmployee.user_id || 'EMP001'})`;
    const workerDesignationDisplay = isLabourerRole
      ? loggedInLabourer.skill
      : loggedInEmployee.designation;

    return (
      <div
        data-testid={
          isLabourerRole ? 'labourer-my-salary-view' : 'employee-my-salary-view'
        }
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                My Salary — {displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Personal Salary Calculations Only
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {isLabourerRole ? 'Labourer ID:' : 'Employee ID:'}{' '}
              <strong className="font-mono text-slate-900">{workerIdDisplay}</strong> ·{' '}
              {isLabourerRole ? 'Trade / Skill:' : 'Designation:'}{' '}
              <strong className="text-slate-900">{workerDesignationDisplay}</strong> ·{' '}
              {isLabourerRole ? (
                <>
                  Wage Rate:{' '}
                  <strong className="font-mono text-emerald-700">
                    INR {perDaySalaryRate.toLocaleString('en-IN')}/day
                  </strong>
                </>
              ) : (
                <>
                  Department:{' '}
                  <strong className="text-slate-900">
                    {loggedInEmployee.department || 'Structural Engineering'}
                  </strong>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <span className="font-semibold text-slate-600">Pay Period:</span>
              <select
                aria-label="Select Salary Month"
                value={selectedEmpMonth}
                onChange={(e) => setSelectedEmpMonth(e.target.value)}
                className="font-mono font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {Array.from(
                  new Set(['2026-10', '2026-09', ...mySalaries.map((s) => s.month)])
                ).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {activeSlip && (
              <button
                type="button"
                onClick={() => setStatementRecord(activeSlip)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View &amp; Print Official Salary Slip</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Monthly Basic Salary</span>
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <p className="font-mono text-2xl font-bold text-slate-900 mt-2">
              INR {monthlyContractBase.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              Daily Rate: INR {perDaySalaryRate.toLocaleString('en-IN')}/day (26 days)
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Overtime &amp; Allowances (+)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-mono text-2xl font-bold text-emerald-700 mt-2">
              +INR {overtimeAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              {workedDaysCount} Worked Days · {workedHoursCount}h Total Logged
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Statutory Deductions (-)</span>
              <Calculator className="w-4 h-4 text-amber-600" />
            </div>
            <p className="font-mono text-2xl font-bold text-red-700 mt-2">
              -INR {deductionAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              EPF: INR {epfContribution.toLocaleString('en-IN')} · PT/Tax: INR{' '}
              {professionalTaxAndTds.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300">
              <span>Net Take-Home Salary ({selectedEmpMonth})</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p
              data-testid="employee-net-salary-amount"
              className="font-mono text-2xl font-bold text-emerald-400 mt-2"
            >
              INR {netSalaryAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-300 mt-2 font-mono">
              Status: {activeSlip?.payment_status || 'PAID'} · YTD: INR{' '}
              {totalEarnedYtd.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Detailed Salary Calculation Breakdown Card */}
        <div
          data-testid="employee-salary-calculation-card"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left 7 Cols: Step-by-Step Salary Formula & Breakdown */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  My Salary Calculation Breakdown ({selectedEmpMonth})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transparent step-by-step computation from your contract base, attendance logs, and statutory deductions
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-semibold">
                Formula Verified
              </span>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 block">Standard Cycle</span>
                  <strong className="font-mono text-sm text-slate-900">
                    {standardWorkingDays} Working Days
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Per-Day Base Rate</span>
                  <strong className="font-mono text-sm text-slate-900">
                    INR {perDaySalaryRate.toLocaleString('en-IN')} / day
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Overtime Hourly Rate</span>
                  <strong className="font-mono text-sm text-slate-900">
                    INR {perHourOvertimeRate.toLocaleString('en-IN')} / hr
                  </strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 font-mono">
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-sans font-semibold text-slate-900 block">
                      1. Basic Monthly Salary ({workedDaysCount} Payable Days)
                    </span>
                    <span className="font-sans text-[11px] text-slate-500">
                      Contractual fixed basic pay &amp; dearness allowance
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    INR {monthlyContractBase.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between bg-emerald-50/40">
                  <div>
                    <span className="font-sans font-semibold text-emerald-900 block">
                      2. Overtime &amp; Engineering Allowance (+)
                    </span>
                    <span className="font-sans text-[11px] text-emerald-700">
                      Calculated from logged hours ({workedHoursCount} hrs total)
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">
                    +INR {overtimeAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between bg-slate-50">
                  <span className="font-sans font-semibold text-slate-700">
                    Gross Monthly Earnings (1 + 2)
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    INR {grossEarnings.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between bg-red-50/30">
                  <div>
                    <span className="font-sans font-semibold text-red-900 block">
                      3. Statutory Deductions: EPF (INR {epfContribution.toLocaleString('en-IN')}) + Prof. Tax/TDS (INR {professionalTaxAndTds.toLocaleString('en-IN')})
                    </span>
                    <span className="font-sans text-[11px] text-red-700">
                      Provident Fund &amp; standard monthly tax deduction
                    </span>
                  </div>
                  <span className="text-sm font-bold text-red-700">
                    -INR {deductionAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-4 bg-slate-900 text-white flex items-center justify-between rounded-b-xl">
                  <div>
                    <span className="font-sans text-xs font-bold uppercase tracking-wider text-amber-400 block">
                      Final Net Payable Salary (Gross - Deductions)
                    </span>
                    <span className="font-sans text-[11px] text-slate-300">
                      {monthlyContractBase.toLocaleString('en-IN')} +{' '}
                      {overtimeAmount.toLocaleString('en-IN')} -{' '}
                      {deductionAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">
                    INR {netSalaryAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Live Attendance-to-Salary Link & Bank Disbursement */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>My Attendance Impact on Salary</span>
                </h3>
                <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                  {myAttendanceMetrics.attendanceRate}% Attendance
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Logged Present Days</span>
                  <strong className="font-mono text-base text-emerald-700">
                    {myAttendanceMetrics.presentDays} Days
                  </strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Half-Days / Leaves</span>
                  <strong className="font-mono text-base text-slate-900">
                    {myAttendanceMetrics.halfDays} Half · {myAttendanceMetrics.leaveDays} Leave
                  </strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Overtime Logged</span>
                  <strong className="font-mono text-base text-blue-700">
                    +{myAttendanceMetrics.overtimeHours} hrs
                  </strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Loss of Pay (Absent)</span>
                  <strong className="font-mono text-base text-slate-900">
                    {myAttendanceMetrics.absentDays} Days (INR 0)
                  </strong>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="font-semibold">Bank &amp; Disbursement Verification</div>
                <div className="font-mono text-[11px] text-blue-900">
                  Method: {activeSlip?.payment_method || 'NEFT/RTGS'} · UTR:{' '}
                  {activeSlip?.transaction_ref || 'HDFC00029184710'}
                </div>
                <div className="text-[11px] text-blue-800">
                  Disbursement Date: {activeSlip?.payment_date || '2026-10-20'} · Status:{' '}
                  <strong>{activeSlip?.payment_status || 'PAID'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Personal Salary Slips History Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                My Monthly Salary Slips &amp; Payment Ledger ({mySalaries.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing only salary records belonging to {displayName} ({workerIdDisplay})
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Slip ID &amp; Month</th>
                  <th className="py-3.5 px-4">Payable Days &amp; Hours</th>
                  <th className="py-3.5 px-4">Basic Salary</th>
                  <th className="py-3.5 px-4">Overtime (+)</th>
                  <th className="py-3.5 px-4">Deductions (-)</th>
                  <th className="py-3.5 px-4">Net Salary</th>
                  <th className="py-3.5 px-4">Payment Status &amp; UTR</th>
                  <th className="py-3.5 px-4 text-right">Salary Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {mySalaries.map((sal) => (
                  <tr key={sal.salary_id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-slate-900">{sal.month}</span>
                      <span className="block text-[11px] text-slate-400">
                        Slip #{sal.salary_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {sal.worked_days ?? sal.days_present ?? 22}d ·{' '}
                      {sal.worked_hours ?? sal.hours_worked ?? 180}h
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-800">
                      INR {sal.basic_salary.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-700">
                      +INR {sal.overtime.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-red-700">
                      -INR {sal.deductions.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      INR {sal.net_salary.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                          sal.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {sal.payment_status}
                      </span>
                      {sal.transaction_ref && (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          UTR: {sal.transaction_ref}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setStatementRecord(sal)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Salary Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Printable Salary Statement Modal */}
        {statementRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
            <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl text-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      BuildMate Official Employee Salary Slip
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Statement #{statementRecord.salary_id} · Period: {statementRecord.month}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatementRecord(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">
                      {isLabourerRole ? 'Labourer Name' : 'Employee Name'}
                    </span>
                    <strong className="text-slate-900">{displayName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      {isLabourerRole ? 'Trade / Skill' : 'Designation'}
                    </span>
                    <strong className="text-slate-900">{workerDesignationDisplay}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Payment Method &amp; UTR</span>
                    <strong className="font-mono text-slate-900">
                      {statementRecord.payment_method || 'NEFT/RTGS'} (
                      {statementRecord.transaction_ref || 'HDFC00029184710'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Disbursement Status</span>
                    <strong className="font-mono text-emerald-700">
                      {statementRecord.payment_status} ({statementRecord.payment_date || 'Paid'})
                    </strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 font-mono">
                  <div className="p-3 flex justify-between">
                    <span className="text-slate-600">Monthly Basic Salary</span>
                    <span className="font-semibold">
                      INR {statementRecord.basic_salary.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between text-emerald-700">
                    <span>Overtime &amp; Allowances (+)</span>
                    <span>+INR {statementRecord.overtime.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 flex justify-between text-red-700">
                    <span>PF / Tax Deductions (-)</span>
                    <span>-INR {statementRecord.deductions.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3.5 bg-slate-900 text-white flex justify-between text-sm font-bold rounded-b-lg">
                    <span>Net Take-Home Salary</span>
                    <span>INR {statementRecord.net_salary.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Official Salary Slip</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleAutoFillFromAttendance = (type: 'EMPLOYEE' | 'LABOUR', id: number) => {
    if (type === 'EMPLOYEE') {
      const emp = employees.find((e) => e.employee_id === id);
      const metrics = calculateWorkerAttendanceMetrics(attendance, {
        employee_id: id,
        monthPrefix: month,
      });
      const base = emp?.monthly_salary || 65000;
      const ot = metrics.overtimeHours * 450;
      setBasicSalary(base);
      setOvertime(ot);
      setDeductions(2500);
    } else {
      const lab = labours.find((l) => l.labour_id === id);
      const metrics = calculateWorkerAttendanceMetrics(attendance, {
        labour_id: id,
        monthPrefix: month,
      });
      const dailyRate = lab?.wage_rate || 850;
      const hourlyRate = lab?.hourly_rate || Math.round(dailyRate / 8);
      const base =
        lab?.wage_type === 'HOURLY'
          ? metrics.totalHours * hourlyRate
          : Math.round(metrics.effectiveWorkedDays * dailyRate);
      const ot = metrics.overtimeHours * hourlyRate;
      setBasicSalary(base);
      setOvertime(ot);
      setDeductions(0);
    }
  };

  const handleCreateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    const metrics = calculateWorkerAttendanceMetrics(
      attendance,
      workerType === 'EMPLOYEE'
        ? { employee_id: employeeId, monthPrefix: month }
        : { labour_id: labourId, monthPrefix: month }
    );
    await createSalaryRecord({
      worker_type: workerType,
      employee_id: workerType === 'EMPLOYEE' ? employeeId : employees[0]?.employee_id || 201,
      labour_id: workerType === 'LABOUR' ? labourId : null,
      hr_id: hrManagers[0]?.hr_id || 1,
      month,
      days_present: metrics.effectiveWorkedDays,
      hours_worked: metrics.totalHours,
      basic_salary: basicSalary,
      overtime,
      deductions,
      payment_status: paymentStatus,
    });
    setModalOpen(false);
  };

  const openPaymentModal = (sal: SalaryRecord) => {
    setPaymentModalRecord(sal);
    setPayAmount(sal.net_salary);
    setPayMethod(sal.worker_type === 'LABOUR' ? 'UPI / Bank Transfer' : 'NEFT/RTGS');
    setPayRef(`UTR${Date.now().toString().slice(-8)}`);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalRecord) return;
    await recordSalaryPayment(
      paymentModalRecord.salary_id,
      payAmount,
      payMethod,
      payRef
    );
    setPaymentModalRecord(null);
  };

  const totalPaid = salaries
    .filter((s) => s.payment_status === 'PAID')
    .reduce((acc, s) => acc + s.net_salary, 0);
  const totalPending = salaries
    .filter((s) => s.payment_status !== 'PAID')
    .reduce((acc, s) => acc + (s.pending_amount ?? s.net_salary), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Accountant &amp; Payroll Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connected to <code className="font-mono text-blue-700">public.salary</code> &amp;{' '}
            <code className="font-mono text-blue-700">public.attendance</code> · Calculates Salaried
            Employee Payroll &amp; Daily/Hourly Labour Wages from Logged Attendance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payroll &amp; Payment Ledger ({salaries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attendance_calc')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                activeTab === 'attendance_calc'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance-to-Wage Calculator
            </button>
          </div>

          {canManagePayroll && (
            <button
              type="button"
              onClick={() => {
                handleAutoFillFromAttendance('EMPLOYEE', employeeId);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Payroll / Wage Slip</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Total Disbursed (PAID)
          </span>
          <p className="font-mono text-2xl font-bold text-emerald-700 mt-1">
            INR {totalPaid.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Pending / Unpaid Balance
          </span>
          <p className="font-mono text-2xl font-bold text-amber-700 mt-1">
            INR {totalPending.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Processed Salary &amp; Wage Slips
          </span>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1">
            {salaries.length} Records
          </p>
        </div>
      </div>

      {activeTab === 'ledger' ? (
        /* Salary & Wage Payment Ledger Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Slip ID &amp; Worker</th>
                  <th className="py-3 px-4">Period &amp; Attendance</th>
                  <th className="py-3 px-4">Base / Earned</th>
                  <th className="py-3 px-4">Overtime (+)</th>
                  <th className="py-3 px-4">Deductions (-)</th>
                  <th className="py-3 px-4">Net Payable</th>
                  <th className="py-3 px-4">Payment &amp; Method</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {salaries.map((sal) => {
                  const isLabour = sal.worker_type === 'LABOUR' && sal.labour_id;
                  const emp = employees.find((e) => e.employee_id === sal.employee_id);
                  const lab = isLabour
                    ? labours.find((l) => l.labour_id === sal.labour_id)
                    : null;

                  return (
                    <tr key={sal.salary_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {isLabour
                            ? `${lab?.name || `Labour #${sal.labour_id}`} (Labourer)`
                            : emp?.name || `Employee #${sal.employee_id}`}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          #{sal.salary_id} · {isLabour ? lab?.skill : emp?.designation}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <div>{sal.month}</div>
                        <div className="text-[11px] text-slate-500">
                          {sal.days_present ?? 22}d · {sal.hours_worked ?? 176}h
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        INR {sal.basic_salary.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700">
                        +INR {sal.overtime.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-red-700">
                        -INR {sal.deductions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        INR {sal.net_salary.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                            sal.payment_status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : sal.payment_status === 'PROCESSING' ||
                                sal.payment_status === 'PARTIALLY_PAID'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {sal.payment_status}
                        </span>
                        {sal.payment_method && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {sal.payment_method} {sal.transaction_ref ? `(${sal.transaction_ref})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStatementRecord(sal)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>
                          {canManagePayroll && sal.payment_status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(sal)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
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
      ) : (
        /* Attendance-to-Wage Live Calculation Sheet for Accountant */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-700" />
                <span>Live Attendance-Derived Wage &amp; Overtime Sheet (Skilled Labourers)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Computed directly from <code className="font-mono">public.attendance</code> logs and{' '}
                <code className="font-mono">public.labours</code> daily/hourly rates
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Labourer &amp; Trade</th>
                  <th className="py-3 px-4">Wage Basis</th>
                  <th className="py-3 px-4">Worked Days (P / H / A)</th>
                  <th className="py-3 px-4">Regular &amp; OT Hours</th>
                  <th className="py-3 px-4">Earned Wage (INR)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {labours.map((lab) => {
                  const metrics = calculateWorkerAttendanceMetrics(attendance, {
                    labour_id: lab.labour_id,
                  });
                  const wageType = lab.wage_type || 'DAILY';
                  const hourlyRate = lab.hourly_rate || Math.round(lab.wage_rate / 8);
                  const baseEarned =
                    wageType === 'HOURLY'
                      ? metrics.totalHours * hourlyRate
                      : Math.round(metrics.effectiveWorkedDays * lab.wage_rate);
                  const otEarned =
                    wageType === 'HOURLY' ? 0 : metrics.overtimeHours * hourlyRate;
                  const totalEarned = baseEarned + otEarned;

                  return (
                    <tr key={lab.labour_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{lab.name}</div>
                        <div className="text-[11px] text-slate-500">
                          #{lab.labour_id} · {lab.skill}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div>
                          {wageType === 'HOURLY'
                            ? `₹${hourlyRate} / Hour`
                            : `₹${lab.wage_rate} / Day`}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {wageType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <strong>{metrics.effectiveWorkedDays} days</strong> ({metrics.presentDays}P ·{' '}
                        {metrics.halfDays}H · {metrics.absentDays}A)
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {metrics.totalHours} hrs ({metrics.overtimeHours} hrs OT)
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        INR {totalEarned.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canManagePayroll && (
                          <button
                            type="button"
                            onClick={() => {
                              setWorkerType('LABOUR');
                              setLabourId(lab.labour_id);
                              handleAutoFillFromAttendance('LABOUR', lab.labour_id);
                              setModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                          >
                            Generate Wage Slip
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
      )}

      {/* Create Salary / Wage Record Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl text-xs">
            <h3 className="font-display text-base font-bold text-slate-900 mb-4">
              Generate Attendance-Linked Payroll / Wage Slip
            </h3>
            <form onSubmit={handleCreateSalary} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Worker Category</label>
                <select
                  value={workerType}
                  onChange={(e) => {
                    const wt = e.target.value as 'EMPLOYEE' | 'LABOUR';
                    setWorkerType(wt);
                    handleAutoFillFromAttendance(
                      wt,
                      wt === 'EMPLOYEE' ? employeeId : labourId
                    );
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="EMPLOYEE">Salaried Employee</option>
                  <option value="LABOUR">Skilled Construction Labourer</option>
                </select>
              </div>

              {workerType === 'EMPLOYEE' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employee</label>
                  <select
                    value={employeeId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setEmployeeId(id);
                      handleAutoFillFromAttendance('EMPLOYEE', id);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Labourer</label>
                  <select
                    value={labourId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setLabourId(id);
                      handleAutoFillFromAttendance('LABOUR', id);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {labours.map((lab) => (
                      <option key={lab.labour_id} value={lab.labour_id}>
                        {lab.name} ({lab.skill} · ₹{lab.wage_rate}/day)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payroll Period</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base / Earned</label>
                  <input
                    type="number"
                    min={0}
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Overtime (+)</label>
                  <input
                    type="number"
                    min={0}
                    value={overtime}
                    onChange={(e) => setOvertime(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deductions (-)</label>
                  <input
                    type="number"
                    min={0}
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Calculated Net Payable:</span>
                <span className="font-mono text-base font-bold text-slate-900">
                  INR {previewNet.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="PAID">PAID</option>
                </select>
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
                  Save Payroll Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Transaction Modal */}
      {paymentModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl text-xs">
            <h3 className="font-display text-base font-bold text-slate-900 mb-1">
              Record Salary / Wage Disbursement
            </h3>
            <p className="text-slate-500 mb-4">
              Slip #{paymentModalRecord.salary_id} · Net Payable: INR{' '}
              {paymentModalRecord.net_salary.toLocaleString('en-IN')}
            </p>
            <form onSubmit={handleConfirmPayment} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Disbursement Amount (INR)
                </label>
                <input
                  type="number"
                  min={1}
                  max={paymentModalRecord.net_salary}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="NEFT/RTGS">NEFT / RTGS Bank Transfer</option>
                  <option value="UPI / Instant">UPI / IMPS Transfer</option>
                  <option value="Cheque">Account Payee Cheque</option>
                  <option value="Site Cash Voucher">Site Cash Voucher</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  required
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentModalRecord(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Salary Statement Modal */}
      {statementRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    BuildMate Official Salary / Wage Statement
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Statement #{statementRecord.salary_id} · Period: {statementRecord.month}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatementRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const isLab = statementRecord.worker_type === 'LABOUR' && statementRecord.labour_id;
              const emp = employees.find((e) => e.employee_id === statementRecord.employee_id);
              const lab = isLab
                ? labours.find((l) => l.labour_id === statementRecord.labour_id)
                : null;
              const hr = hrManagers.find((h) => h.hr_id === statementRecord.hr_id);
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-slate-500 block">Worker Name</span>
                      <strong className="text-slate-900">
                        {isLab ? lab?.name : emp?.name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Role / Trade</span>
                      <strong className="text-slate-900">
                        {isLab ? `Labourer (${lab?.skill})` : emp?.designation}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Authorizing Officer</span>
                      <strong className="text-slate-900">{hr?.name || 'Rohan Mehta'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Payment Status</span>
                      <strong className="font-mono text-emerald-700">
                        {statementRecord.payment_status} ({statementRecord.payment_date || 'Pending'})
                      </strong>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 font-mono">
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-600">Base Salary / Earned Wages</span>
                      <span className="font-semibold">
                        INR {statementRecord.basic_salary.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between text-emerald-700">
                      <span>Overtime &amp; Site Allowance (+)</span>
                      <span>+INR {statementRecord.overtime.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-3 flex justify-between text-red-700">
                      <span>PF / Tax / Advance Deductions (-)</span>
                      <span>-INR {statementRecord.deductions.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-3.5 bg-slate-900 text-white flex justify-between text-sm font-bold rounded-b-lg">
                      <span>Net Take-Home Pay</span>
                      <span>INR {statementRecord.net_salary.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
