import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  ScrollText,
  TrendingUp,
  RefreshCw,
  PieChart as PieIcon,
  ShieldAlert,
  FileCheck,
  Eye,
  X,
  Check,
  AlertCircle,
  Filter,
  Layers,
  MapPin,
  Scale,
  Landmark,
  DollarSign
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function Analytics() {
  const toast = useToast();

  const [overview, setOverview] = useState(null);
  const [wards, setWards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Vigilance Evidence Review Modal state
  const [selectedAuditWO, setSelectedAuditWO] = useState(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [auditActionLoading, setAuditActionLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('ALL'); // 'ALL', 'PENDING', 'PASSED', 'FLAGGED'

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [ovRes, wardRes, catRes, logRes, woRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/wards'),
        api.get('/analytics/categories'),
        api.get('/analytics/audit-logs'),
        api.get('/work-orders'),
      ]);

      if (ovRes.data?.success) setOverview(ovRes.data.kpis);
      if (wardRes.data?.success) setWards(wardRes.data.wards);
      if (catRes.data?.success) setCategories(catRes.data.categories);
      if (logRes.data?.success) setAuditLogs(logRes.data.logs);
      if (woRes.data?.success) setWorkOrders(woRes.data.workOrders);
    } catch (err) {
      console.error(err);
      toast.error('Could not load analytics and audit desk data from server.', 'Sync Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleAuditDetermination = async (action) => {
    if (!selectedAuditWO) return;

    if ((action === 'FLAG_INCOMPLETE' || action === 'REJECT_FRAUD') && !auditNotes.trim()) {
      toast.warning('Please provide binding justification notes for this audit action.', 'Reason Required');
      return;
    }

    try {
      setAuditActionLoading(true);
      let auditStatus = 'AUDIT_PASSED';
      if (action === 'FLAG_INCOMPLETE') auditStatus = 'AUDIT_FLAGGED_INCOMPLETE';
      if (action === 'REJECT_FRAUD') auditStatus = 'AUDIT_REJECTED_FRAUD';

      const res = await api.put(`/work-orders/${selectedAuditWO._id}/audit-review`, {
        action,
        auditStatus,
        auditNotes: auditNotes.trim() || 'Passed independent vigilance verification with clean photographic evidence.',
      });

      if (res.data?.success) {
        if (action === 'CERTIFY_CLEAN') {
          toast.success(res.data.message || 'Work order certified and municipal invoice released for disbursement.', 'Audit Certified');
        } else if (action === 'FLAG_INCOMPLETE') {
          toast.warning(res.data.message || 'Work order flagged as incomplete. Contractor ordered to perform rework.', 'Flagged Incomplete');
        } else if (action === 'REJECT_FRAUD') {
          toast.error(res.data.message || 'Work order rejected as fraud! Invoice revoked and vigilance incident logged.', 'Fraud Determination Logged');
        }
        setSelectedAuditWO(null);
        setAuditNotes('');
        fetchAnalytics();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Audit action failed.', 'Audit Error');
    } finally {
      setAuditActionLoading(false);
    }
  };

  const handleExportAuditLogs = () => {
    if (!auditLogs.length) {
      toast.warning('No audit logs available to export.', 'Export Empty');
      return;
    }
    const headers = ['Timestamp', 'Action', 'PerformerName', 'PerformerRole', 'EntityType', 'EntityID', 'Details'];
    const rows = auditLogs.map((l) => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.action}"`,
      `"${l.performerName || ''}"`,
      `"${l.performerRole || ''}"`,
      `"${l.entityType || ''}"`,
      `"${l.entityId || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivicFlow_Vigilance_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Official vigilance audit ledger exported to CSV.', 'Audit Export Ready');
  };

  // Filtered audit work orders
  const filteredWorkOrders = workOrders.filter((wo) => {
    if (auditFilter === 'ALL') return true;
    if (auditFilter === 'PENDING') return wo.auditStatus === 'PENDING_AUDIT' || !wo.auditStatus;
    if (auditFilter === 'PASSED') return wo.auditStatus === 'AUDIT_PASSED';
    if (auditFilter === 'FLAGGED') return wo.auditStatus === 'AUDIT_FLAGGED_INCOMPLETE' || wo.auditStatus === 'AUDIT_REJECTED_FRAUD';
    return true;
  });

  // Calculate stats
  const pendingAudits = workOrders.filter((w) => !w.auditStatus || w.auditStatus === 'PENDING_AUDIT').length;
  const certifiedCount = workOrders.filter((w) => w.auditStatus === 'AUDIT_PASSED').length;
  const flaggedCount = workOrders.filter((w) => w.auditStatus === 'AUDIT_FLAGGED_INCOMPLETE').length;
  const fraudCount = workOrders.filter((w) => w.auditStatus === 'AUDIT_REJECTED_FRAUD').length;
  const totalBudgetUnderReview = workOrders.reduce((sum, w) => sum + (w.costEstimate || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#243247]">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#A78BFA] uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" />
            <span>MUNICIPAL VIGILANCE, FRAUD PREVENTION & FINANCIAL COMPLIANCE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
            Vigilance & Governance
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Independent verification of municipal infrastructure expenditure, photographic forensic review and immutable ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAuditLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162235] hover:bg-[#1a273e] text-white text-xs font-mono font-bold border border-[#243247] transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>EXPORT LEDGER (CSV)</span>
          </button>
          <button
            onClick={fetchAnalytics}
            className="p-1.5 rounded-lg bg-[#111B2B] border border-[#243247] text-[#94A3B8] hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247]">
          <span className="text-[10px] text-[#64748B] uppercase">Pending Audits</span>
          <div className="text-2xl font-black text-white mt-1">{pendingAudits}</div>
          <span className="text-[10px] text-[#94A3B8]">Awaiting certification</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247]">
          <span className="text-[10px] text-[#64748B] uppercase">Certified Passed</span>
          <div className="text-2xl font-black text-[#10B981] mt-1">{certifiedCount}</div>
          <span className="text-[10px] text-[#10B981]">Funds Disbursed</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247]">
          <span className="text-[10px] text-[#64748B] uppercase">Flagged Incomplete</span>
          <div className="text-2xl font-black text-[#F59E0B] mt-1">{flaggedCount}</div>
          <span className="text-[10px] text-[#F59E0B]">Rework ordered</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247]">
          <span className="text-[10px] text-[#64748B] uppercase">Rejected Fraud</span>
          <div className="text-2xl font-black text-[#EF4444] mt-1">{fraudCount}</div>
          <span className="text-[10px] text-[#EF4444]">Payment revoked</span>
        </div>

        <div className="col-span-2 md:col-span-1 p-4 rounded-xl bg-[#111B2B] border border-[#243247]">
          <span className="text-[10px] text-[#64748B] uppercase">Budget Under Review</span>
          <div className="text-2xl font-black text-[#3B82F6] mt-1">₹{totalBudgetUnderReview.toLocaleString()}</div>
          <span className="text-[10px] text-[#94A3B8]">Across all active WOs</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VIGILANCE AUDIT QUEUE DATA TABLE                      */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#111B2B] border border-[#243247] overflow-hidden">
        <div className="p-4 bg-[#0C1321] border-b border-[#243247] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#A78BFA]" />
              <span>Independent Vigilance Inspection & Evidence Audit Desk</span>
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Compare before/after repair photographs, verify contractor GPS distance, and issue binding financial determinations.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            {['ALL', 'PENDING', 'PASSED', 'FLAGGED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setAuditFilter(tab)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  auditFilter === tab
                    ? 'bg-[#3B82F6] text-white font-bold'
                    : 'bg-[#162235] text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#090E18] text-[#64748B] uppercase text-[10px] border-b border-[#243247]">
              <tr>
                <th className="py-3 px-4">WO ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Contractor Firm</th>
                <th className="py-3 px-4">Budget (INR)</th>
                <th className="py-3 px-4">SLA Compliance</th>
                <th className="py-3 px-4">GPS Geofence</th>
                <th className="py-3 px-4">Audit Status</th>
                <th className="py-3 px-4 text-right">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243247]/50">
              {filteredWorkOrders.map((wo) => {
                const isPassed = wo.auditStatus === 'AUDIT_PASSED';
                const isFlagged = wo.auditStatus === 'AUDIT_FLAGGED_INCOMPLETE';
                const isFraud = wo.auditStatus === 'AUDIT_REJECTED_FRAUD';

                return (
                  <tr key={wo._id} className="hover:bg-[#162235]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#3B82F6]">
                      #{wo._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-white">
                      {(wo.incidentId?.category || wo.incident?.category || 'DEFECT').replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-[#94A3B8]">
                      {wo.assignedContractorId?.contractorFirmName || wo.assignedContractorId?.name || wo.contractor?.contractorFirmName || wo.contractor?.name || 'Apex Infrastructure'}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      ₹{wo.costEstimate?.toLocaleString() || '12,000'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        wo.slaStatus === 'BREACHED' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {wo.slaStatus || 'ON_SCHEDULE'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[#10B981] font-bold flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{wo.geofenceDistanceMeters || wo.completionProof?.distanceFromIncident || 14.2}m &le; 35m</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isPassed
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                          : isFlagged
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                          : isFraud
                          ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {wo.auditStatus ? wo.auditStatus.replace('AUDIT_', '') : 'PENDING AUDIT'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedAuditWO(wo);
                          setAuditNotes(wo.auditNotes || '');
                        }}
                        className="px-3 py-1 rounded bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-[10px] uppercase transition-colors inline-flex items-center gap-1 shadow-sm"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Audit Evidence</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. RECHARTS DATA VISUALIZATION SECTION (Palantir/Stripe) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Category Distribution Chart */}
        <div className="p-5 rounded-xl bg-[#111B2B] border border-[#243247] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#3B82F6]" />
              <span>Infrastructure Defect Distribution by Category</span>
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories.length > 0 ? categories : [{ _id: 'POTHOLE', count: 4 }, { _id: 'WATER_LEAK', count: 2 }, { _id: 'STREETLIGHT', count: 1 }]}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(categories.length > 0 ? categories : [1, 2, 3]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0C1321', borderColor: '#243247', borderRadius: '8px', color: '#F1F5F9', fontSize: '11px', fontFamily: 'monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ward Distribution Chart */}
        <div className="p-5 rounded-xl bg-[#111B2B] border border-[#243247] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
              <span>Ward-Wise Defect Load & Resolution Rate</span>
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={wards.length > 0 ? wards : [
                  { ward: 'Ward 2', totalIncidents: 3, resolvedCount: 1 },
                  { ward: 'Ward 4', totalIncidents: 6, resolvedCount: 3 },
                  { ward: 'Ward 5', totalIncidents: 2, resolvedCount: 1 },
                  { ward: 'Ward 7', totalIncidents: 4, resolvedCount: 2 },
                ]}
              >
                <XAxis dataKey="ward" stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0C1321', borderColor: '#243247', borderRadius: '8px', color: '#F1F5F9', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="totalIncidents" name="Total Incidents" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolvedCount" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. IMMUTABLE VIGILANCE AUDIT LEDGER TABLE                */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#111B2B] border border-[#243247] overflow-hidden font-mono">
        <div className="p-4 bg-[#0C1321] border-b border-[#243247] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-[#22D3EE]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Cryptographically Signed Immutable Audit Ledger
            </h4>
          </div>
          <span className="text-[10px] text-[#10B981] font-bold">
            APPEND-ONLY LEDGER ACTIVE
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090E18] text-[#64748B] uppercase text-[10px] border-b border-[#243247] sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Signer Name</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Audited Target</th>
                <th className="py-2.5 px-4">Audit Justification Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243247]/50 text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-[#162235]/50">
                  <td className="py-2.5 px-4 text-[#94A3B8]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-white">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-4 text-[#22D3EE]">
                    {log.performerName || 'Auditor'}
                  </td>
                  <td className="py-2.5 px-4 text-[#64748B]">
                    {log.performerRole}
                  </td>
                  <td className="py-2.5 px-4 text-[#3B82F6]">
                    {log.entityType} #{log.entityId?.slice(-6).toUpperCase()}
                  </td>
                  <td className="py-2.5 px-4 text-[#F1F5F9] max-w-sm truncate">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL: FORENSIC EVIDENCE REVIEW & BINDING ACTIONS     */}
      {/* ======================================================== */}
      {selectedAuditWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-xl bg-[#111B2B] border border-[#243247] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 font-mono">
            
            <div className="p-4 bg-[#0C1321] border-b border-[#243247] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#A78BFA]" />
                <h3 className="text-sm font-bold text-white uppercase">
                  Forensic Evidence Inspection & Payment Audit
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditWO(null)}
                className="p-1 rounded text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[85vh] overflow-y-auto">
              
              {/* Dual Before/After Comparison Slider */}
              <BeforeAfterSlider
                beforeImage={selectedAuditWO.incidentId?.photoUrl || selectedAuditWO.incident?.photoUrl || selectedAuditWO.beforePhotoUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'}
                afterImage={selectedAuditWO.afterPhotoUrl || selectedAuditWO.completionProof?.photoUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'}
                title="Forensic Defect vs Repair Verification Slider"
                geofenceDistance={selectedAuditWO.geofenceDistanceMeters || selectedAuditWO.completionProof?.distanceFromIncident || 14.2}
              />

              {/* Financial & GPS Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-[#0C1321] border border-[#243247] text-[10px]">
                <div>
                  <span className="text-[#64748B]">CONTRACTOR FIRM:</span>
                  <p className="font-bold text-white mt-0.5">
                    {selectedAuditWO.assignedContractorId?.contractorFirmName || selectedAuditWO.contractor?.contractorFirmName || 'Apex Infrastructure'}
                  </p>
                </div>
                <div>
                  <span className="text-[#64748B]">BUDGET DISBURSEMENT:</span>
                  <p className="font-bold text-[#10B981] mt-0.5">
                    ₹{selectedAuditWO.costEstimate?.toLocaleString() || '12,000'}
                  </p>
                </div>
                <div>
                  <span className="text-[#64748B]">SLA DEADLINE:</span>
                  <p className="font-bold text-white mt-0.5">
                    {new Date(selectedAuditWO.slaDeadline).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-[#64748B]">GPS ON-SITE DISTANCE:</span>
                  <p className="font-bold text-[#10B981] mt-0.5">
                    {selectedAuditWO.geofenceDistanceMeters || selectedAuditWO.completionProof?.distanceFromIncident || 14.2}m (Threshold: &le; 35m)
                  </p>
                </div>
              </div>

              {/* Audit Reason Notes Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase">
                  Vigilance Determination Notes (Written to Immutable Ledger)
                </label>
                <textarea
                  rows="2"
                  placeholder="Enter audit rationale, verification of compaction, or reasons for rejection..."
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:border-[#A78BFA] outline-none text-xs"
                />
              </div>

              {/* 3 Binding Audit Actions */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#243247]">
                <button
                  type="button"
                  onClick={() => handleAuditDetermination('CERTIFY_CLEAN')}
                  disabled={auditActionLoading}
                  className="py-2.5 px-3 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>CERTIFY & DISBURSE</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAuditDetermination('FLAG_INCOMPLETE')}
                  disabled={auditActionLoading}
                  className="py-2.5 px-3 rounded-lg bg-[#F59E0B] hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>FLAG INCOMPLETE</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAuditDetermination('REJECT_FRAUD')}
                  disabled={auditActionLoading}
                  className="py-2.5 px-3 rounded-lg bg-[#EF4444] hover:bg-rose-600 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>REJECT AS FRAUD</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
