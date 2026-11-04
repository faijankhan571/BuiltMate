import React from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { generateCsvString } from '../utils/workforceLogic';

export const ReportsView: React.FC = () => {
  const {
    employees,
    labours,
    projects,
    sites,
    attendance,
    tasks,
    leaves,
    salaries,
    materials,
    taskMaterials,
  } = useWorkforce();

  const downloadCsv = (filename: string, headers: string[], rows: Record<string, any>[]) => {
    const csv = generateCsvString(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trade distribution
  const skillCounts = labours.reduce<Record<string, number>>((acc, l) => {
    acc[l.skill] = (acc[l.skill] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Operational Reports &amp; Workforce Analytics
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Live cross-table summaries across workforce distribution, site attendance, task
            execution, material stock, and payroll
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'buildforce_attendance_report.csv',
                ['attendance_id', 'site_id', 'employee_id', 'labour_id', 'attendance_date', 'status', 'hours_worked'],
                attendance
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Attendance CSV</span>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'buildforce_salary_report.csv',
                ['salary_id', 'employee_id', 'month', 'basic_salary', 'overtime', 'deductions', 'net_salary', 'payment_status'],
                salaries
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Payroll CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Workforce Distribution Report */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-display text-base font-bold text-slate-900">
            1. Workforce Skill &amp; Role Distribution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {employees.length} Salaried Staff · {labours.length} Skilled Field Labourers
          </p>
          <div className="mt-4 space-y-2.5 text-xs">
            {Object.entries(skillCounts).map(([skill, count]) => (
              <div key={skill}>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-700">{skill}</span>
                  <span className="font-mono font-bold text-slate-900">{count} workers</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${(count / Math.max(1, labours.length)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Site Attendance Report */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-display text-base font-bold text-slate-900">
            2. Site Attendance &amp; Shift Hours Summary
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated muster logs per construction site
          </p>
          <div className="mt-4 divide-y divide-slate-200 text-xs">
            {sites.map((site) => {
              const logs = attendance.filter((a) => a.site_id === site.site_id);
              const present = logs.filter(
                (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
              ).length;
              const hours = logs.reduce((acc, l) => acc + Number(l.hours_worked || 0), 0);
              return (
                <div key={site.site_id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{site.site_name}</span>
                    <span className="block text-[11px] text-slate-500">{site.location}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-700">{present}/{logs.length} Present</span>
                    <span className="block text-[11px] text-slate-500">{hours} Total Hrs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Project & Task Progress Report */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-display text-base font-bold text-slate-900">
            3. Project &amp; Task Progress Report
          </h2>
          <div className="mt-4 divide-y divide-slate-200 text-xs">
            {projects.map((p) => {
              const pTasks = tasks.filter((t) => t.project_id === p.project_id);
              const done = pTasks.filter((t) => t.status === 'COMPLETED').length;
              const delayed = pTasks.filter((t) => t.status === 'DELAYED').length;
              return (
                <div key={p.project_id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{p.project_name}</span>
                    <span className="block text-[11px] text-slate-500">
                      Status: {p.status} · Budget: INR {(p.budget / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900">{done}/{pTasks.length} Completed</span>
                    {delayed > 0 && (
                      <span className="block text-[11px] text-red-700">{delayed} Delayed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Material Usage & Stock Report + Salary/Leave Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              4. Material Consumption &amp; Payroll Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inventory valuation, task material usage, and leave status
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Material Consumption Cost</span>
              <strong className="font-mono text-base text-slate-900">
                INR{' '}
                {taskMaterials
                  .reduce((acc, tm) => acc + tm.total_cost, 0)
                  .toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Low / Out-of-Stock Items</span>
              <strong className="font-mono text-base text-amber-700">
                {materials.filter((m) => m.status !== 'IN_STOCK').length} / {materials.length} Items
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Total Net Salary Ledger</span>
              <strong className="font-mono text-base text-emerald-700">
                INR{' '}
                {salaries
                  .reduce((acc, s) => acc + s.net_salary, 0)
                  .toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Leave Requests Summary</span>
              <strong className="font-mono text-base text-slate-900">
                {leaves.filter((l) => l.status === 'PENDING').length} Pending / {leaves.length} Total
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
