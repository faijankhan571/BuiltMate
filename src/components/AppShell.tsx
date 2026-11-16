import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Wrench,
  UserCog,
  FolderKanban,
  Building2,
  CalendarCheck,
  CheckSquare,
  Clock,
  Wallet,
  Package,
  Truck,
  BarChart3,
  FileSpreadsheet,
  Sparkles,
  Database,
  Bell,
  HardHat,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudUpload,
  MessageSquare,
  Globe,
  Languages,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { useLanguage } from '../context/LanguageContext';
import { ModuleId, canAccessModule, getRoleTableForRole } from '../utils/workforceLogic';
import { PWAInstallButton } from './PWAInstallButton';
import { GeminiChatbotPanel } from './GeminiChatbotPanel';

interface AppShellProps {
  activeModule: ModuleId;
  onSelectModule: (m: ModuleId) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  {
    id: 'supervisor_dashboard',
    label: 'Site Supervisor Hub',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  { id: 'employees', label: 'Employees', icon: <Users className="w-4 h-4" /> },
  { id: 'labours', label: 'Labour Management', icon: <Wrench className="w-4 h-4" /> },
  { id: 'hr_management', label: 'HR Management', icon: <UserCog className="w-4 h-4" /> },
  { id: 'projects', label: 'Projects & Sites', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'sites', label: 'Construction Sites', icon: <Building2 className="w-4 h-4" /> },
  { id: 'attendance', label: 'Daily Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
  { id: 'tasks', label: 'Task Management', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'leaves', label: 'Leave Requests', icon: <Clock className="w-4 h-4" /> },
  { id: 'salary', label: 'Payroll & Accountant', icon: <Wallet className="w-4 h-4" /> },
  { id: 'materials', label: 'Materials & Requests', icon: <Package className="w-4 h-4" /> },
  { id: 'suppliers', label: 'Suppliers & Quotes', icon: <Truck className="w-4 h-4" /> },
  { id: 'reports', label: 'Operational Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'csv_hub', label: 'CSV Export', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: 'ai_insights', label: 'Gemini AI Insights', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'supabase_setup', label: 'Supabase SQL & Setup', icon: <Database className="w-4 h-4" /> },
];

export const AppShell: React.FC<AppShellProps> = ({
  activeModule,
  onSelectModule,
  children,
}) => {
  const {
    currentUser,
    currentRole,
    isLoading,
    logout,
    alerts,
    markAlertRead,
    markAllAlertsRead,
    syncWithSupabase,
    toasts,
    dismissToast,
    isDarkMode,
    toggleDarkMode,
    isOnline,
    isSimulatedOffline,
    setOfflineSimulation,
    offlineQueueCount,
    isSyncingOfflineQueue,
    syncOfflineQueue,
  } = useWorkforce();

  const {
    currentLanguage,
    currentLanguageMeta,
    languages,
    uiDictionary,
    isTranslating,
    lastNlpResult,
    setLanguage,
    t,
    translateTextViaPythonNlp,
  } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = React.useState(false);
  const [nlpModalOpen, setNlpModalOpen] = React.useState(false);
  const [customNlpInput, setCustomNlpInput] = React.useState(
    'Welcome to BuildMate Daily Attendance, My Salary, and Used Material Entry for Site Supervisor'
  );

  if (!currentUser) return null;

  const allowedNavItems = NAV_ITEMS.filter((item) =>
    canAccessModule(currentRole, item.id)
  ).map((item) => {
    let baseLabel = item.label;
    let dictKey: string = item.id;
    if (currentRole === 'Employee' && item.id === 'tasks') {
      baseLabel = 'Office Tasks (HR & Admin)';
      dictKey = 'office_tasks';
    }
    if ((currentRole === 'Employee' || currentRole === 'Labourer') && item.id === 'salary') {
      baseLabel = 'My Salary';
      dictKey = 'my_salary';
    }
    const localized =
      currentLanguage !== 'en' && uiDictionary[dictKey]
        ? uiDictionary[dictKey]
        : baseLabel;
    return { ...item, label: localized };
  });

  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const activeNavLabel =
    allowedNavItems.find((i) => i.id === activeModule)?.label ||
    NAV_ITEMS.find((i) => i.id === activeModule)?.label ||
    'Dashboard';
  const activeRoleTable = currentUser.role_table || getRoleTableForRole(currentRole);
  const displayName = currentUser.full_name || currentUser.name || currentRole;

  const handleNavClick = (id: ModuleId) => {
    onSelectModule(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#0F172A] text-slate-200 shrink-0 border-r border-slate-800 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <HardHat className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-display font-bold text-base text-white tracking-tight block leading-none">
              BUILDMATE
            </span>
            <span className="text-[10px] text-slate-400 truncate block mt-0.5">
              Supabase Live · SW + IndexedDB
            </span>
          </div>
        </div>

        {/* Logged-In User Profile Card (No Role Dropdown) */}
        <div
          data-testid="sidebar-user-profile"
          className="p-4 border-b border-slate-800 bg-slate-900/60"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Logged In Account
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 font-mono text-[10px] font-semibold text-amber-300">
              {currentRole}
            </span>
          </div>
          <p className="text-sm text-white mt-1.5 truncate font-bold">
            {displayName}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {currentUser.email}
          </p>
          {currentUser.phone && (
            <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
              Phone: {currentUser.phone}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>ID: {currentUser.user_id}</span>
            <span className="text-emerald-400">Active Profile</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          aria-label="Main Sidebar Navigation"
          className="flex-1 px-3 py-3 space-y-1 overflow-y-auto"
        >
          {allowedNavItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {/* IndexedDB Offline Queue & Service Worker Status */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                )}
                {isOnline ? 'Supabase Connected' : 'Offline IndexedDB'}
              </span>
              <span
                data-testid="offline-queue-badge"
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  offlineQueueCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/15 text-emerald-300'
                }`}
              >
                Queue: {offlineQueueCount}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Attendance &amp; Task updates queue in IndexedDB while offline and auto-sync when online.
            </p>
            {offlineQueueCount > 0 && isOnline && (
              <button
                type="button"
                onClick={syncOfflineQueue}
                disabled={isSyncingOfflineQueue}
                className="w-full mt-1 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold cursor-pointer"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncingOfflineQueue ? 'animate-bounce' : ''}`} />
                <span>
                  {isSyncingOfflineQueue
                    ? 'Syncing IndexedDB...'
                    : `Sync ${offlineQueueCount} Queued Item(s)`}
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={syncWithSupabase}
            disabled={isLoading || !isOnline}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs text-emerald-300 hover:text-white hover:bg-emerald-950/60 border border-emerald-800/60 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live Supabase DB</span>
          </button>

          <button
            type="button"
            data-testid="sidebar-sign-out-btn"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-red-950/50 border border-slate-800 hover:border-red-800/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('sign_out', 'Sign Out')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-display font-bold text-slate-900 whitespace-nowrap">
                BUILDMATE
              </span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-700 truncate">
                {activeNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span
              data-testid="header-user-name"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 whitespace-nowrap"
            >
              <span className="font-semibold text-slate-900">{displayName}</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-[11px] text-blue-700 font-semibold">{currentRole}</span>
            </span>

            <span
              data-testid="supabase-connection-mode"
              className="hidden xl:inline-block text-xs text-slate-500 whitespace-nowrap"
            >
              Database: <strong className="text-emerald-700">Supabase Connected DB</strong>
            </span>

            {/* Service Worker + IndexedDB Offline Mode Toggle */}
            <button
              type="button"
              data-testid="toggle-offline-mode"
              onClick={() => setOfflineSimulation(!isSimulatedOffline)}
              title={
                isOnline
                  ? 'Switch to Offline Mode to test Service Worker & IndexedDB attendance/task queueing'
                  : 'Restore Online Connection to auto-sync IndexedDB queue to Supabase'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Online (Supabase Live)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">
                    Offline Mode (IndexedDB: {offlineQueueCount})
                  </span>
                </>
              )}
            </button>

            <PWAInstallButton />

            {/* Pan-India 23 Languages Selector (Powered by Python 3 NLP) */}
            <div
              data-no-translate="true"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <select
                data-testid="india-language-select"
                aria-label="Select Indian Language (Python NLP)"
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[140px]"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {currentLanguage === 'en'
                      ? lang.code === 'en'
                        ? 'English'
                        : `${lang.name} (${lang.nativeName})`
                      : lang.nativeName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="open-python-nlp-modal-btn"
                onClick={() => setNlpModalOpen(true)}
                title="Open Python 3 Indic-NLP Language & Tokenization Engine (All 22 Scheduled Indian Languages + English)"
                className="px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[10px] font-semibold cursor-pointer"
              >
                {currentLanguage === 'en' ? 'NLP' : currentLanguageMeta.nativeName}
              </button>
            </div>

            {/* Ask Gemini AI Multi-Turn Assistant Drawer Button */}
            <button
              type="button"
              data-testid="open-gemini-assistant-drawer-btn"
              onClick={() => setChatDrawerOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer"
              title="Open Multi-Turn Gemini AI Assistant (Argon / 3.8 Flash / 3.1 Flash-Lite + Search & Maps Grounding)"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Ask Gemini AI</span>
            </button>

            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                aria-label={`Notifications (${unreadCount} unread)`}
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-600 text-white font-mono text-[10px] font-bold rounded">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-display text-xs font-bold text-slate-900">
                      Operational Alerts ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAlertsRead}
                        className="text-xs text-blue-600 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {alerts.map((al) => (
                      <div
                        key={al.id}
                        onClick={() => markAlertRead(al.id)}
                        className={`p-3.5 text-xs cursor-pointer ${
                          al.is_read ? 'bg-white text-slate-600' : 'bg-blue-50/40 text-slate-900'
                        } hover:bg-slate-50`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{al.title}</span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {al.category}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{al.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Offline IndexedDB Banner when offline or when pending mutations exist */}
        {(!isOnline || offlineQueueCount > 0) && (
          <div
            data-testid="offline-sync-banner"
            className={`px-4 sm:px-6 py-2.5 border-b text-xs flex flex-wrap items-center justify-between gap-3 ${
              !isOnline
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CloudUpload className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>
                {!isOnline ? (
                  <>
                    <strong>Offline Mode Active (Service Worker + IndexedDB):</strong> Attendance logs and Task updates recorded now are saved in IndexedDB (<code className="font-mono">{offlineQueueCount}</code> queued) and will automatically sync to Supabase once connection is restored.
                  </>
                ) : (
                  <>
                    <strong>Connection Restored:</strong> <code className="font-mono">{offlineQueueCount}</code> offline mutation(s) in IndexedDB ready to sync to Supabase.
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <button
                  type="button"
                  onClick={() => setOfflineSimulation(false)}
                  className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer"
                >
                  Restore Online &amp; Auto-Sync
                </button>
              ) : (
                <button
                  type="button"
                  onClick={syncOfflineQueue}
                  disabled={isSyncingOfflineQueue}
                  className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  {isSyncingOfflineQueue ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Drawer (No Active Role Dropdown) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-full bg-[#0F172A] text-white h-full flex flex-col z-10">
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <HardHat className="w-5 h-5 text-amber-400" />
                  <span className="font-display font-bold text-base">BUILDMATE</span>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                data-testid="mobile-user-profile"
                className="p-4 border-b border-slate-800 bg-slate-900/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Logged In Account
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 font-mono text-[10px] font-semibold text-amber-300">
                    {currentRole}
                  </span>
                </div>
                <p className="text-sm font-bold text-white mt-1 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentUser.email}</p>
              </div>

              <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                {allowedNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                      activeModule === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2 px-3 rounded-md bg-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Stack */}
        {toasts.length > 0 && (
          <div
            aria-live="polite"
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                onClick={() => dismissToast(t.id)}
                className={`pointer-events-auto p-3.5 rounded-lg border text-xs font-medium shadow-md cursor-pointer flex items-center justify-between gap-3 ${
                  t.type === 'success'
                    ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
                    : t.type === 'error'
                    ? 'bg-red-950 text-red-100 border-red-800'
                    : 'bg-slate-900 text-slate-100 border-slate-700'
                }`}
              >
                <span>{t.message}</span>
                <X className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </div>
            ))}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Logged-In User Dashboard Greeting Banner (Visible Across All 6 Roles) */}
          <div
            data-testid="dashboard-welcome-banner"
            className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-display font-bold text-sm text-blue-700 shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-sm sm:text-base text-slate-900">
                    {t('welcome', 'Welcome')}, {displayName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    {currentRole} {t('dashboard', 'Dashboard')}
                  </span>
                  {currentLanguage !== 'en' && (
                    <span
                      data-no-translate="true"
                      className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200"
                    >
                      {currentLanguageMeta.nativeName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Account ID: <span className="font-mono text-slate-700">{currentUser.user_id}</span>
                  {' · '}
                  Work Email: <span className="font-mono text-slate-700">{currentUser.email}</span>
                  {currentUser.phone && (
                    <>
                      {' · '}
                      Phone: <span className="font-mono text-slate-700">{currentUser.phone}</span>
                    </>
                  )}
                  {' · '}
                  Role: <span className="font-mono text-emerald-700 font-semibold">{currentRole}</span>
                  {currentRole === 'Employee' && (
                    <span className="text-blue-700 font-medium">
                      {' · '}Assigned Scope: Office Tasks (Assigned by HR Manager &amp; Admin)
                    </span>
                  )}
                  {currentRole === 'Labourer' && (
                    <span className="text-amber-700 font-medium">
                      {' · '}Assigned Scope: My Assigned Tasks (HR, Admin &amp; Site Supervisor)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(currentRole === 'Employee' || currentRole === 'Labourer') &&
                activeModule !== 'tasks' && (
                  <button
                    type="button"
                    onClick={() => onSelectModule('tasks')}
                    className="px-3 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    {currentRole === 'Employee' ? 'Open My Office Tasks' : 'Open My Assigned Tasks'}
                  </button>
                )}
              {activeModule !== 'dashboard' && (
                <button
                  type="button"
                  onClick={() => onSelectModule('dashboard')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Overview Dashboard
                </button>
              )}
            </div>
          </div>

          {children}
        </main>

        {/* Slide-Over Multi-Turn Gemini Chatbot Drawer */}
        {chatDrawerOpen && (
          <div
            data-testid="gemini-assistant-drawer"
            className="fixed inset-0 z-50 flex justify-end"
          >
            <div
              className="fixed inset-0 bg-slate-900/50"
              onClick={() => setChatDrawerOpen(false)}
            />
            <div className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-display text-sm font-bold">
                    BuildMate Gemini AI Workspace Assistant
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="close-gemini-assistant-drawer-btn"
                  onClick={() => setChatDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 bg-slate-50">
                <GeminiChatbotPanel compact />
              </div>
            </div>
          </div>
        )}

        {/* Pan-India Python 3 Indic-NLP Translation & Tokenization Modal */}
        {nlpModalOpen && (
          <div
            data-testid="python-nlp-translator-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
          >
            <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full p-6 shadow-2xl text-xs space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                    <Languages className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Pan-India Multilingual Python 3 NLP Engine (All 22 Scheduled Indian Languages + English)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Powered by <code className="font-mono text-indigo-700">python3 scripts/nlp_language_engine.py</code> · N-Gram Phrase &amp; Morphological Tokenizer
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="close-python-nlp-modal-btn"
                  onClick={() => setNlpModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 23 Indian Languages Grid */}
              <div>
                <div className="font-semibold text-slate-800 mb-2">
                  Select Any Official Indian Language ({languages.length} Supported Languages):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {languages.map((lang) => {
                    const active = currentLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-700'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs truncate">
                          {lang.name} ({lang.code.toUpperCase()})
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            active ? 'text-indigo-100' : 'text-slate-600'
                          }`}
                        >
                          {lang.nativeName} · {lang.script}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Python NLP Translation & Tokenization Sandbox */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    Test Live Python 3 Indic-NLP Tokenizer &amp; Domain Translator
                  </span>
                  <span className="font-mono text-[11px] text-indigo-700 font-semibold">
                    Active: {currentLanguageMeta.name} ({currentLanguageMeta.nativeName} · {currentLanguageMeta.script})
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    data-testid="python-nlp-input"
                    value={customNlpInput}
                    onChange={(e) => setCustomNlpInput(e.target.value)}
                    placeholder="Enter construction instruction or UI phrase to translate via Python NLP..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <button
                    type="button"
                    data-testid="run-python-nlp-btn"
                    disabled={isTranslating}
                    onClick={() => translateTextViaPythonNlp(customNlpInput, currentLanguage)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shrink-0"
                  >
                    {isTranslating ? 'Running Python NLP...' : 'Run Python NLP'}
                  </button>
                </div>

                {lastNlpResult && (
                  <div
                    data-testid="python-nlp-output-card"
                    className="p-3.5 rounded-lg bg-white border border-indigo-200 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                      <span>Engine: {lastNlpResult.engine}</span>
                      <span>
                        Language: {lastNlpResult.languageName} ({lastNlpResult.nativeName}) · Tokens:{' '}
                        {lastNlpResult.tokenCount}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-indigo-950">
                      {lastNlpResult.translatedText}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {lastNlpResult.tokens.map((tok, i) => (
                        <span
                          key={`${tok}-${i}`}
                          className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono text-[10px]"
                        >
                          {tok}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
