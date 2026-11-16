import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Building2,
  Send,
  Package,
  Globe,
  ExternalLink,
  Search,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { AIWorkforceReport } from '../types';
import { GeminiChatbotPanel } from './GeminiChatbotPanel';
import { GoogleMapsSitesPanel } from './GoogleMapsSitesPanel';

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
      'Across 3 active infrastructure projects and 5 construction sites, BuildMate currently manages 6 salaried engineers/officers and 8 skilled labourers (14 total personnel). Attendance on 2026-10-22 stands at 81% (6 Present, 1 Half-Day, 1 Absent, 1 On Leave).',
    attendanceTrends:
      'Tower A — RCC Core & Formwork (Site #1) and Pier P-14 to P-22 Viaduct Corridor (Site #3) maintain strong full-shift attendance (8.0–9.5 hrs/worker), while TBM Launch Shaft North (Site #4) has an unexcused absence from Mason Santosh Chavan (#108).',
    staffingShortages: [
      {
        siteName: 'TBM Launch Shaft North (Site #4)',
        issue:
          'Task #3 (TBM Shaft Ring Beam Rebar Cage) is marked DELAYED and Mason Santosh Chavan (#108) is absent.',
        recommendation:
          'Reallocate Bar Bender Dilip Jadhav (#107) to assist Suresh Nair (#102) on the ring beam rebar cage.',
        priority: 'High',
      },
      {
        siteName: 'Podium Level & Basement Excavation (Site #5)',
        issue:
          'Waterproofing Membrane Bitumen Roll (#5) is OUT_OF_STOCK (0 Sqm) and Structural Steel H-Beam (#6) is LOW_STOCK (18 Tons).',
        recommendation:
          'Trigger immediate procurement replenishment from Supreme Waterproofing & Chemicals before starting podium waterproofing.',
        priority: 'Medium',
      },
    ],
    delayedTasksAnalysis:
      '1 active site task is currently DELAYED: Task #3 (TBM Shaft Ring Beam Rebar Cage, due 2026-10-21) due to crane maintenance and rebar crew shortage.',
    materialStockRisks:
      'Material #5 (Waterproofing Membrane Bitumen Roll) is OUT_OF_STOCK (0 Sqm) and Material #6 (Structural Steel H-Beam ISMB 300) is LOW_STOCK (18 Tons).',
    customQueryAnswer:
      'Prioritize reallocating Bar Bender Dilip Jadhav (#107) to TBM Launch Shaft North to clear Delayed Task #3, and place an urgent purchase order for Waterproofing Membrane Bitumen Rolls (#5) and ISMB 300 H-Beams (#6).',
  });

  // Dedicated Google Search Grounding State
  const [searchGroundingQuery, setSearchGroundingQuery] = useState(
    'Latest Indian BOCW construction labour safety regulations and bulk OPC 53 cement & Fe-550D TMT steel price trends'
  );
  const [searchGroundingLoading, setSearchGroundingLoading] = useState(false);
  const [searchGroundedText, setSearchGroundedText] = useState<string | null>(
    'Grounded with Google Search (gemini-3.8-flash): Mandatory safety harness inspection for work above 2m under BOCW Rules, daily digital muster verification, and active bulk procurement tracking for OPC 53 grade cement and Fe-550D TMT reinforcement steel.'
  );
  const [searchGroundedLinks, setSearchGroundedLinks] = useState<
    Array<{ title: string; uri: string }>
  >([
    {
      title: 'Ministry of Labour & Employment — BOCW Act & Construction Safety Rules',
      uri: 'https://labour.gov.in/',
    },
    {
      title: 'Bureau of Indian Standards (BIS) — Civil Engineering & Structural Codes',
      uri: 'https://www.bis.gov.in/',
    },
  ]);

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

  const handleRunSearchGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchGroundingQuery.trim()) return;
    setSearchGroundingLoading(true);
    try {
      const res = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchGroundingQuery }),
      });
      const data = await res.json();
      setSearchGroundedText(data.text || null);
      setSearchGroundedLinks(Array.isArray(data.searchLinks) ? data.searchLinks : []);
      addToast('success', 'Google Search Grounding (gemini-3.8-flash) completed.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearchGroundingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600" />
            <span>Gemini AI Hub — Multi-Turn Chatbot, Maps &amp; Search Grounding</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Powered by <code className="font-mono text-purple-700">gemini-4-argon</code>,{' '}
            <code className="font-mono text-blue-700">gemini-3.8-flash</code> (with{' '}
            <code className="font-mono">googleMaps</code> &amp;{' '}
            <code className="font-mono">googleSearch</code> grounding), and{' '}
            <code className="font-mono text-sky-700">gemini-3.1-flash-lite</code>
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

      {/* 1. Multi-Turn Gemini Chatbot Interface */}
      <GeminiChatbotPanel />

      {/* 2. Interactive Google Maps Platform & Maps Grounding Panel */}
      <GoogleMapsSitesPanel />

      {/* 3. Dedicated Google Search Grounding Panel (gemini-3.8-flash + googleSearch) */}
      <div
        data-testid="google-search-grounding-panel"
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h2 className="font-display text-base font-bold text-slate-900">
                Google Search Grounding — Live Construction Regulations &amp; Material Market Intelligence
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Uses <code className="font-mono text-emerald-700">gemini-3.8-flash</code> with the{' '}
              <code className="font-mono text-emerald-700">googleSearch</code> tool for up-to-date labour compliance, weather advisories, and bulk material pricing.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 self-start">
            gemini-3.8-flash · googleSearch
          </span>
        </div>

        <form onSubmit={handleRunSearchGrounding} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            data-testid="search-grounding-input"
            value={searchGroundingQuery}
            onChange={(e) => setSearchGroundingQuery(e.target.value)}
            placeholder="Search live construction labour rules, cement/steel prices, or monsoon alerts..."
            className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            data-testid="search-grounding-submit-btn"
            disabled={searchGroundingLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            {searchGroundingLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>Ground with Google Search</span>
          </button>
        </form>

        {searchGroundedText && (
          <div
            data-testid="search-grounding-result"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line"
          >
            {searchGroundedText}
          </div>
        )}

        {searchGroundedLinks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Verified Web Citations ({searchGroundedLinks.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {searchGroundedLinks.map((link, idx) => (
                <a
                  key={`${link.uri}-${idx}`}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-xs font-medium text-emerald-950 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{link.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Structured Database Workforce & Site Operations Analyst Report */}
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
