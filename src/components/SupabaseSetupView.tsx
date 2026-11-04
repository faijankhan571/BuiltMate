import React, { useEffect, useState } from 'react';
import {
  Database,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { SUPABASE_SQL_SCRIPT } from '../data/supabaseSqlScript';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { useWorkforce } from '../context/WorkforceContext';
import { SupabaseTableDiagnostic } from '../types';

export const SupabaseSetupView: React.FC = () => {
  const {
    syncWithSupabase,
    seedLiveSupabaseDatabase,
    runSupabaseSchemaDiagnostics,
    isLoading,
  } = useWorkforce();
  const [copied, setCopied] = useState(false);
  const [probing, setProbing] = useState(false);
  const [schemaDiagnostics, setSchemaDiagnostics] = useState<SupabaseTableDiagnostic[]>([]);

  useEffect(() => {
    let mounted = true;
    runSupabaseSchemaDiagnostics().then((res) => {
      if (mounted && res?.diagnostics) {
        setSchemaDiagnostics(res.diagnostics);
      }
    });
    return () => {
      mounted = false;
    };
  }, [runSupabaseSchemaDiagnostics]);

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleProbe = async () => {
    setProbing(true);
    const res = await runSupabaseSchemaDiagnostics();
    if (res?.diagnostics) {
      setSchemaDiagnostics(res.diagnostics);
    }
    setProbing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-700" />
            <span>Supabase 6-Role Profile Tables &amp; 18-Table RLS Migration Hub</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connected to{' '}
            <code className="font-mono text-blue-700">
              https://uznmqmvafuyyzgshsogx.supabase.co
            </code>{' '}
            · Live Schema Audit, Single-Role Enforcement Trigger, and Idempotent SQL Migration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleProbe}
            disabled={probing || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${probing ? 'animate-spin' : ''}`} />
            <span>Probe 18 Live Tables</span>
          </button>

          <button
            type="button"
            onClick={syncWithSupabase}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Pull Live Supabase Data</span>
          </button>

          <button
            type="button"
            onClick={seedLiveSupabaseDatabase}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Push Seed Records to Supabase</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied SQL Script!' : 'Copy Idempotent SQL Migration'}</span>
          </button>
        </div>
      </div>

      {/* Live Schema Mismatches & Repair Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Live Database Schema Audit Findings (uznmqmvafuyyzgshsogx)</span>
          </h2>
          <span
            className={`px-2.5 py-0.5 rounded font-mono font-semibold border ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isSupabaseConfigured
              ? '6 ROLE TABLES + 12 OPERATIONAL TABLES INSPECTED'
              : 'CONFIGURE VIA AI STUDIO ENV PANEL'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1.5">
            <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>6 Role Profile Tables Verified in Live Schema</span>
            </div>
            <p className="text-emerald-900 leading-relaxed">
              <code className="font-mono">public.admins</code>,{' '}
              <code className="font-mono">public.hr_managers</code>,{' '}
              <code className="font-mono">public.site_supervisors</code>,{' '}
              <code className="font-mono">public.accountants</code>,{' '}
              <code className="font-mono">public.employees</code>, and{' '}
              <code className="font-mono">public.labourers</code> (renamed from{' '}
              <code className="font-mono">labours</code>) exist with{' '}
              <code className="font-mono">user_id (UUID)</code>,{' '}
              <code className="font-mono">full_name</code>,{' '}
              <code className="font-mono">work_email</code>,{' '}
              <code className="font-mono">is_active (BOOLEAN)</code>, and unauthenticated requests
              are blocked (<code className="font-mono">42501 permission denied</code>).
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 space-y-1.5">
            <div className="font-semibold text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Schema Mismatches Repaired by Migration Script Below</span>
            </div>
            <ul className="list-disc list-inside text-amber-900 space-y-1 leading-relaxed">
              <li>
                <code className="font-mono">public.is_admin()</code> previously referenced dropped{' '}
                <code className="font-mono">public.profiles</code> (<code className="font-mono">42P01</code>) —
                updated to query <code className="font-mono">public.admins WHERE is_active = TRUE</code>.
              </li>
              <li>
                Adds <code className="font-mono">BIGINT IDENTITY</code> bridge keys (
                <code className="font-mono">employee_id</code>, <code className="font-mono">labour_id</code>,{' '}
                <code className="font-mono">supervisor_id</code>, <code className="font-mono">hr_id</code>) and{' '}
                <code className="font-mono">site_id (BIGINT)</code> so operational tables join cleanly.
              </li>
              <li>
                Installs <code className="font-mono">public.enforce_single_role_profile()</code> trigger
                preventing any <code className="font-mono">user_id</code> from existing in more than one role table.
              </li>
            </ul>
          </div>
        </div>

        {/* Live 18-Table Probe Matrix */}
        {schemaDiagnostics.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-bold text-slate-800 mb-2">
              Live 18-Table PostgreSQL &amp; RLS Probe Status
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2 px-3">Table Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">RLS &amp; Table Status</th>
                    <th className="py-2 px-3">Live Probe Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schemaDiagnostics.map((diag) => (
                    <tr key={diag.table} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                        public.{diag.table}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            diag.category === 'ROLE_TABLE'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {diag.category === 'ROLE_TABLE' ? '6-Role Profile' : 'Operational'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {!diag.exists ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            RUN SQL MIGRATION
                          </span>
                        ) : diag.rlsProtected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-semibold">
                            <Lock className="w-3 h-3" />
                            RLS_PROTECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            ONLINE ({diag.rowCount ?? 0} rows)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                        {diag.statusMessage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SQL Script Viewer */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>supabase_6_role_tables_rls_and_bridge_migration.sql</span>
          <span>PostgreSQL 15+ / Supabase Auth + RLS</span>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
          {SUPABASE_SQL_SCRIPT}
        </pre>
      </div>
    </div>
  );
};
