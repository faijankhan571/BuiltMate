import React from 'react';
import { Download } from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { generateCsvString } from '../utils/workforceLogic';

type ExportableTable =
  | 'employees'
  | 'labours'
  | 'projects'
  | 'sites'
  | 'attendance'
  | 'tasks'
  | 'leaves'
  | 'salary'
  | 'materials'
  | 'suppliers';

const TABLE_METADATA: Record<
  ExportableTable,
  {
    label: string;
    headers: string[];
  }
> = {
  employees: {
    label: 'Employees Directory',
    headers: ['employee_id', 'name', 'email', 'phone', 'address', 'designation', 'joining_date', 'status'],
  },
  labours: {
    label: 'Labourers & Trade Workers',
    headers: ['labour_id', 'name', 'phone', 'address', 'skill', 'wage_rate', 'joining_date', 'status'],
  },
  projects: {
    label: 'Construction Projects',
    headers: ['project_id', 'project_name', 'location', 'start_date', 'end_date', 'budget', 'status'],
  },
  sites: {
    label: 'Site Locations',
    headers: ['site_id', 'project_id', 'supervisor_id', 'site_name', 'location', 'status'],
  },
  attendance: {
    label: 'Daily Attendance Register',
    headers: ['attendance_id', 'site_id', 'employee_id', 'labour_id', 'attendance_date', 'status', 'hours_worked'],
  },
  tasks: {
    label: 'Tasks & Milestones',
    headers: ['task_id', 'project_id', 'site_id', 'supervisor_id', 'labour_id', 'task_name', 'description', 'start_date', 'end_date', 'status'],
  },
  leaves: {
    label: 'Leave Applications',
    headers: ['leave_id', 'labour_id', 'leave_type', 'from_date', 'to_date', 'reason', 'status', 'applied_on', 'approved_by'],
  },
  salary: {
    label: 'Payroll Ledger',
    headers: ['salary_id', 'employee_id', 'hr_id', 'month', 'basic_salary', 'overtime', 'deductions', 'net_salary', 'payment_status', 'payment_date'],
  },
  materials: {
    label: 'Materials Inventory',
    headers: ['material_id', 'material_name', 'quantity', 'unit', 'cost', 'status'],
  },
  suppliers: {
    label: 'Vendors & Suppliers',
    headers: ['supplier_id', 'supplier_name', 'phone', 'address', 'status'],
  },
};

export const CsvHubView: React.FC = () => {
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
    suppliers,
  } = useWorkforce();

  const getTableRows = (table: ExportableTable): Record<string, any>[] => {
    switch (table) {
      case 'employees':
        return employees;
      case 'labours':
        return labours;
      case 'projects':
        return projects;
      case 'sites':
        return sites;
      case 'attendance':
        return attendance;
      case 'tasks':
        return tasks;
      case 'leaves':
        return leaves;
      case 'salary':
        return salaries;
      case 'materials':
        return materials;
      case 'suppliers':
        return suppliers;
    }
  };

  const handleExportTable = (table: ExportableTable) => {
    const meta = TABLE_METADATA[table];
    const rows = getTableRows(table);
    const csv = generateCsvString(meta.headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buildmate_${table}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          CSV Export Data Hub
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Export any of the 10 operational Supabase tables to structured CSV snapshots
        </p>
      </div>

      {/* One-Click CSV Exports for all 10 Modules */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-700" />
          <span>Export Live Database Tables to CSV</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Download structured CSV snapshots for Employees, Labourers, Projects, Sites, Attendance,
          Tasks, Leaves, Salary, Materials, and Suppliers
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
          {(Object.keys(TABLE_METADATA) as ExportableTable[]).map((tableKey) => {
            const meta = TABLE_METADATA[tableKey];
            const rowCount = getTableRows(tableKey).length;
            return (
              <div
                key={tableKey}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-2"
              >
                <div>
                  <span className="font-semibold text-xs text-slate-900 block">
                    {meta.label}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {rowCount} records available
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportTable(tableKey)}
                  className="w-full py-1.5 px-3 rounded bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
