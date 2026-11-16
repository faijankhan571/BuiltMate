import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Globe,
  MapPin,
  Zap,
  Brain,
  Trash2,
  ExternalLink,
  User,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { resolveSiteGeofenceConfig } from '../utils/workforceLogic';

export type GeminiModelTier =
  | 'gemini-4-argon'
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite';

export type GeminiPersonaId =
  | 'operations_director'
  | 'safety_geofence_inspector'
  | 'payroll_compliance_advisor'
  | 'procurement_logistics_coordinator';

export type GeminiGroundingMode = 'none' | 'googleSearch' | 'googleMaps';

export interface ChatTurnMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  personaId?: GeminiPersonaId;
  groundingMode?: GeminiGroundingMode;
  mapsLinks?: Array<{ title: string; uri: string; reviewSnippets?: string[] }>;
  searchLinks?: Array<{ title: string; uri: string }>;
  webSearchQueries?: string[];
}

const CHAT_HISTORY_STORAGE_KEY = 'bm_v4_gemini_chat_history';

const PERSONA_OPTIONS: Array<{
  id: GeminiPersonaId;
  label: string;
  badge: string;
  systemRoleSummary: string;
}> = [
  {
    id: 'operations_director',
    label: 'Construction Operations Director',
    badge: 'Site & Crew Ops',
    systemRoleSummary:
      'Oversees project schedules, site staffing allocation, attendance rates, and delayed task recovery.',
  },
  {
    id: 'safety_geofence_inspector',
    label: 'Site Safety & Geofence Inspector',
    badge: 'GPS & Safety',
    systemRoleSummary:
      'Monitors Haversine GPS geofence boundaries (250m–350m), selfie muster verification, and PPE safety compliance.',
  },
  {
    id: 'payroll_compliance_advisor',
    label: 'Payroll & Labour Compliance Advisor',
    badge: 'Wages & BOCW',
    systemRoleSummary:
      'Advises on daily labour wage rates, overtime hours, PF/ESI deductions, and net salary disbursement.',
  },
  {
    id: 'procurement_logistics_coordinator',
    label: 'Procurement & Material Coordinator',
    badge: 'Inventory & Supply',
    systemRoleSummary:
      'Tracks low-stock/out-of-stock materials, supplier quotes, and nearby hardware/ready-mix sourcing.',
  },
];

const MODEL_OPTIONS: Array<{
  id: GeminiModelTier;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'gemini-3.8-flash',
    label: 'gemini-3.8-flash (General & Grounding)',
    subtitle: 'Balanced speed & reasoning + Google Search & Maps Grounding',
  },
  {
    id: 'gemini-4-argon',
    label: 'gemini-4-argon (Complex Engineering & Optimization)',
    subtitle: 'Deep multi-table reasoning for complex scheduling & payroll tasks',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'gemini-3.1-flash-lite (Fast Field Lookup)',
    subtitle: 'Ultra-low latency for rapid status & attendance checks',
  },
];

function loadInitialChatHistory(): ChatTurnMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage parse error
  }
  return [
    {
      id: 'welcome-turn-1',
      role: 'model',
      text: 'Welcome to the **BuildMate Multi-Turn Gemini Assistant**! I maintain full conversation history across turns and adapt my system instructions to your selected role.\n\n- Choose **`gemini-4-argon`** for complex multi-site optimization & payroll modeling.\n- Choose **`gemini-3.8-flash`** for general operational analysis, **Google Search Grounding**, or **Google Maps Grounding**.\n- Choose **`gemini-3.1-flash-lite`** for fast field lookups.',
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-3.8-flash',
      personaId: 'operations_director',
      groundingMode: 'none',
    },
  ];
}

interface GeminiChatbotPanelProps {
  compact?: boolean;
}

