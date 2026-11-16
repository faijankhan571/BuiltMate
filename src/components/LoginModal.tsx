import React, { useState, useEffect } from 'react';
import {
  HardHat,
  ShieldCheck,
  Calculator,
  ClipboardCheck,
  Briefcase,
  Wrench,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sun,
  Moon,
  Users,
  ShieldAlert,
  Database,
  Globe,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { useLanguage } from '../context/LanguageContext';
import { RoleTableName, UserRole } from '../types';
import { checkActiveIdentifierInSixRoleTables } from '../utils/workforceLogic';
import { PWAInstallButton } from './PWAInstallButton';

interface RoleOption {
  role: UserRole;
  roleTable: RoleTableName;
  displayLabel: string;
  shortTabLabel: string;
  description: string;
  placeholderEmail: string;
  placeholderUserId: string;
  badgeColor: string;
  icon: React.ReactNode;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'Admin',
    roleTable: 'admins',
    displayLabel: 'Admin',
    shortTabLabel: 'Admin',
    description:
      'Manage users, projects, sites, employees, labourers, assignments, attendance, leave approvals, materials, suppliers, and system reports.',
    placeholderEmail: 'arjun.deshmukh@buildmate.ac.in',
    placeholderUserId: 'ADM001',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    role: 'HR Manager',
    roleTable: 'hr_managers',
    displayLabel: 'HR Manager',
    shortTabLabel: 'HR Manager',
    description:
      'Manage employee and labourer information, attendance, leave, KYC requests, and workforce assignments.',
    placeholderEmail: 'manasi.pawar@buildmate.ac.in',
    placeholderUserId: 'HRM001',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: <Users className="w-4 h-4" />,
  },
  {
    role: 'Site Supervisor',
    roleTable: 'site_supervisors',
    displayLabel: 'Site Supervisor',
    shortTabLabel: 'Site Supervisor',
    description:
      'Access assigned sites, assigned workers, daily attendance, task updates, material requests, and site progress.',
    placeholderEmail: 'sachin.patil@buildmate.ac.in',
    placeholderUserId: 'SUP001',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <ClipboardCheck className="w-4 h-4" />,
  },
  {
    role: 'Accountant',
    roleTable: 'accountants',
    displayLabel: 'Accountant',
    shortTabLabel: 'Accountant',
    description:
      'Access authorized employee and labourer salary details, attendance needed for payroll, wage calculations, salary payments, pending balances, and financial reports.',
    placeholderEmail: 'neel.shah@buildmate.ac.in',
    placeholderUserId: 'ACC001',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: <Calculator className="w-4 h-4" />,
  },
  {
    role: 'Employee',
    roleTable: 'employees',
    displayLabel: 'Employee',
    shortTabLabel: 'Employee',
    description:
      'View their own profile, attendance, leave requests, assigned tasks, and authorized salary information.',
    placeholderEmail: 'rohit.sharma@buildmate.ac.in',
    placeholderUserId: 'EMP001',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: <Briefcase className="w-4 h-4" />,
  },
  {
    role: 'Labourer',
    roleTable: 'labourers',
    displayLabel: 'Labourer',
    shortTabLabel: 'Labourer',
    description:
      'View their own labour profile, skills, wage rate, attendance, assigned site, tasks, and authorized wage/payment information.',
    placeholderEmail: 'ramesh.patil@buildmate.ac.in',
    placeholderUserId: 'LAB001',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: <Wrench className="w-4 h-4" />,
  },
];

