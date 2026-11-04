import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import {
  generateCsvString,
  parseAndValidateCsv,
  CsvValidationResult,
} from '../utils/workforceLogic';

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
    requiredHeaders: string[];
    requiredFields: string[];
    uniqueKey?: string;
    fkKey?: string;
    sampleCsv: string;
  }
> = {
  employees: {
    label: 'Employees (public.employees)',
    headers: ['employee_id', 'name', 'email', 'phone', 'address', 'designation', 'joining_date', 'status'],
    requiredHeaders: ['name', 'email', 'phone', 'designation'],
    requiredFields: ['name', 'email', 'phone', 'designation'],
    uniqueKey: 'email',
    sampleCsv:
      'name,email,phone,address,designation,joining_date,status\nRohan Kulkarni,rohan.k@buildforce.in,+91 98201 88112,Thane West,Planning Engineer,2026-10-15,ACTIVE\nNeha Joshi,neha.j@buildforce.in,+91 98201 88119,Vashi Navi Mumbai,Billing Engineer,2026-10-18,ACTIVE',
  },
  labours: {
    label: 'Labourers (public.labours)',
    headers: ['labour_id', 'name', 'phone', 'address', 'skill', 'wage_rate', 'joining_date', 'status'],
    requiredHeaders: ['name', 'phone', 'skill', 'wage_rate'],
    requiredFields: ['name', 'phone', 'skill', 'wage_rate'],
    uniqueKey: 'phone',
    sampleCsv:
      'name,phone,address,skill,wage_rate,joining_date,status\nGaneshMore,+91 97655 10021,Kurla Camp,Mason,920,2026-10-12,ACTIVE\nIrfan Shaikh,+91 97655 10022,Mumbra,Bar Bender,960,2026-10-14,ACTIVE',
  },
  projects: {
    label: 'Projects (public.projects)',
    headers: ['project_id', 'project_name', 'location', 'start_date', 'end_date', 'budget', 'status'],
    requiredHeaders: ['project_name', 'location', 'budget'],
    requiredFields: ['project_name', 'location', 'budget'],
    uniqueKey: 'project_name',
    sampleCsv:
      'project_name,location,start_date,end_date,budget,status\nNavi Mumbai Airport Cargo Terminal,Ulwe Sector 19,2026-11-01,2027-12-31,145000000,ACTIVE',
  },
  sites: {
    label: 'Sites (public.sites)',
    headers: ['site_id', 'project_id', 'supervisor_id', 'site_name', 'location', 'status'],
    requiredHeaders: ['project_id', 'site_name', 'location'],
    requiredFields: ['project_id', 'site_name', 'location'],
    uniqueKey: 'site_name',
    fkKey: 'project_id',
    sampleCsv:
      'project_id,supervisor_id,site_name,location,status\n1,1,Pier P-19 North Viaduct Ramp,Worli Seaface North,ACTIVE',
  },
  attendance: {
    label: 'Attendance (public.attendance)',
    headers: ['attendance_id', 'site_id', 'employee_id', 'labour_id', 'attendance_date', 'status', 'hours_worked'],
    requiredHeaders: ['site_id', 'attendance_date', 'status', 'hours_worked'],
    requiredFields: ['site_id', 'attendance_date', 'status', 'hours_worked'],
    fkKey: 'site_id',
    sampleCsv:
      'site_id,employee_id,labour_id,attendance_date,status,hours_worked\n1,,105,2026-10-22,PRESENT,8.5\n2,,106,2026-10-22,PRESENT,8',
  },
  tasks: {
    label: 'Tasks (public.tasks)',
    headers: ['task_id', 'project_id', 'site_id', 'supervisor_id', 'labour_id', 'task_name', 'description', 'start_date', 'end_date', 'status'],
    requiredHeaders: ['project_id', 'site_id', 'task_name', 'status'],
    requiredFields: ['project_id', 'site_id', 'task_name', 'status'],
    fkKey: 'project_id',
    sampleCsv:
      'project_id,site_id,supervisor_id,labour_id,task_name,description,start_date,end_date,status\n1,1,1,101,Parapet Wall Formwork Bay 9,Install steel shuttering panels,2026-10-23,2026-10-29,IN_PROGRESS',
  },
  leaves: {
    label: 'Leaves (public.leaves)',
    headers: ['leave_id', 'labour_id', 'leave_type', 'from_date', 'to_date', 'reason', 'status', 'applied_on', 'approved_by'],
    requiredHeaders: ['labour_id', 'leave_type', 'from_date', 'to_date', 'reason'],
    requiredFields: ['labour_id', 'leave_type', 'from_date', 'to_date', 'reason'],
    sampleCsv:
      'labour_id,leave_type,from_date,to_date,reason\n102,CASUAL,2026-10-28,2026-10-30,Village festival visit',
  },
  salary: {
    label: 'Salary (public.salary)',
    headers: ['salary_id', 'employee_id', 'hr_id', 'month', 'basic_salary', 'overtime', 'deductions', 'net_salary', 'payment_status', 'payment_date'],
    requiredHeaders: ['employee_id', 'month', 'basic_salary'],
    requiredFields: ['employee_id', 'month', 'basic_salary'],
    sampleCsv:
      'employee_id,hr_id,month,basic_salary,overtime,deductions,payment_status\n201,1,2026-11,85000,5000,2500,PENDING',
  },
  materials: {
    label: 'Materials (public.materials)',
    headers: ['material_id', 'material_name', 'quantity', 'unit', 'cost', 'status'],
    requiredHeaders: ['material_name', 'quantity', 'unit', 'cost'],
    requiredFields: ['material_name', 'quantity', 'unit', 'cost'],
    uniqueKey: 'material_name',
    sampleCsv:
      'material_name,quantity,unit,cost\nStructural Binding Wire 16SWG,180,Kg,92\nWaterproofing Admixture Dr.Fixit,95,Liters,240',
  },
  suppliers: {
    label: 'Suppliers (public.suppliers)',
    headers: ['supplier_id', 'supplier_name', 'phone', 'address', 'status'],
    requiredHeaders: ['supplier_name', 'phone', 'address'],
    requiredFields: ['supplier_name', 'phone', 'address'],
    uniqueKey: 'supplier_name',
    sampleCsv:
      'supplier_name,phone,address,status\nGodrej Construction Materials,+91 22 6796 5500,Vikhroli East Mumbai,ACTIVE',
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
    bulkImportRecords,
  } = useWorkforce();

  const [selectedImportTable, setSelectedImportTable] = useState<ExportableTable>('labours');
  const [csvText, setCsvText] = useState<string>(TABLE_METADATA.labours.sampleCsv);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

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
    a.download = `buildforce_${table}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleValidatePreview = () => {
    setImportedCount(null);
    const meta = TABLE_METADATA[selectedImportTable];
    const currentRows = getTableRows(selectedImportTable);

    const existingUniqueValues = new Set<string>();
    if (meta.uniqueKey) {
      currentRows.forEach((r) => {
        if (r[meta.uniqueKey!]) {
          existingUniqueValues.add(String(r[meta.uniqueKey!]).toLowerCase());
        }
      });
    }

    const fkCheck =
      meta.fkKey === 'project_id'
        ? {
            col: 'project_id',
            validSet: new Set<string | number>(projects.map((p) => p.project_id)),
            label: 'Project ID',
          }
        : meta.fkKey === 'site_id'
        ? {
            col: 'site_id',
            validSet: new Set<string | number>(sites.map((s) => s.site_id)),
            label: 'Site ID',
          }
        : undefined;

    const result = parseAndValidateCsv(
      csvText,
      meta.requiredHeaders,
      existingUniqueValues,
      meta.uniqueKey || '',
      fkCheck
    );
    setValidationResult(result);
  };

  const handleCommitImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) return;
    const count = await bulkImportRecords(selectedImportTable, validationResult.validRows);
    setImportedCount(count);
    setValidationResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Controlled CSV Import &amp; Export Data Hub
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Export any of the 10 operational Supabase tables to CSV, or validate &amp; preview incoming
          CSV batches with foreign-key &amp; duplicate protection before importing
        </p>
      </div>

      {/* Section 1: One-Click CSV Exports for all 10 Modules */}
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

      {/* Section 2: Controlled CSV Import with Schema, FK, & Duplicate Validation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>Controlled CSV Import &amp; Pre-Flight Validator</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforces column headers, required fields, foreign-key references, and duplicate checks
              before inserting records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="csv-target-select" className="text-xs font-semibold text-slate-700">
              Target Table:
            </label>
            <select
              id="csv-target-select"
              value={selectedImportTable}
              onChange={(e) => {
                const next = e.target.value as ExportableTable;
                setSelectedImportTable(next);
                setCsvText(TABLE_METADATA[next].sampleCsv);
                setValidationResult(null);
                setImportedCount(null);
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
            >
              <option value="employees">Employees (public.employees)</option>
              <option value="labours">Labourers (public.labours)</option>
              <option value="projects">Projects (public.projects)</option>
              <option value="sites">Sites (public.sites)</option>
              <option value="attendance">Attendance (public.attendance)</option>
              <option value="tasks">Tasks (public.tasks)</option>
              <option value="materials">Materials (public.materials)</option>
              <option value="suppliers">Suppliers (public.suppliers)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">
              Required CSV Columns:{' '}
              <code className="font-mono text-blue-700">
                {TABLE_METADATA[selectedImportTable].requiredHeaders.join(', ')}
              </code>
            </span>
            <button
              type="button"
              onClick={() => {
                setCsvText(TABLE_METADATA[selectedImportTable].sampleCsv);
                setValidationResult(null);
              }}
              className="text-blue-700 hover:underline font-medium cursor-pointer"
            >
              Reset Sample CSV Template
            </button>
          </div>

          <textarea
            rows={5}
            aria-label="CSV payload input"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 rounded-lg border border-slate-300 font-mono text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleValidatePreview}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
            >
              Validate &amp; Preview CSV Rows
            </button>

            {importedCount !== null && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Successfully imported {importedCount} validated rows into {selectedImportTable}!
              </span>
            )}
          </div>
        </div>

        {/* Validation Preview Output */}
        {validationResult && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-semibold">
                  {validationResult.validRows.length} Valid Rows Ready
                </span>
                <span
                  className={`px-2.5 py-1 rounded font-mono font-semibold border ${
                    validationResult.errors.length > 0
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {validationResult.errors.length} Validation Errors
                </span>
              </div>

              {validationResult.validRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleCommitImport}
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  Confirm &amp; Import {validationResult.validRows.length} Validated Rows
                </button>
              )}
            </div>

            {validationResult.errors.length > 0 && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 space-y-1">
                <div className="font-semibold text-red-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Rejected Rows / Schema Issues (Protected against silent corruption):</span>
                </div>
                <ul className="list-disc list-inside text-red-800 font-mono text-[11px]">
                  {validationResult.errors.map((errMsg, idx) => (
                    <li key={idx}>{errMsg}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult.validRows.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                      {validationResult.headers.map((h) => (
                        <th key={h} className="py-2 px-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {validationResult.validRows.map((row, idx) => (
                      <tr key={idx}>
                        {validationResult.headers.map((h) => (
                          <td key={h} className="py-2 px-3 text-slate-800">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