export const GeminiChatbotPanel: React.FC<GeminiChatbotPanelProps> = ({
  compact = false,
}) => {
  const {
    currentUser,
    currentRole,
    employees,
    labours,
    projects,
    sites,
    attendance,
    tasks,
    leaves,
    salaries,
    materials,
  } = useWorkforce();

  const [messages, setMessages] = useState<ChatTurnMessage[]>(() =>
    loadInitialChatHistory()
  );
  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedModel, setSelectedModel] =
    useState<GeminiModelTier>('gemini-3.8-flash');
  const [assistantPersona, setAssistantPersona] =
    useState<GeminiPersonaId>('operations_director');
  const [groundingMode, setGroundingMode] =
    useState<GeminiGroundingMode>('none');
  const [selectedSiteId, setSelectedSiteId] = useState<number>(
    sites[0]?.site_id || 1
  );
  const [isSending, setIsSending] = useState<boolean>(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore storage quota
    }
  }, [messages]);

  useEffect(() => {
    if (threadEndRef.current && typeof threadEndRef.current.scrollIntoView === 'function') {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length, isSending]);

  const activeSite =
    sites.find((s) => s.site_id === selectedSiteId) || sites[0] || null;
  const activeGeo = resolveSiteGeofenceConfig(activeSite);

  const activePersonaObj =
    PERSONA_OPTIONS.find((p) => p.id === assistantPersona) || PERSONA_OPTIONS[0];

  const handleSendMessage = async (
    e?: React.FormEvent,
    overridePrompt?: string,
    overrideModel?: GeminiModelTier,
    overrideGrounding?: GeminiGroundingMode
  ) => {
    if (e) e.preventDefault();
    const textToSend = (overridePrompt !== undefined ? overridePrompt : inputMessage).trim();
    if (!textToSend || isSending) return;

    const effectiveModel = overrideModel || selectedModel;
    const effectiveGrounding = overrideGrounding || groundingMode;

    if (overrideModel) setSelectedModel(overrideModel);
    if (overrideGrounding) setGroundingMode(overrideGrounding);

    const userTurn: ChatTurnMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
      modelUsed: effectiveModel,
      personaId: assistantPersona,
      groundingMode: effectiveGrounding,
    };

    const historyForRequest = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userTurn]);
    if (overridePrompt === undefined) {
      setInputMessage('');
    }
    setIsSending(true);

    const workforceSnapshot = {
      loggedInUser: currentUser?.full_name || currentUser?.name || currentRole,
      loggedInRole: currentRole,
      totalEmployees: employees.length,
      totalLabours: labours.length,
      totalProjects: projects.length,
      totalSites: sites.length,
      delayedTasks: tasks
        .filter((t) => t.status === 'DELAYED')
        .map((t) => ({ id: t.task_id, name: t.task_name, siteId: t.site_id })),
      lowOrOutMaterials: materials
        .filter((m) => m.status !== 'IN_STOCK')
        .map((m) => ({ name: m.material_name, qty: m.quantity, unit: m.unit, status: m.status })),
      pendingLeaves: leaves.filter((l) => l.status === 'PENDING').length,
      unpaidSalaries: salaries.filter((s) => s.payment_status !== 'PAID').length,
      loggedAttendanceCount: attendance.length,
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyForRequest,
          message: textToSend,
          selectedModel: effectiveModel,
          assistantPersona,
          groundingMode: effectiveGrounding,
          latLng: {
            latitude: activeGeo.centerLat,
            longitude: activeGeo.centerLng,
          },
          siteName: `${activeGeo.siteName} (${activeGeo.location})`,
          workforceSnapshot,
        }),
      });

      const data = await res.json();
      const modelTurn: ChatTurnMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text:
          data.reply ||
          data.error ||
          'Processed your request against BuildMate operational data.',
        timestamp: new Date().toISOString(),
        modelUsed: data.modelUsed || effectiveModel,
        personaId: assistantPersona,
        groundingMode: data.groundingMode || effectiveGrounding,
        mapsLinks: Array.isArray(data.mapsLinks) ? data.mapsLinks : [],
        searchLinks: Array.isArray(data.searchLinks) ? data.searchLinks : [],
        webSearchQueries: Array.isArray(data.webSearchQueries)
          ? data.webSearchQueries
          : [],
      };

      setMessages((prev) => [...prev, modelTurn]);
    } catch (err: any) {
      const errorTurn: ChatTurnMessage = {
        id: `model-err-${Date.now()}`,
        role: 'model',
        text: `Unable to reach Gemini endpoint (${err?.message || 'network error'}). Please check your connection.`,
        timestamp: new Date().toISOString(),
        modelUsed: effectiveModel,
        personaId: assistantPersona,
        groundingMode: effectiveGrounding,
      };
      setMessages((prev) => [...prev, errorTurn]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearThread = () => {
    const fresh: ChatTurnMessage[] = [
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: `Conversation history cleared. Active role persona: **${activePersonaObj.label}**. How can I help you with BuildMate operations today?`,
        timestamp: new Date().toISOString(),
        modelUsed: selectedModel,
        personaId: assistantPersona,
        groundingMode,
      },
    ];
    setMessages(fresh);
  };

  return (
    <div
      data-testid="gemini-chatbot-panel"
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col"
    >
      {/* Top Banner */}
      <div className="px-5 py-4 bg-[#0F172A] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-sm sm:text-base font-bold">
                Gemini Multi-Turn Construction Chatbot
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {messages.length} Turn(s) in Memory
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Supports <code className="font-mono text-amber-300">gemini-4-argon</code> (Complex),{' '}
              <code className="font-mono text-emerald-300">gemini-3.8-flash</code> (General + Search/Maps Grounding), and{' '}
              <code className="font-mono text-sky-300">gemini-3.1-flash-lite</code> (Fast).
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="clear-gemini-chat-btn"
          onClick={handleClearThread}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer self-start sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Clear History</span>
        </button>
      </div>

      {/* Controls Bar: Role Persona, Gemini Model Tier & Grounding Tool */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. System Instruction Role Persona */}
          <div>
            <label
              htmlFor="gemini-persona-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1"
            >
              System Instruction Role
            </label>
            <select
              id="gemini-persona-select"
              data-testid="gemini-persona-select"
              value={assistantPersona}
              onChange={(e) => setAssistantPersona(e.target.value as GeminiPersonaId)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {PERSONA_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.badge})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Gemini Model Tier */}
          <div>
            <label
              htmlFor="gemini-model-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1"
            >
              Gemini Model Tier
            </label>
            <select
              id="gemini-model-select"
              data-testid="gemini-model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GeminiModelTier)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Live Grounding Tool (None / Google Search / Google Maps) */}
          <div>
            <label
              htmlFor="gemini-grounding-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1"
            >
              Grounding Mode (Search / Maps)
            </label>
            <select
              id="gemini-grounding-select"
              data-testid="gemini-grounding-select"
              value={groundingMode}
              onChange={(e) =>
                setGroundingMode(e.target.value as GeminiGroundingMode)
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="none">Multi-Turn Workforce Chat (ai.chats)</option>
              <option value="googleSearch">
                Google Search Grounding (gemini-3.8-flash + googleSearch)
              </option>
              <option value="googleMaps">
                Google Maps Grounding (gemini-3.8-flash + googleMaps)
              </option>
            </select>
          </div>
        </div>

        {/* Active Persona & Site Coordinates Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <strong>Role Instruction:</strong> {activePersonaObj.systemRoleSummary}
          </span>

          {groundingMode === 'googleMaps' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Target Site:</span>
              <select
                aria-label="Target Construction Site for Maps Grounding"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(Number(e.target.value))}
                className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-medium text-slate-900"
              >
                {sites.map((s) => (
                  <option key={s.site_id} value={s.site_id}>
                    {s.site_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* One-Click Task & Grounding Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            data-testid="preset-complex-argon-btn"
            onClick={() =>
              handleSendMessage(
                undefined,
                'Perform a complex multi-site optimization across our delayed tasks, skilled labour assignments, and low-stock materials.',
                'gemini-4-argon',
                'none'
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-semibold cursor-pointer"
          >
            <Brain className="w-3 h-3 text-purple-700" />
            <span>Complex Task (gemini-4-argon)</span>
          </button>

          <button
            type="button"
            data-testid="preset-fast-lite-btn"
            onClick={() =>
              handleSendMessage(
                undefined,
                'Give me a fast 3-bullet status check of today’s attendance count and pending leave requests.',
                'gemini-3.1-flash-lite',
                'none'
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-[11px] font-semibold cursor-pointer"
          >
            <Zap className="w-3 h-3 text-sky-700" />
            <span>Fast Lookup (gemini-3.1-flash-lite)</span>
          </button>

          <button
            type="button"
            data-testid="preset-search-grounding-btn"
            onClick={() =>
              handleSendMessage(
                undefined,
                'What are the latest Indian BOCW construction safety rules and current OPC 53 cement & TMT steel market trends?',
                'gemini-3.8-flash',
                'googleSearch'
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-semibold cursor-pointer"
          >
            <Globe className="w-3 h-3 text-emerald-700" />
            <span>Google Search Grounding (gemini-3.8-flash)</span>
          </button>

          <button
            type="button"
            data-testid="preset-maps-grounding-btn"
            onClick={() =>
              handleSendMessage(
                undefined,
                `Find construction hardware suppliers, ready-mix concrete plants, and emergency hospitals near ${activeGeo.siteName}.`,
                'gemini-3.8-flash',
                'googleMaps'
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold cursor-pointer"
          >
            <MapPin className="w-3 h-3 text-amber-700" />
            <span>Google Maps Grounding (gemini-3.8-flash)</span>
          </button>
        </div>
      </div>

      {/* Scrollable Multi-Turn Conversation Thread */}
      <div
        data-testid="gemini-chat-thread"
        className={`p-4 space-y-3 overflow-y-auto bg-slate-50/40 ${
          compact ? 'max-h-80' : 'max-h-[420px]'
        }`}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              data-testid={`chat-message-${msg.role}`}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl p-3.5 text-xs space-y-2 border ${
                  isUser
                    ? 'bg-[#1D4ED8] text-white border-blue-700'
                    : 'bg-white text-slate-800 border-slate-200 shadow-2xs'
                }`}
              >
                {/* Turn Metadata Header */}
                <div className="flex items-center justify-between gap-3 text-[10px] font-mono opacity-85">
                  <span className="font-semibold">
                    {isUser
                      ? `${currentUser?.full_name || currentUser?.name || currentRole} (${currentRole})`
                      : `Gemini Assistant · ${msg.modelUsed || 'gemini-3.8-flash'}`}
                  </span>
                  {msg.groundingMode && msg.groundingMode !== 'none' && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold ${
                        isUser
                          ? 'bg-blue-800 text-blue-100'
                          : msg.groundingMode === 'googleMaps'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {msg.groundingMode === 'googleMaps'
                        ? 'Google Maps Grounded'
                        : 'Google Search Grounded'}
                    </span>
                  )}
                </div>

                {/* Message Content */}
                <div className="leading-relaxed whitespace-pre-line">{msg.text}</div>

                {/* Google Maps Grounding Links */}
                {!isUser && msg.mapsLinks && msg.mapsLinks.length > 0 && (
                  <div
                    data-testid="chat-maps-grounding-links"
                    className="pt-2 border-t border-slate-100 space-y-1.5"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>Google Maps Grounding Places ({msg.mapsLinks.length})</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {msg.mapsLinks.map((link, i) => (
                        <a
                          key={`${link.uri}-${i}`}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200 text-amber-950 flex items-center justify-between gap-2 text-[11px] font-medium"
                        >
                          <span className="truncate">{link.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-amber-700" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Google Search Grounding Links */}
                {!isUser && msg.searchLinks && msg.searchLinks.length > 0 && (
                  <div
                    data-testid="chat-search-grounding-links"
                    className="pt-2 border-t border-slate-100 space-y-1.5"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>Google Search Grounding Citations ({msg.searchLinks.length})</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {msg.searchLinks.map((link, i) => (
                        <a
                          key={`${link.uri}-${i}`}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-2 text-[11px] font-medium"
                        >
                          <span className="truncate">{link.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-emerald-700" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-slate-500 px-2 py-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>
              Gemini (<code className="font-mono">{selectedModel}</code>) is generating a response...
            </span>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Chat Input Form */}
      <form
        onSubmit={(e) => handleSendMessage(e)}
        className="p-3.5 bg-white border-t border-slate-200 flex gap-2"
      >
        <input
          type="text"
          data-testid="gemini-chat-input"
          aria-label="Send a message to the Gemini assistant"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Ask ${activePersonaObj.label} (${selectedModel})...`}
          className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
        />
        <button
          type="submit"
          data-testid="gemini-chat-send-btn"
          disabled={isSending || !inputMessage.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
