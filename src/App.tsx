/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WorkforceProvider, useWorkforce } from './context/WorkforceContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppShell } from './components/AppShell';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { SupervisorDashboardView } from './components/SupervisorDashboardView';
import { EmployeesView } from './components/EmployeesView';
import { LaboursView } from './components/LaboursView';
import { HrManagementView } from './components/HrManagementView';
import { ProjectsSitesView } from './components/ProjectsSitesView';
import { AttendanceView } from './components/AttendanceView';
import { TasksView } from './components/TasksView';
import { LeaveRequestsView } from './components/LeaveRequestsView';
import { PayrollView } from './components/PayrollView';
import { MaterialsSuppliersView } from './components/MaterialsSuppliersView';
import { ReportsView } from './components/ReportsView';
import { CsvHubView } from './components/CsvHubView';
import { AIInsightsView } from './components/AIInsightsView';
import { SupabaseSetupView } from './components/SupabaseSetupView';
import { ModuleId, canAccessModule, getDefaultModuleForRole } from './utils/workforceLogic';
import { ShieldAlert } from 'lucide-react';

const MainRouter: React.FC = () => {
  const { currentUser, currentRole, targetModuleRedirect, clearTargetModuleRedirect } =
    useWorkforce();
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');

  useEffect(() => {
    if (targetModuleRedirect) {
      setActiveModule(targetModuleRedirect as ModuleId);
      clearTargetModuleRedirect();
    }
  }, [targetModuleRedirect, clearTargetModuleRedirect]);

  if (!currentUser) {
    return <LoginModal />;
  }

  const hasAccess = canAccessModule(currentRole, activeModule);

  const renderModule = () => {
    if (!hasAccess) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Least-Privilege Role Restriction
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your active role (<strong className="text-slate-900">{currentRole}</strong>) does not
            have permission to access this module. Return to your role dashboard overview below.
          </p>
          <button
            type="button"
            onClick={() => setActiveModule(getDefaultModuleForRole(currentRole))}
            className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold cursor-pointer"
          >
            Return to Role Workspace
          </button>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveModule} />;
      case 'supervisor_dashboard':
        return <SupervisorDashboardView />;
      case 'employees':
        return <EmployeesView />;
      case 'labours':
        return <LaboursView />;
      case 'hr_management':
        return <HrManagementView onNavigate={setActiveModule} />;
      case 'projects':
        return <ProjectsSitesView initialTab="projects" />;
      case 'sites':
        return <ProjectsSitesView initialTab="sites" />;
      case 'attendance':
        return <AttendanceView />;
      case 'tasks':
        return <TasksView />;
      case 'leaves':
        return <LeaveRequestsView />;
      case 'salary':
        return <PayrollView />;
      case 'materials':
        return <MaterialsSuppliersView initialTab="materials" />;
      case 'suppliers':
        return <MaterialsSuppliersView initialTab="suppliers" />;
      case 'reports':
        return <ReportsView />;
      case 'csv_hub':
        return <CsvHubView />;
      case 'ai_insights':
        return <AIInsightsView />;
      case 'supabase_setup':
        return <SupabaseSetupView />;
      default:
        return <DashboardView onNavigate={setActiveModule} />;
    }
  };

  return (
    <AppShell activeModule={activeModule} onSelectModule={setActiveModule}>
      {renderModule()}
    </AppShell>
  );
};

export default function App() {
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  return (
    <LanguageProvider>
      <WorkforceProvider>
        {gmpQuotaExceeded && (
          <div
            data-testid="gmp-quota-exceeded-banner"
            className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm"
          >
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        <MainRouter />
      </WorkforceProvider>
    </LanguageProvider>
  );
}

