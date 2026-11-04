import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Send,
  Package,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { AIWorkforceReport } from '../types';

export const AIInsightsView: React.FC = () => {
  const {
    employees,
    labours,
    projects,
    sites,
    empAssignments,
    labourAssignments,
    attendance,
    tasks,
    leaves,
    salaries,
    materials,
    addToast,
  } = useWorkforce();

  const [customQuery, setCustomQuery] = useState(
    'Which construction sites have delayed tasks or low-stock materials, and how should we reallocate skilled labourers?'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AIWorkforceReport>({
    executiveSummary:
      'Across 3 active infrastructure projects and 4 construction sites, BuildMate currently manages 6 salaried engineers/officers and 8 skilled labourers (14 total personnel). Attendance on 2026-10-22 stands at 81% (6 Present, 1 Half-Day, 1 Absent, 1 On Leave).',
    attendanceTrends:
      'Pier P-14 Marine Pile Cap (Site #1) and Pier P-18 Launching Girder (Site #2) maintain strong full-shift attendance (8.0–9.5 hrs/worker), while TBM Launch Shaft North (Site #3) has an unexcused absence from Mason Santosh Chavan (#108).',
    staffingShortages: [
      {
        siteName: 'TBM Launch Shaft North (Site #3)',
        issue: 'Task #3 (TBM Shaft Ring Beam Rebar Cage) is marked DELAYED and Mason Santosh Chavan (#108) is absent.',
        recommendation:
          'Reallocate Bar Bender Dilip Jadhav (#107) from Site #4 to assist Suresh Nair (#102) on the ring beam rebar cage.',
        priority: 'High',
      },
      {
        siteName: 'Podium Slab Zone B (Site #4)',
        issue: 'Waterproofing Membrane Bitumen Roll (#5) is OUT_OF_STOCK (0 Sqm) and Structural Steel H-Beam (#6) is LOW_STOCK (18 Tons).',
        recommendation:
          'Trigger immediate procurement replenishment from Supreme Waterproofing & Chemicals before starting podium waterproofing.',
        priority: 'Medium',
      },
    ],
    delayedTasksAnalysis:
      '1 of 5 active tasks is currently DELAYED: Task #3 (TBM Shaft Ring Beam Rebar Cage at Site #3, due 2026-10-21) due to crane maintenance and rebar crew shortage.',
    materialStockRisks:
      'Material #5 (Waterproofing Membrane Bitumen Roll) is OUT_OF_STOCK (0 Sqm) and Material #6 (Structural Steel H-Beam ISMB 300) is LOW_STOCK (18 Tons).',
    customQueryAnswer:
      'Prioritize reallocating Bar Bender Dilip Jadhav (#107) to TBM Launch Shaft North (Site #3) to clear Delayed Task #3, and place an urgent purchase order for Waterproofing Membrane Bitumen Rolls (#5) and ISMB 300 H-Beams (#6).',
  });

  const handleGenerateInsights = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/workforce-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees,
          labours,
          projects,
          sites,
          empAssignments,
          labourAssignments,
          attendance,
          tasks,
          leaves,
          salaries,
          materials,
          customQuery,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Gemini workforce report.');
      }
      setReport(data);
      addToast('success', 'Live Gemini Workforce & Site Operations report updated.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600" />
            <span>Gemini AI Workforce &amp; Site Operations Analyst</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Grounded strictly in live <code className="font-mono text-blue-700">BuildMate</code>{' '}
            Supabase tables (Employees, Labours, Sites, Attendance, Tasks, Leaves, Salary, Materials)
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleGenerateInsights()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing Live Database...' : 'Run Live Gemini Analysis'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Live Gemini API Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Custom Prompt Bar */}
      <form
        onSubmit={handleGenerateInsights}
        className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          aria-label="Ask Gemini AI a question about your workforce data"
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          placeholder="Ask about site attendance, delayed tasks, material shortages, or payroll..."
          className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask Analyst</span>
        </button>
      </form>

      {/* AI Report Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900">
              Executive Workforce &amp; Project Summary
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">{report.executiveSummary}</p>
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 mb-1">
                Site Attendance &amp; Shift Hours Analysis
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{report.attendanceTrends}</p>
            </div>
          </div>

          {/* Staffing Shortages & Reallocation Recommendations */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-display text-base font-bold text-slate-900 mb-3">
              Site Staffing Bottlenecks &amp; Recommendations
            </h2>
            <div className="space-y-3">
              {report.staffingShortages.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      {item.siteName}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-amber-100 text-amber-900">
                      {item.priority} Priority
                    </span>
                  </div>
                  <p className="text-slate-700">
                    <strong>Observed Issue:</strong> {item.issue}
                  </p>
                  <p className="text-blue-900 bg-blue-50/80 p-2 rounded border border-blue-100">
                    <strong>Recommended Action:</strong> {item.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Delayed Tasks, Material Stock Risks & Custom Answer */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Delayed Tasks Diagnostic</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">{report.delayedTasksAnalysis}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Material Stock Alert Analysis</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">{report.materialStockRisks}</p>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-5 space-y-2">
            <h3 className="font-display text-sm font-bold text-amber-400">
              Direct Answer to Your Query
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed">{report.customQueryAnswer}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
