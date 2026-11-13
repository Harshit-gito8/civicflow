import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  MapPin,
  PlusCircle,
  BarChart3,
  Wrench,
  UserCheck,
  LogOut,
  ChevronDown,
  Layers,
  Menu,
  X,
  PhoneCall,
  Activity,
  Shield,
  Building2,
  HardHat,
  FileCheck
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, demoLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDemoSwitch = async (role) => {
    try {
      await demoLogin(role);
      setDemoMenuOpen(false);
      setMobileMenuOpen(false);
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

  const isActive = (path) => location.pathname === path;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Executive Engineer', color: 'bg-accent-primary/20 text-accent-primary border-accent-primary/30', icon: Building2 };
      case 'CONTRACTOR':
        return { label: 'Field Contractor', color: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30', icon: HardHat };
      case 'AUDITOR':
        return { label: 'City Auditor', color: 'bg-accent-violet/20 text-accent-violet border-accent-violet/30', icon: FileCheck };
      default:
        return { label: 'Citizen Resident', color: 'bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30', icon: Shield };
    }
  };

  const activeRoleBadge = getRoleBadge(user?.role);
  const ActiveIcon = activeRoleBadge.icon;

  return (
    <header className="sticky top-0 z-50">
      
      {/* Top Institutional Banner */}
      <div className="bg-canvas-subtle border-b border-surface-border px-4 py-1.5 text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse"></span>
            <span className="font-semibold text-slate-200">
              Municipal Corporation of Chandigarh & SAS Nagar Mohali &bull; Urban Public Works
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <PhoneCall className="w-3.5 h-3.5 text-accent-primary" />
              <span>Civic Helpline: <strong>1800-180-2026</strong></span>
            </span>
            <span className="text-surface-border">|</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Activity className="w-3 h-3 text-accent-emerald" />
              <span>SLA Watchdog: 45s Cycle</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="bg-surface/95 backdrop-blur-md border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-primary to-indigo-600 flex items-center justify-center text-white shadow-md shadow-accent-primary/20 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                  Civic<span className="text-accent-primary">Flow</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-card text-accent-primary border border-surface-border">
                    Smart City GIS
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 -mt-0.5">Municipal Grievance Redressal & Spatial Engine</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
              <Link
                to="/explore"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive('/explore')
                    ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-surface-card'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-accent-primary" />
                Live Ward Map
              </Link>

              <Link
                to="/report"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive('/report')
                    ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-surface-card'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-accent-emerald" />
                Lodge Grievance
              </Link>

              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive('/admin')
                    ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-surface-card'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Engineering Triage
              </Link>

              <Link
                to="/contractor"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive('/contractor')
                    ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-surface-card'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-accent-amber" />
                Field Dispatch
              </Link>

              <Link
                to="/analytics"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive('/analytics')
                    ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-surface-card'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-accent-violet" />
                SLA Governance
              </Link>
            </nav>

            {/* Quick Demo Role Switcher & Auth Section */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Role Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-card hover:bg-surface-hover border border-surface-border text-xs font-semibold text-slate-200 transition-colors shadow-sm"
                >
                  <ActiveIcon className="w-3.5 h-3.5 text-accent-primary" />
                  <span>{activeRoleBadge.label}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                {demoMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface-card shadow-2xl p-2.5 z-50 border border-surface-border animate-in fade-in">
                    <div className="px-3 py-2 border-b border-surface-border mb-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-accent-primary">1-Click Evaluation Roles</p>
                      <p className="text-[10px] text-slate-400">Instantly switch persona to test RBAC and workflows</p>
                    </div>

                    <button
                      onClick={() => handleDemoSwitch('CITIZEN')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-surface-hover flex items-center justify-between text-slate-200 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-white">Aarav Sharma</p>
                        <p className="text-[10px] text-slate-400">Citizen Resident (Ward 3)</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30">Citizen</span>
                    </button>

                    <button
                      onClick={() => handleDemoSwitch('ADMIN')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-surface-hover flex items-center justify-between text-slate-200 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-white">Er. Rajesh Verma</p>
                        <p className="text-[10px] text-slate-400">Executive Engineer, PWD</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary border border-accent-primary/30">Engineer</span>
                    </button>

                    <button
                      onClick={() => handleDemoSwitch('CONTRACTOR')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-surface-hover flex items-center justify-between text-slate-200 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-white">Apex Infrastructure Ltd</p>
                        <p className="text-[10px] text-slate-400">Field Contractor Crew</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-amber/20 text-accent-amber border border-accent-amber/30">Contractor</span>
                    </button>

                    <button
                      onClick={() => handleDemoSwitch('AUDITOR')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-surface-hover flex items-center justify-between text-slate-200 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-white">Pooja Iyer</p>
                        <p className="text-[10px] text-slate-400">Municipal Vigilance Auditor</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-violet/20 text-accent-violet border border-accent-violet/30">Auditor</span>
                    </button>
                  </div>
                )}
              </div>

              {/* User Profile or Login */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-2 pl-3 border-l border-surface-border">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                    <span className="text-[10px] text-accent-primary font-medium">Ward {user.wardNumber}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-1.5 rounded-lg hover:bg-surface-card text-slate-400 hover:text-accent-rose transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primaryHover text-white text-xs font-semibold shadow-md shadow-accent-primary/20 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-surface-card text-slate-300"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface-card border-b border-surface-border px-4 pt-3 pb-5 space-y-2">
            <Link
              to="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-surface-hover"
            >
              Live Ward Map
            </Link>
            <Link
              to="/report"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-surface-hover"
            >
              Lodge Grievance
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-blue-400 hover:bg-surface-hover"
            >
              Engineering Triage
            </Link>
            <Link
              to="/contractor"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-accent-amber hover:bg-surface-hover"
            >
              Field Dispatch
            </Link>
            <Link
              to="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-accent-violet hover:bg-surface-hover"
            >
              SLA Governance
            </Link>

            <div className="pt-3 border-t border-surface-border">
              <p className="text-[11px] font-bold text-accent-primary uppercase tracking-wider mb-2">Switch Role:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDemoSwitch('CITIZEN')}
                  className="px-3 py-2 rounded-xl bg-surface text-xs font-semibold text-left text-slate-200"
                >
                  Citizen
                </button>
                <button
                  onClick={() => handleDemoSwitch('ADMIN')}
                  className="px-3 py-2 rounded-xl bg-surface text-xs font-semibold text-left text-blue-400"
                >
                  Engineer
                </button>
                <button
                  onClick={() => handleDemoSwitch('CONTRACTOR')}
                  className="px-3 py-2 rounded-xl bg-surface text-xs font-semibold text-left text-accent-amber"
                >
                  Contractor
                </button>
                <button
                  onClick={() => handleDemoSwitch('AUDITOR')}
                  className="px-3 py-2 rounded-xl bg-surface text-xs font-semibold text-left text-accent-violet"
                >
                  Auditor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </header>
  );
}
