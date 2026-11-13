import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  HardHat,
  FileCheck,
  Shield,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Activity,
  Compass,
  KeyRound,
  ShieldAlert,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function AuthPage() {
  const { login, register, demoLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CITIZEN',
    wardNumber: 4,
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const user = await register(formData);
        toast.success('Municipal account created successfully.', 'Welcome to CivicFlow');
        if (user.role === 'ADMIN') navigate('/admin');
        else if (user.role === 'CONTRACTOR') navigate('/contractor');
        else if (user.role === 'AUDITOR') navigate('/analytics');
        else navigate('/explore');
      } else {
        const user = await login(formData.email, formData.password);
        toast.success(`Signed in as ${user.name} (${user.role}).`, 'Authentication Verified');
        if (user.role === 'ADMIN') navigate('/admin');
        else if (user.role === 'CONTRACTOR') navigate('/contractor');
        else if (user.role === 'AUDITOR') navigate('/analytics');
        else navigate('/explore');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication error';
      setError(msg);
      toast.error(msg, 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (role) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(role);
      toast.success(`Active persona switched to ${role}. Loaded municipal workspace.`, 'Persona Activated');
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'CONTRACTOR') navigate('/contractor');
      else if (role === 'AUDITOR') navigate('/analytics');
      else navigate('/explore');
    } catch (err) {
      setError(err.message);
      toast.error(err.message, 'Role Switch Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-[#080D17] text-[#F1F5F9] font-sans antialiased">
      
      {/* Top Municipal Branding Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-[#243247]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <div className="text-base font-black tracking-tight text-white">
              CIVIC<span className="text-[#3B82F6]">FLOW</span>
            </div>
            <div className="text-[10px] text-[#64748B] font-mono tracking-widest uppercase">
              MUNICIPAL SRE & SPATIAL ENGINE
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-[#111B2B] border border-[#243247]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span className="text-[#94A3B8]">SLA WATCHDOG:</span>
          <span className="text-white font-bold">45s CYCLE</span>
        </div>
      </div>

      {/* Main Authentication Card Grid */}
      <div className="max-w-5xl w-full mx-auto my-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: 1-Click Fast Evaluation Personas */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0C1321] border border-[#243247] shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3B82F6]/10 text-[#3B82F6] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#3B82F6]/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>EXAMINER 1-CLICK DEMO ACCESS</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Instant Role Switcher
              </h2>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Click any simulated persona to immediately access that role's real-time workspace without typing credentials:
              </p>
            </div>

            <div className="space-y-2.5">
              
              {/* Persona 1: Municipal Engineer */}
              <button
                type="button"
                onClick={() => handleDemoClick('ADMIN')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-[#111B2B] hover:bg-[#162235] border border-[#243247] hover:border-[#3B82F6] text-left transition-all flex items-center justify-between group shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#3B82F6] transition-colors">Er. Rajesh Verma</p>
                    <p className="text-[10px] text-[#94A3B8] font-mono">Chief Municipal Engineer &bull; admin@civicflow.gov.in</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 uppercase">
                  Engineer
                </span>
              </button>

              {/* Persona 2: Field Contractor */}
              <button
                type="button"
                onClick={() => handleDemoClick('CONTRACTOR')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-[#111B2B] hover:bg-[#162235] border border-[#243247] hover:border-[#F59E0B] text-left transition-all flex items-center justify-between group shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] flex items-center justify-center">
                    <HardHat className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#F59E0B] transition-colors">Apex Infrastructure Works</p>
                    <p className="text-[10px] text-[#94A3B8] font-mono">Field Contractor Crew &bull; contractor@civicflow.gov.in</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 uppercase">
                  Contractor
                </span>
              </button>

              {/* Persona 3: City Auditor */}
              <button
                type="button"
                onClick={() => handleDemoClick('AUDITOR')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-[#111B2B] hover:bg-[#162235] border border-[#243247] hover:border-[#A78BFA] text-left transition-all flex items-center justify-between group shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#A78BFA]/20 border border-[#A78BFA]/40 text-[#A78BFA] flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#A78BFA] transition-colors">Pooja Iyer</p>
                    <p className="text-[10px] text-[#94A3B8] font-mono">City Vigilance Auditor &bull; auditor@civicflow.gov.in</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30 uppercase">
                  Auditor
                </span>
              </button>

              {/* Persona 4: Citizen */}
              <button
                type="button"
                onClick={() => handleDemoClick('CITIZEN')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-[#111B2B] hover:bg-[#162235] border border-[#243247] hover:border-[#10B981] text-left transition-all flex items-center justify-between group shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#10B981] transition-colors">Aarav Sharma</p>
                    <p className="text-[10px] text-[#94A3B8] font-mono">Citizen Resident (Ward 4) &bull; citizen@civicflow.gov.in</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 uppercase">
                  Citizen
                </span>
              </button>

            </div>

            <div className="text-[11px] text-[#64748B] font-mono border-t border-[#243247] pt-3">
              Password for all seeded evaluation accounts: <code className="text-[#3B82F6]">password123</code>
            </div>
          </div>

          {/* Right Column: Standard Login / Registration Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-[#111B2B] border border-[#243247] shadow-xl flex flex-col justify-between">
            <div>
              {/* Tab Switcher */}
              <div className="flex border-b border-[#243247] mb-6">
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(''); }}
                  className={`pb-3 text-xs font-mono font-bold transition-colors relative flex-1 text-center ${
                    !isRegister
                      ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  SIGN IN TO PORTAL
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(''); }}
                  className={`pb-3 text-xs font-mono font-bold transition-colors relative flex-1 text-center ${
                    isRegister
                      ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  REGISTER NEW OFFICER / CITIZEN
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
                {isRegister && (
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] mb-1">FULL NAME / DESIGNATION</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Er. Hardeep Singh"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:outline-none focus:border-[#3B82F6]"
                      />
                      <User className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-[#94A3B8] mb-1">OFFICIAL EMAIL ADDRESS</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="officer@civicflow.gov.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:outline-none focus:border-[#3B82F6]"
                    />
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#94A3B8] mb-1">PASSWORD</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:outline-none focus:border-[#3B82F6]"
                    />
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
                  </div>
                </div>

                {isRegister && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#94A3B8] mb-1">MUNICIPAL ROLE</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:outline-none focus:border-[#3B82F6]"
                      >
                        <option value="CITIZEN">Citizen Resident</option>
                        <option value="ADMIN">Municipal Ward Engineer</option>
                        <option value="CONTRACTOR">Field Contractor</option>
                        <option value="AUDITOR">Vigilance Auditor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#94A3B8] mb-1">WARD NUMBER</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.wardNumber}
                        onChange={(e) => setFormData({ ...formData, wardNumber: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-4 active:scale-95 shadow-md shadow-blue-500/20"
                >
                  <span>{loading ? 'AUTHENTICATING CREDENTIALS...' : isRegister ? 'CREATE MUNICIPAL CREDENTIALS' : 'VERIFY & ENTER PORTAL'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="text-[10px] text-[#64748B] font-mono text-center pt-4 border-t border-[#243247] mt-6">
              SECURED BY 256-BIT CRYPTOGRAPHIC JWT &bull; AUDITED FOR CIVIC GOVTECH SRE
            </div>
          </div>

        </div>
      </div>

      {/* Institutional Legal & Technical Architecture Footer */}
      <div className="max-w-6xl w-full mx-auto pt-6 border-t border-[#243247] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64748B] font-mono gap-2">
        <div>
          CIVICFLOW MUNICIPAL SRE &bull; TRICITY DIVISION (MOHALI & CHANDIGARH)
        </div>
        <div className="flex items-center gap-4">
          <span>50m Spatial Deduplication</span>
          <span>&bull;</span>
          <span>Haversine GPS (&le; 35m)</span>
          <span>&bull;</span>
          <span>OpenStreetMap GIS</span>
        </div>
      </div>

    </div>
  );
}