export const LoginModal: React.FC = () => {
  const {
    loginWithSupabase,
    resetPasswordWithSupabase,
    verifyRoleScenario,
    lastAuthResolution,
    isDarkMode,
    toggleDarkMode,
  } = useWorkforce();
  const { currentLanguage, languages, setLanguage, t } = useLanguage();

  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [liveRoleTableRows, setLiveRoleTableRows] = useState<
    Partial<Record<RoleTableName, Record<string, any>[]>>
  >({});

  const activeRoleOption =
    ROLE_OPTIONS.find((r) => r.role === selectedRole) || ROLE_OPTIONS[0];

  // Live check against Supabase role tables when email / user_id changes
  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed || trimmed.length < 3) {
      setLiveRoleTableRows({});
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/verify-role-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: trimmed }),
        });
        if (!cancelled && res.ok) {
          const payload = await res.json();
          if (payload.tableRows && Object.keys(payload.tableRows).length > 0) {
            setLiveRoleTableRows(payload.tableRows);
          }
        }
      } catch {
        // Offline or local resolution handled by checkActiveIdentifierInSixRoleTables
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email]);

  const activeGuardCheck = checkActiveIdentifierInSixRoleTables(
    email,
    liveRoleTableRows,
    selectedRole
  );
  const isEnteredEmailActive = activeGuardCheck.isActive;

  // Auto-sync role tab if entered active email maps to a specific role
  useEffect(() => {
    if (activeGuardCheck.isActive && activeGuardCheck.role && mode === 'login') {
      setSelectedRole(activeGuardCheck.role);
    }
  }, [activeGuardCheck.isActive, activeGuardCheck.role, mode]);

  const handleSelectRole = (option: RoleOption) => {
    setSelectedRole(option.role);
    setValidationError(null);
    setSuccessMessage(null);
  };

  const validateEmailFormat = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const validateLoginIdentifier = (value: string) => {
    const trimmed = value.trim();
    if (validateEmailFormat(trimmed)) return true;
    return /^(ADM|HR|HRM|SUP|ACC|EMP|LAB)\d{1,4}$/i.test(trimmed);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setValidationError('Please enter your work email address or User ID.');
      return;
    }
    if (!validateLoginIdentifier(email)) {
      setValidationError(
        'Please enter a valid work email (e.g. admin@buildmate.in) or User ID (e.g. ADM001).'
      );
      return;
    }
    if (!password) {
      setValidationError('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithSupabase(
        email.trim(),
        password,
        selectedRole,
        rememberMe
      );
      if (res.error) {
        setValidationError(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (!email.trim() || !validateEmailFormat(email)) {
      setValidationError(
        'Please enter a valid registered email address to receive a password reset link.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithSupabase(email.trim());
      if (res.error) {
        setValidationError(res.error);
      } else if (res.message) {
        setSuccessMessage(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecurityScenarioTest = (
    scenario: 'INACTIVE_PROFILE' | 'MULTI_ROLE_CONFLICT' | 'UNREGISTERED_USER'
  ) => {
    setValidationError(null);
    setSuccessMessage(null);
    const res = verifyRoleScenario(scenario, rememberMe);
    if (res.resolution.status !== 'AUTHORIZED') {
      setValidationError(`[${res.resolution.status}] ${res.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between py-4 px-4 sm:px-6 lg:px-8">
      {/* Top Brand Header */}
      <header className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] flex items-center justify-center text-amber-400 shadow-xs shrink-0">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-[#0F172A]">
                BUILDMATE
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600">
              Construction Workforce &amp; Site Operations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
          <div
            data-no-translate="true"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              data-testid="login-india-language-select"
              aria-label="Select Indian Language (Python NLP)"
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
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
          </div>
          <PWAInstallButton />
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Centered Login Card */}
      <main className="my-3 max-w-6xl w-full mx-auto space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Top Role Selector Section */}
          <div className="bg-slate-50/90 border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h1 className="font-display text-base sm:text-lg font-bold text-[#0F172A]">
                  Select Your Operational Role to Sign In
                </h1>
                <p className="text-xs text-slate-600">
                  Choose your operational role below to access your authorized BuildMate workspace.
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider shrink-0">
                Single Active Role Enforced
              </span>
            </div>

            {/* 6 Selectable Role Tabs / Cards above the login form */}
            <div
              role="tablist"
              aria-label="User Role Selection"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5"
            >
              {ROLE_OPTIONS.map((option) => {
                const isSelected = selectedRole === option.role;
                return (
                  <button
                    key={option.role}
                    type="button"
                    role="tab"
                    data-testid={`login-role-tab-${option.roleTable}`}
                    aria-selected={isSelected}
                    onClick={() => handleSelectRole(option)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-[#1D4ED8] ring-2 ring-[#1D4ED8]/15 shadow-xs'
                        : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#1D4ED8] text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {option.icon}
                        </div>
                      </div>
                      <div className="font-display font-bold text-xs text-[#0F172A]">
                        {option.displayLabel}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Body: Left Construction Site Illustration + Right Login Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Column: Construction-Site Illustration & Selected Role Scope */}
            <div className="lg:col-span-5 bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-200 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-[#0F172A]">
                  {activeRoleOption.displayLabel} Access Scope
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {activeRoleOption.description}
                </p>

                {/* Architectural Construction-Site Vector Illustration */}
                <div className="my-3.5 rounded-xl bg-[#0F172A] p-3.5 border border-slate-800 text-white relative overflow-hidden">
                  <svg
                    viewBox="0 0 400 185"
                    className="w-full h-28"
                    role="img"
                    aria-label="Construction site tower crane and high-rise structure illustration"
                  >
                    {/* Blueprint Grid Lines */}
                    <g stroke="#1E293B" strokeWidth="1">
                      <line x1="0" y1="35" x2="400" y2="35" />
                      <line x1="0" y1="75" x2="400" y2="75" />
                      <line x1="0" y1="115" x2="400" y2="115" />
                      <line x1="0" y1="155" x2="400" y2="155" />
                      <line x1="70" y1="0" x2="70" y2="185" />
                      <line x1="150" y1="0" x2="150" y2="185" />
                      <line x1="230" y1="0" x2="230" y2="185" />
                      <line x1="310" y1="0" x2="310" y2="185" />
                    </g>

                    {/* Ground Horizon */}
                    <line x1="10" y1="168" x2="390" y2="168" stroke="#475569" strokeWidth="2" />

                    {/* High-Rise Building Frame 1 (Left-Center) */}
                    <rect
                      x="55"
                      y="62"
                      width="85"
                      height="106"
                      fill="#1E293B"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                    />
                    <g stroke="#334155" strokeWidth="1.5">
                      <line x1="55" y1="88" x2="140" y2="88" />
                      <line x1="55" y1="114" x2="140" y2="114" />
                      <line x1="55" y1="140" x2="140" y2="140" />
                      <line x1="83" y1="62" x2="83" y2="168" />
                      <line x1="112" y1="62" x2="112" y2="168" />
                    </g>

                    {/* High-Rise Building Frame 2 (Center-Right Under Construction) */}
                    <rect
                      x="165"
                      y="45"
                      width="95"
                      height="123"
                      fill="#0F172A"
                      stroke="#60A5FA"
                      strokeWidth="1.5"
                    />
                    <g stroke="#1E3A8A" strokeWidth="1.5">
                      <line x1="165" y1="70" x2="260" y2="70" />
                      <line x1="165" y1="95" x2="260" y2="95" />
                      <line x1="165" y1="120" x2="260" y2="120" />
                      <line x1="165" y1="145" x2="260" y2="145" />
                      <line x1="196" y1="45" x2="196" y2="168" />
                      <line x1="228" y1="45" x2="228" y2="168" />
                    </g>

                    {/* Tower Crane Mast & Jib (Amber Industrial Accent) */}
                    <g stroke="#F59E0B" strokeWidth="2" fill="none">
                      <rect x="298" y="20" width="12" height="148" />
                      <line x1="298" y1="40" x2="310" y2="55" />
                      <line x1="310" y1="40" x2="298" y2="55" />
                      <line x1="298" y1="75" x2="310" y2="90" />
                      <line x1="310" y1="75" x2="298" y2="90" />
                      <line x1="298" y1="110" x2="310" y2="125" />
                      <line x1="185" y1="24" x2="355" y2="24" strokeWidth="3" />
                      <line x1="304" y1="8" x2="215" y2="24" strokeWidth="1.2" />
                      <line x1="304" y1="8" x2="345" y2="24" strokeWidth="1.2" />
                      <line x1="304" y1="8" x2="304" y2="24" strokeWidth="2" />
                      <line x1="215" y1="24" x2="215" y2="42" stroke="#FBBF24" strokeWidth="1.5" />
                    </g>
                    <rect x="200" y="38" width="30" height="5" fill="#F59E0B" rx="1" />
                  </svg>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span>BUILDMATE FIELD ERP</span>
                    <span className="text-amber-400">WORKFORCE &amp; SITE OPS</span>
                  </div>
                </div>
              </div>

              {/* Connected Supabase & IndexedDB Offline Architecture Summary */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Supabase Connected Database</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Real-time workforce operations with Service Worker &amp; IndexedDB offline
                  attendance and task synchronization.
                </p>
              </div>
            </div>

            {/* Right Column: Sign-In & Password Recovery Form */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white">
              <div>
                {mode === 'login' ? (
                  <>
                    <div className="mb-5">
                      <h2 className="font-display text-xl font-bold text-[#0F172A]">
                        {t('welcome', 'Sign in to BuildMate')}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">
                        Enter your registered work email or User ID and password to access your
                        dashboard.
                      </p>
                    </div>

                    {validationError && (
                      <div
                        role="alert"
                        className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5"
                      >
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold">Access Denied</p>
                          <p className="mt-0.5 leading-relaxed">{validationError}</p>
                          {lastAuthResolution && lastAuthResolution.status !== 'AUTHORIZED' && (
                            <div className="mt-2 pt-2 border-t border-red-200/80 flex flex-wrap items-center gap-3 font-mono text-[11px] text-red-700">
                              <span>Status: {lastAuthResolution.status}</span>
                              <span>
                                Matched Tables:{' '}
                                {lastAuthResolution.matchedTables.length > 0
                                  ? lastAuthResolution.matchedTables.join(', ')
                                  : 'None (0/6)'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {successMessage && (
                      <div
                        role="status"
                        className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
                      {/* Work Email or User ID Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="buildmate-email"
                            className="block text-xs font-semibold text-[#0F172A]"
                          >
                            Work Email Address or User ID
                          </label>
                          {isEnteredEmailActive && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Active Account Verified</span>
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Mail
                            className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                              isEnteredEmailActive ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          />
                          <input
                            id="buildmate-email"
                            name="email"
                            type="text"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={`${activeRoleOption.placeholderEmail} or ${activeRoleOption.placeholderUserId}`}
                            className={`w-full pl-10 pr-3.5 py-2.5 text-xs text-[#0F172A] bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                              isEnteredEmailActive
                                ? 'border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/20'
                                : 'border-slate-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]/15'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Password Field with Visibility Toggle Icon */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="buildmate-password"
                            className="block text-xs font-semibold text-[#0F172A]"
                          >
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setMode('forgot_password');
                              setValidationError(null);
                              setSuccessMessage(null);
                            }}
                            className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="buildmate-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your account password"
                            className="w-full pl-10 pr-10 py-2.5 text-xs text-[#0F172A] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
                          />
                          <button
                            type="button"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Remember Me Checkbox */}
                      <div className="flex items-center justify-between pt-1">
                        <label
                          htmlFor="buildmate-remember-me"
                          className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                        >
                          <input
                            id="buildmate-remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                          />
                          <span>Remember me on this device</span>
                        </label>
                      </div>

                      {/* Primary Blue Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  /* Password Recovery View */
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setValidationError(null);
                        setSuccessMessage(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0F172A] cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>

                    <div>
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-[#1D4ED8] flex items-center justify-center mb-3">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <h2 className="font-display text-xl font-bold text-[#0F172A]">
                        Reset Your BuildMate Password
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">
                        Enter your registered work email address. We will send a password recovery
                        link to your inbox.
                      </p>
                    </div>

                    {validationError && (
                      <div
                        role="alert"
                        className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5"
                      >
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{validationError}</span>
                      </div>
                    )}

                    {successMessage && (
                      <div
                        role="status"
                        className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handlePasswordResetSubmit} noValidate className="space-y-4">
                      <div>
                        <label
                          htmlFor="recovery-email"
                          className="block text-xs font-semibold text-[#0F172A] mb-1.5"
                        >
                          Registered Work Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="recovery-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@buildmate.ac.in"
                            className="w-full pl-10 pr-3.5 py-2.5 text-xs text-[#0F172A] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending Recovery Link...</span>
                          </>
                        ) : (
                          <span>Send Password Reset Link</span>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* 6-Role Security Policy & Guard Verification Suite — Turns GREEN when entered email is active */}
              <div
                data-testid="six-role-auth-guard"
                data-guard-active={isEnteredEmailActive ? 'true' : 'false'}
                className={`mt-6 p-4 rounded-xl border transition-all ${
                  isEnteredEmailActive
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/15 text-emerald-950'
                    : 'bg-slate-50/60 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`text-xs font-display font-bold flex items-center gap-1.5 ${
                      isEnteredEmailActive ? 'text-emerald-900' : 'text-slate-800'
                    }`}
                  >
                    {isEnteredEmailActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>6-Role Authentication Guard &amp; Edge-Case Verification</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      isEnteredEmailActive
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    {isEnteredEmailActive
                      ? 'ACTIVE · is_active = true'
                      : 'No Auto-Admin · Single Active Profile'}
                  </span>
                </div>

                {isEnteredEmailActive && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-100/80 border border-emerald-300 text-[11px] text-emerald-950 flex items-center justify-between gap-2">
                    <span className="font-medium">
                      Verified Active Account:{' '}
                      <strong>{activeGuardCheck.fullName || email.trim()}</strong> (
                      <code className="font-mono">{activeGuardCheck.workEmail || email.trim()}</code>)
                    </span>
                    <span className="font-mono font-bold text-emerald-800">
                      GUARD PASSED · VERIFIED
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSecurityScenarioTest('INACTIVE_PROFILE')}
                    className={`px-2.5 py-2 rounded-lg border text-left text-[11px] transition-colors cursor-pointer ${
                      isEnteredEmailActive
                        ? 'border-emerald-300 bg-emerald-100/70 hover:bg-emerald-200/70 text-emerald-950'
                        : 'border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-900'
                    }`}
                  >
                    <div className="font-semibold">
                      {isEnteredEmailActive ? 'Active Profile Verified' : 'Test Inactive Profile'}
                    </div>
                    <div
                      className={`font-mono text-[10px] ${
                        isEnteredEmailActive ? 'text-emerald-800' : 'text-amber-700'
                      }`}
                    >
                      {isEnteredEmailActive ? 'is_active = true → Allow' : 'is_active = false → Deny'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSecurityScenarioTest('MULTI_ROLE_CONFLICT')}
                    className={`px-2.5 py-2 rounded-lg border text-left text-[11px] transition-colors cursor-pointer ${
                      isEnteredEmailActive
                        ? 'border-emerald-300 bg-emerald-100/70 hover:bg-emerald-200/70 text-emerald-950'
                        : 'border-red-200 bg-red-50/70 hover:bg-red-100/80 text-red-900'
                    }`}
                  >
                    <div className="font-semibold">
                      {isEnteredEmailActive ? 'Single Role Confirmed' : 'Test Multi-Role Conflict'}
                    </div>
                    <div
                      className={`font-mono text-[10px] ${
                        isEnteredEmailActive ? 'text-emerald-800' : 'text-red-700'
                      }`}
                    >
                      {isEnteredEmailActive
                        ? `1 Active Role (${activeGuardCheck.role || activeRoleOption.displayLabel})`
                        : '2+ Role Tables → Deny'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSecurityScenarioTest('UNREGISTERED_USER')}
                    className={`px-2.5 py-2 rounded-lg border text-left text-[11px] transition-colors cursor-pointer ${
                      isEnteredEmailActive
                        ? 'border-emerald-300 bg-emerald-100/70 hover:bg-emerald-200/70 text-emerald-950'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="font-semibold">
                      {isEnteredEmailActive ? 'Registered Role Profile' : 'Test Missing Profile'}
                    </div>
                    <div
                      className={`font-mono text-[10px] ${
                        isEnteredEmailActive ? 'text-emerald-800' : 'text-slate-600'
                      }`}
                    >
                      {isEnteredEmailActive
                        ? `${activeGuardCheck.userId || activeRoleOption.placeholderUserId} → Authorized`
                        : '0 Role Tables → Deny'}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Professional Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <p className="font-medium text-slate-600">
          © 2026 BuildMate. All rights reserved.
        </p>
        <p className="text-[11px] font-mono flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>BUILDMATE · Construction Workforce &amp; Site Operations</span>
        </p>
      </footer>
    </div>
  );
};
