import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  HardHat,
  FileCheck,
  Shield,
  Activity,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Compass,
  PlusCircle,
  LayoutDashboard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export default function AppShell({ children }) {
  const { user, logout, demoLogin, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sample real-time notifications for the notification panel
  const notifications = [
    { id: 1, title: 'SLA Warning: Pothole #804', time: '4m ago', type: 'warning', text: '75% of 48h SLA elapsed for Sector 62 road repairs.' },
    { id: 2, title: 'Contractor Arrived on Site', time: '18m ago', type: 'info', text: 'Apex Infrastructure logged GPS arrival at Mohali Sector 70.' },
    { id: 3, title: 'Audit Determination Certified', time: '1h ago', type: 'success', text: 'WO-8820 marked AUDIT_PASSED by Vigilance Chief.' },
  ];

  const handleRoleSwitch = async (role) => {
    try {
      await demoLogin(role);
      setRoleMenuOpen(false);
      setMobileOpen(false);
      toast.success(`Active persona switched to ${role}. Loaded municipal dashboard.`, 'Persona Switched');
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'CONTRACTOR') navigate('/contractor');
      else if (role === 'AUDITOR') navigate('/analytics');
      else navigate('/explore');
    } catch (err) {
      console.error(err);
      toast.error('Could not switch demo persona', 'Role Switch Failed');
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('Signed out of municipal session.', 'Session Closed');
    navigate('/explore');
  };

  const isCitizenTheme = location.pathname === '/report';

  // Navigation Items
  const navItems = [
    {
      label: 'Command Centre',
      path: '/admin',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
      description: 'Operations, GIS & SLA Dispatch',
    },
    {
      label: 'Incident Explorer',
      path: '/explore',
      icon: Compass,
      roles: ['ADMIN', 'CITIZEN', 'CONTRACTOR', 'AUDITOR'],
      description: 'Public Infrastructure GIS Map',
    },
    {
      label: 'Citizen Portal',
      path: '/report',
      icon: PlusCircle,
      roles: ['ADMIN', 'CITIZEN', 'CONTRACTOR', 'AUDITOR'],
      description: 'Report & Geotag Defect',
    },
    {
      label: 'Field Operations',
      path: '/contractor',
      icon: HardHat,
      roles: ['ADMIN', 'CONTRACTOR'],
      description: 'Work Orders & GPS Proof',
    },
    {
      label: 'Vigilance & Audit',
      path: '/analytics',
      icon: FileCheck,
      roles: ['ADMIN', 'AUDITOR'],
      description: 'Forensic Review & Ledger',
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)) || !user
  );

  const getRoleDetails = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Ward Engineer', dept: 'Public Works Division', icon: Building2, color: 'text-ops-blue bg-ops-blue/10 border-ops-blue/30' };
      case 'CONTRACTOR':
        return { label: 'Field Contractor', dept: 'Civil Works Crew', icon: HardHat, color: 'text-ops-medium bg-ops-medium/10 border-ops-medium/30' };
      case 'AUDITOR':
        return { label: 'City Auditor', dept: 'Vigilance & Accounts', icon: FileCheck, color: 'text-ops-pending bg-ops-pending/10 border-ops-pending/30' };
      default:
        return { label: 'Citizen Resident', dept: 'Public Ward 4', icon: Shield, color: 'text-ops-resolved bg-ops-resolved/10 border-ops-resolved/30' };
    }
  };

  const roleMeta = getRoleDetails(user?.role);
  const RoleIcon = roleMeta.icon;

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    switch (location.pathname) {
      case '/admin':
        return { section: 'CITY OPERATIONS', page: 'COMMAND CENTRE' };
      case '/explore':
        return { section: 'TRANSPARENCY', page: 'INCIDENT EXPLORER' };
      case '/report':
        return { section: 'CITIZEN SERVICES', page: 'REPORT CIVIC ISSUE' };
      case '/contractor':
        return { section: 'FIELD SERVICE', page: 'CONTRACTOR DISPATCH' };
      case '/analytics':
        return { section: 'VIGILANCE & COMPLIANCE', page: 'AUDIT DESK' };
      default:
        return { section: 'MUNICIPALITY', page: 'OPERATIONS' };
    }
  };

  const breadcrumbs = getBreadcrumbs();

  // If on login/auth screen, render clean standalone layout
  if (location.pathname === '/auth') {
    return (
      <div className="min-h-screen bg-[#080D17] text-[#F1F5F9] font-sans antialiased">
        {children}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${isCitizenTheme ? 'bg-[#F8FAFC] text-[#0F172A]' : 'bg-[#080D17] text-[#F1F5F9]'}`}>
      
      {/* ======================================================== */}
      {/* 1. FIXED LEFT APPLICATION SIDEBAR (Palantir / Linear)     */}
      {/* ======================================================== */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-300 border-r ${
          isCitizenTheme
            ? 'bg-white border-[#E2E8F0]'
            : 'bg-[#0C1321] border-[#243247]'
        } ${collapsed ? 'w-[72px]' : 'w-[250px]'} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Logo & System Indicator */}
        <div className={`h-16 flex items-center px-4 border-b ${isCitizenTheme ? 'border-[#E2E8F0]' : 'border-[#243247]'} justify-between`}>
          <Link to="/explore" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 min-w-[36px] rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className={`text-sm font-black tracking-tight ${isCitizenTheme ? 'text-[#0F172A]' : 'text-white'}`}>
                  CIVIC<span className="text-[#3B82F6]">FLOW</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest text-[#64748B] uppercase font-mono">
                  MUNICIPAL INTEL
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 text-[#64748B] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-[#64748B] uppercase font-mono">
              Core Modules
            </div>
          )}
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  active
                    ? isCitizenTheme
                      ? 'bg-blue-50 text-[#2563EB] font-bold'
                      : 'bg-[#162235] text-[#F1F5F9] font-bold shadow-sm'
                    : isCitizenTheme
                    ? 'text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]'
                    : 'text-[#94A3B8] hover:bg-[#111B2B] hover:text-[#F1F5F9]'
                }`}
              >
                {/* Active Indicator Bar */}
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#3B82F6]"></span>
                )}
                <Icon
                  className={`w-4 h-4 min-w-[16px] transition-colors ${
                    active ? 'text-[#3B82F6]' : 'text-[#64748B] group-hover:text-[#3B82F6]'
                  }`}
                />
                {!collapsed && (
                  <div className="flex flex-col text-left truncate">
                    <span>{item.label}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer / Current User Profile */}
        <div className={`p-3 border-t ${isCitizenTheme ? 'border-[#E2E8F0] bg-slate-50' : 'border-[#243247] bg-[#090E18]'}`}>
          {/* Watchdog Status Indicator */}
          {!collapsed && (
            <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded-md bg-[#111B2B]/60 border border-[#243247]/60 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                </span>
                <span className="text-[#94A3B8] font-mono">SLA WATCHDOG</span>
              </div>
              <span className="font-mono text-[#10B981] font-bold">45s CYCLE</span>
            </div>
          )}

          {/* User Profile Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-8 h-8 min-w-[32px] rounded-lg flex items-center justify-center font-bold text-xs border ${roleMeta.color}`}>
                <RoleIcon className="w-4 h-4" />
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate">
                  <span className={`text-xs font-bold truncate ${isCitizenTheme ? 'text-[#0F172A]' : 'text-[#F1F5F9]'}`}>
                    {user?.name || 'Authorized User'}
                  </span>
                  <span className="text-[10px] text-[#64748B] truncate font-mono">
                    {roleMeta.label}
                  </span>
                </div>
              )}
            </div>

            {/* Collapse / Expand Button on Desktop */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="hidden md:flex p-1 rounded-md text-[#64748B] hover:text-white hover:bg-[#162235] transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT WRAPPER WITH TOP BAR                      */}
      {/* ======================================================== */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'md:ml-[72px]' : 'md:ml-[250px]'}`}>
        
        {/* Top Header (Height 64px) */}
        <header
          className={`h-16 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 border-b backdrop-blur-md ${
            isCitizenTheme
              ? 'bg-white/95 border-[#E2E8F0]'
              : 'bg-[#080D17]/95 border-[#243247]'
          }`}
        >
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#111B2B]"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B]">
                <span>{breadcrumbs.section}</span>
                <span>/</span>
                <span className="text-[#3B82F6]">{breadcrumbs.page}</span>
              </div>
            </div>
          </div>

          {/* Right: Search, Watchdog Indicator, Notifications, 1-Click Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Live System Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#111B2B] border border-[#243247] text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="text-[#94A3B8]">SYSTEM ONLINE</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#111B2B] transition-colors border border-transparent hover:border-[#243247]"
                title="System Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3B82F6] ring-2 ring-[#080D17]"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#111B2B] border border-[#243247] shadow-2xl py-2 z-50">
                  <div className="px-3 py-2 border-b border-[#243247] flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase font-mono">Activity & SLA Alerts</span>
                    <span className="text-[10px] text-[#3B82F6] font-mono font-bold">3 UNREAD</span>
                  </div>
                  <div className="divide-y divide-[#243247]/50 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-[#162235] transition-colors text-left space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#F1F5F9]">{n.title}</span>
                          <span className="text-[10px] text-[#64748B] font-mono">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] leading-relaxed">{n.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-[#243247] text-center">
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] text-[#64748B] hover:text-[#3B82F6] font-medium"
                    >
                      Close Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 1-CLICK DEMO ROLE SWITCHER (Preserving all role demo logins) */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${roleMeta.color}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono">{roleMeta.label}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#111B2B] border border-[#243247] shadow-2xl p-1.5 z-50">
                  <div className="px-3 py-2 text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-mono border-b border-[#243247]">
                    1-Click Persona Switcher
                  </div>
                  <div className="py-1 space-y-1">
                    <button
                      onClick={() => handleRoleSwitch('CITIZEN')}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-[#162235] text-[#94A3B8] hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#10B981]" />
                        <div>
                          <p className="font-semibold text-white">Citizen Resident</p>
                          <p className="text-[10px] text-[#64748B]">Public reporting & map</p>
                        </div>
                      </div>
                      {user?.role === 'CITIZEN' && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
                    </button>

                    <button
                      onClick={() => handleRoleSwitch('ADMIN')}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-[#162235] text-[#94A3B8] hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#3B82F6]" />
                        <div>
                          <p className="font-semibold text-white">Ward Engineer</p>
                          <p className="text-[10px] text-[#64748B]">Triage, GIS & dispatch</p>
                        </div>
                      </div>
                      {user?.role === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />}
                    </button>

                    <button
                      onClick={() => handleRoleSwitch('CONTRACTOR')}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-[#162235] text-[#94A3B8] hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <HardHat className="w-4 h-4 text-[#F59E0B]" />
                        <div>
                          <p className="font-semibold text-white">Field Contractor</p>
                          <p className="text-[10px] text-[#64748B]">GPS proof & repairs</p>
                        </div>
                      </div>
                      {user?.role === 'CONTRACTOR' && <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />}
                    </button>

                    <button
                      onClick={() => handleRoleSwitch('AUDITOR')}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-[#162235] text-[#94A3B8] hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[#A78BFA]" />
                        <div>
                          <p className="font-semibold text-white">City Auditor</p>
                          <p className="text-[10px] text-[#64748B]">Forensic review & sign-off</p>
                        </div>
                      </div>
                      {user?.role === 'AUDITOR' && <CheckCircle2 className="w-4 h-4 text-[#A78BFA]" />}
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#243247]">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
