import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LeafletMap from '../components/LeafletMap';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import {
  Layers,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  MapPin,
  RefreshCw,
  X,
  Building,
  Hammer,
  BadgeAlert,
  ArrowUpRight,
  Sliders,
  Check,
  AlertTriangle,
  Activity,
  Flame,
  ArrowUpDown,
  Compass,
  FileText,
  UserCheck,
  Zap,
  Info
} from 'lucide-react';

function SlaCountdownTimer({ deadline, createdAt, slaStatus }) {
  function calculateRemaining(deadlineStr, createdStr) {
    const deadlineTime = new Date(deadlineStr).getTime();
    const createdTime = createdStr ? new Date(createdStr).getTime() : deadlineTime - 48 * 3600 * 1000;
    const now = Date.now();
    const totalMs = deadlineTime - createdTime;
    const remainingMs = deadlineTime - now;

    const isBreached = remainingMs <= 0;
    const progress = totalMs > 0 ? Math.max(0, Math.min(100, Math.round((remainingMs / totalMs) * 100))) : 0;

    const absSec = Math.floor(Math.abs(remainingMs) / 1000);
    const hours = Math.floor(absSec / 3600);
    const minutes = Math.floor((absSec % 3600) / 60);
    const seconds = absSec % 60;

    let timeString = '';
    if (hours > 0) {
      timeString = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      timeString = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }

    return {
      isBreached,
      progress,
      timeString,
      remainingMs,
    };
  }

  const [timeLeft, setTimeLeft] = useState(() => calculateRemaining(deadline, createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateRemaining(deadline, createdAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, createdAt]);

  if (slaStatus === 'BREACHED' || timeLeft.isBreached) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#EF4444] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping"></span>
          <span>BREACHED (-{timeLeft.timeString})</span>
        </div>
        <div className="w-24 h-1 rounded-full bg-[#080D17] border border-[#243247] overflow-hidden">
          <div className="h-full bg-[#EF4444] w-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  const isWarning = timeLeft.progress <= 25;

  return (
    <div className="space-y-1">
      <div className={`text-[10px] font-bold font-mono ${isWarning ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
        <span>{timeLeft.timeString} remaining</span>
      </div>
      <div className="w-24 h-1 rounded-full bg-[#080D17] border border-[#243247] overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isWarning ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`}
          style={{ width: `${timeLeft.progress}%` }}
        ></div>
      </div>
    </div>
  );
}

export default function AdminCommand() {
  const { user } = useAuth();
  const toast = useToast();

  const [incidents, setIncidents] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  // Incident selection & map focus
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [focusedCoords, setFocusedCoords] = useState(null);
  const [sortBy, setSortBy] = useState('PRIORITY'); // 'PRIORITY', 'OLDEST', 'SLA'

  // Dispatch modal state
  const [dispatchModalIncident, setDispatchModalIncident] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({
    assignedDepartment: 'ROADS_BRIDGES',
    assignedContractorId: '',
    allocatedHours: 48,
    costEstimate: 12000,
    instructions: 'Perform emergency bitumen compaction and coordinate traffic diversion on-site.',
  });

  // Inspection modal state
  const [inspectModalWO, setInspectModalWO] = useState(null);
  const [reworkNotes, setReworkNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incRes, woRes, conRes] = await Promise.all([
        api.get('/incidents?masterOnly=true'),
        api.get('/work-orders'),
        api.get('/auth/contractors'),
      ]);

      if (incRes.data?.success) {
        setIncidents(incRes.data.incidents);
        if (incRes.data.incidents.length > 0 && !selectedIncident) {
          setSelectedIncident(incRes.data.incidents[0]);
          setFocusedCoords(incRes.data.incidents[0].location?.coordinates);
        }
      }
      if (woRes.data?.success) {
        setWorkOrders(woRes.data.workOrders);
      }
      if (conRes.data?.success && conRes.data.contractors?.length > 0) {
        setContractors(conRes.data.contractors);
        setDispatchForm((prev) => ({
          ...prev,
          assignedContractorId: prev.assignedContractorId || conRes.data.contractors[0]._id,
        }));
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      toast.error('Could not load operational data from backend.', 'Sync Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
    if (inc.location?.coordinates) {
      setFocusedCoords(inc.location.coordinates);
    }
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!dispatchModalIncident) return;

    try {
      setActionLoading(true);
      const targetContractorId = dispatchForm.assignedContractorId || contractors[0]?._id;
      if (!targetContractorId) {
        toast.warning('Please select a vetted contractor for this work order.', 'Contractor Required');
        setActionLoading(false);
        return;
      }

      const payload = {
        incidentId: dispatchModalIncident._id,
        assignedDepartment: dispatchForm.assignedDepartment,
        assignedContractorId: targetContractorId,
        allocatedHours: Number(dispatchForm.allocatedHours),
        costEstimate: Number(dispatchForm.costEstimate),
      };

      const res = await api.post('/work-orders/dispatch', payload);
      if (res.data.success) {
        toast.success(res.data.message || 'Work order dispatched to field crew.', 'Dispatch Authorized');
        setDispatchModalIncident(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dispatch failed', 'Dispatch Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveWorkOrder = async (woId) => {
    try {
      setActionLoading(true);
      const res = await api.put(`/work-orders/${woId}/approve`, { approvedCost: inspectModalWO?.costEstimate });
      if (res.data.success) {
        toast.success('Work order verified. Defect marked RESOLVED on GIS map and payout approved.', 'Audit Signoff Accepted');
        setInspectModalWO(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed', 'Signoff Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemandRework = async (woId) => {
    if (!reworkNotes) {
      toast.warning('Please enter rework instructions for the contractor crew.', 'Instructions Required');
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.put(`/work-orders/${woId}/rework`, { reworkNotes });
      if (res.data.success) {
        toast.warning('Rework demanded. Contractor crew notified to re-execute repair.', 'Rework Notice Issued');
        setInspectModalWO(null);
        setReworkNotes('');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rework failed', 'Rework Error');
    } finally {
      setActionLoading(false);
    }
  };

  // KPIs
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED');
  const criticalIncidents = incidents.filter((i) => i.severityLevel === 'CRITICAL' && i.status !== 'RESOLVED');
  const inProgressWOs = workOrders.filter((w) => w.stage === 'IN_PROGRESS' || w.stage === 'ACCEPTED' || w.stage === 'DISPATCHED');
  const breachedWOs = workOrders.filter((w) => w.slaStatus === 'BREACHED');

  // Sorted incidents for the intelligence panel
  const sortedIncidents = useMemo(() => {
    const list = [...activeIncidents];
    if (sortBy === 'PRIORITY') {
      return list.sort((a, b) => (b.calculatedPriorityScore || 0) - (a.calculatedPriorityScore || 0));
    } else if (sortBy === 'OLDEST') {
      return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    return list;
  }, [activeIncidents, sortBy]);

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. PALANTIR COMMAND CENTRE HEADER                         */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#243247]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-[#3B82F6] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>CITY OPERATIONS / COMMAND CENTRE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
            Municipal Operations
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Real-time infrastructure intelligence, geospatial triage and autonomous SLA dispatch.
          </p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111B2B] border border-[#243247] text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-[#94A3B8]">UPDATED:</span>
            <span className="text-white font-bold">{lastUpdated}</span>
          </div>

          <button
            onClick={fetchData}
            title="Refresh Operational Telemetry"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162235] hover:bg-[#1a273e] text-white text-xs font-semibold border border-[#243247] transition-all active:scale-95 font-mono shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${loading ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. COMPACT PREMIUM KPI CARDS                             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Active Incidents */}
        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-[11px] font-mono uppercase font-semibold">Active Incidents</span>
            <span className="p-1 rounded bg-[#3B82F6]/10 text-[#3B82F6]">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{activeIncidents.length}</span>
            <span className="text-[10px] font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded">
              50m Clustered
            </span>
          </div>
          <div className="mt-2 text-[10px] text-[#64748B] font-mono">
            {incidents.filter((i) => i.status === 'RESOLVED').length} resolved this cycle
          </div>
        </div>

        {/* Card 2: Critical Priority */}
        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-[11px] font-mono uppercase font-semibold">Critical Severity</span>
            <span className="p-1 rounded bg-[#EF4444]/10 text-[#EF4444]">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#EF4444] font-mono">{criticalIncidents.length}</span>
            <span className="text-[10px] font-mono font-bold text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded">
              High Hazard
            </span>
          </div>
          <div className="mt-2 text-[10px] text-[#64748B] font-mono">
            Immediate dispatch required
          </div>
        </div>

        {/* Card 3: Work Orders In Progress */}
        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-[11px] font-mono uppercase font-semibold">Active Work Orders</span>
            <span className="p-1 rounded bg-[#06B6D4]/10 text-[#06B6D4]">
              <Hammer className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{inProgressWOs.length}</span>
            <span className="text-[10px] font-mono font-bold text-[#06B6D4] bg-[#06B6D4]/10 px-1.5 py-0.5 rounded">
              Field Crews
            </span>
          </div>
          <div className="mt-2 text-[10px] text-[#64748B] font-mono">
            Across 3 contractor firms
          </div>
        </div>

        {/* Card 4: SLA Breaches */}
        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-[11px] font-mono uppercase font-semibold">SLA Breaches</span>
            <span className="p-1 rounded bg-[#F59E0B]/10 text-[#F59E0B]">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#F59E0B] font-mono">{breachedWOs.length}</span>
            <span className="text-[10px] font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">
              Watchdog Alert
            </span>
          </div>
          <div className="mt-2 text-[10px] text-[#64748B] font-mono">
            Escalated to Executive Engineer
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. CORE GEOSPATIAL INTELLIGENCE GRID                     */}
      {/*    Left: Interactive GIS Map (~58%)                      */}
      {/*    Right: Incident Intelligence & PWD Formula (~42%)     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left: GIS Map */}
        <div className="lg:col-span-7 xl:col-span-8 h-[580px] flex flex-col rounded-xl overflow-hidden border border-[#243247] bg-[#111B2B]">
          <div className="px-4 py-2.5 bg-[#0C1321] border-b border-[#243247] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
              <Compass className="w-4 h-4 text-[#3B82F6]" />
              <span>Municipal Spatial Redressal Grid (Tricity Chandigarh & SAS Nagar)</span>
            </div>
            <div className="text-[10px] text-[#64748B] font-mono">
              PROJECTION: EPSG:4326 &bull; RADIUS: 50m
            </div>
          </div>
          <div className="flex-1 w-full h-full relative">
            <LeafletMap
              incidents={incidents}
              focusedCoords={focusedCoords}
              selectedIncidentId={selectedIncident?._id}
              onSelectIncident={handleSelectIncident}
              onInspectIncident={(inc) => {
                setDispatchModalIncident(inc);
              }}
              defaultTileMode="dark"
            />
          </div>
        </div>

        {/* Right: Incident Intelligence Panel & PWD Priority Breakdown */}
        <div className="lg:col-span-5 xl:col-span-4 h-[580px] flex flex-col gap-4">
          
          {/* Scrollable Incident List */}
          <div className="flex-1 rounded-xl bg-[#111B2B] border border-[#243247] overflow-hidden flex flex-col">
            <div className="p-3 bg-[#0C1321] border-b border-[#243247] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Incident Intelligence Queue
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#162235] text-[#22D3EE] font-mono text-[10px] font-bold">
                  {sortedIncidents.length}
                </span>
              </div>

              {/* Sorting Pills */}
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  onClick={() => setSortBy('PRIORITY')}
                  className={`px-2 py-0.5 rounded ${sortBy === 'PRIORITY' ? 'bg-[#3B82F6] text-white font-bold' : 'text-[#94A3B8] hover:text-white'}`}
                >
                  Score
                </button>
                <button
                  onClick={() => setSortBy('OLDEST')}
                  className={`px-2 py-0.5 rounded ${sortBy === 'OLDEST' ? 'bg-[#3B82F6] text-white font-bold' : 'text-[#94A3B8] hover:text-white'}`}
                >
                  Age
                </button>
              </div>
            </div>

            {/* List items */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#243247]/50 p-2 space-y-1.5">
              {sortedIncidents.map((incident) => {
                const isSelected = selectedIncident?._id === incident._id;
                const isCritical = incident.severityLevel === 'CRITICAL';
                return (
                  <div
                    key={incident._id}
                    onClick={() => handleSelectIncident(incident)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#162235] border-[#3B82F6] shadow-sm'
                        : 'bg-[#0E1524] border-[#243247] hover:border-[#3B82F6]/50 hover:bg-[#131C2E]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                            isCritical
                              ? 'bg-[#EF4444]/20 text-[#EF4444]'
                              : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                          }`}
                        >
                          {incident.severityLevel}
                        </span>
                        <span className="text-[10px] font-mono text-[#94A3B8]">
                          {(incident.category || '').replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-[#3B82F6]">
                        {incident.calculatedPriorityScore || 0} pts
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {incident.title}
                    </h4>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-[#64748B] font-mono">
                      <span className="truncate max-w-[160px] text-[#94A3B8]">
                        {incident.address || `Ward ${incident.wardNumber}`}
                      </span>
                      <span className="text-[#F59E0B] font-bold">
                        +{incident.reportCount || 1} Endorsements
                      </span>
                    </div>

                    {/* Quick Dispatch Trigger */}
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-[#243247] flex items-center justify-between">
                        <span className="text-[10px] text-[#10B981] font-mono">
                          STATUS: {incident.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDispatchModalIncident(incident);
                          }}
                          className="px-2.5 py-1 rounded bg-[#3B82F6] hover:bg-blue-600 text-white font-mono text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>DISPATCH CREW</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PWD Priority Intelligence Breakdown */}
          {selectedIncident && (
            <div className="rounded-xl bg-[#111B2B] border border-[#243247] p-3 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-[#243247] pb-1.5">
                <span className="text-[11px] font-mono font-bold text-white uppercase flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>PWD Priority Scoring Breakdown</span>
                </span>
                <span className="text-xs font-mono font-black text-[#22D3EE]">
                  {selectedIncident.calculatedPriorityScore || 0} / 100
                </span>
              </div>

              {/* Formula Formula Metric Bars */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded bg-[#0C1321] border border-[#243247]">
                  <div className="text-[#64748B]">SEVERITY WEIGHT</div>
                  <div className="text-white font-bold mt-0.5">
                    {selectedIncident.severityLevel === 'CRITICAL' ? '40 pts (Max)' : '25 pts'}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#0C1321] border border-[#243247]">
                  <div className="text-[#64748B]">COMMUNITY ENDORSEMENT</div>
                  <div className="text-[#F59E0B] font-bold mt-0.5">
                    +{selectedIncident.reportCount || 1} Citizen Reports
                  </div>
                </div>
                <div className="p-2 rounded bg-[#0C1321] border border-[#243247]">
                  <div className="text-[#64748B]">TRAFFIC DENSITY</div>
                  <div className="text-white font-bold mt-0.5">
                    Index {selectedIncident.trafficDensityRating || 3} / 5
                  </div>
                </div>
                <div className="p-2 rounded bg-[#0C1321] border border-[#243247]">
                  <div className="text-[#64748B]">WARD JURISDICTION</div>
                  <div className="text-[#10B981] font-bold mt-0.5">
                    Ward {selectedIncident.wardNumber}
                  </div>
                </div>
              </div>

              {/* Visual Score Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-mono text-[#64748B]">
                  <span>TRIAGE SEVERITY INDEX</span>
                  <span>{selectedIncident.calculatedPriorityScore}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#080D17] border border-[#243247] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#3B82F6] to-[#EF4444] transition-all duration-500"
                    style={{ width: `${Math.min(100, selectedIncident.calculatedPriorityScore || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. ACTIVE WORK ORDERS & QUALITY SIGN-OFF TABLE           */}
      {/* ======================================================== */}
      <div className="rounded-xl bg-[#111B2B] border border-[#243247] overflow-hidden">
        <div className="p-4 bg-[#0C1321] border-b border-[#243247] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#3B82F6]" />
              <span>Active Municipal Work Orders & SLA Countdown Timers</span>
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Live contractor assignments, countdown watchdog and photographic before/after quality inspection.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#94A3B8] bg-[#162235] px-2.5 py-1 rounded border border-[#243247]">
            {workOrders.length} WORK ORDERS TRACKED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090E18] text-[#64748B] uppercase font-mono text-[10px] border-b border-[#243247]">
              <tr>
                <th className="py-3 px-4">WO Docket</th>
                <th className="py-3 px-4">Defect Title</th>
                <th className="py-3 px-4">Assigned Contractor Firm</th>
                <th className="py-3 px-4">Live SLA Remaining</th>
                <th className="py-3 px-4">Stage / Geofence</th>
                <th className="py-3 px-4 text-right">Engineer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243247]/50 font-mono">
              {workOrders.map((wo) => {
                const isCompleted = wo.stage === 'WORK_COMPLETED' || wo.stage === 'INSPECTED_PASSED';
                const isBreached = wo.slaStatus === 'BREACHED';

                return (
                  <tr key={wo._id} className="hover:bg-[#162235]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#3B82F6]">
                      #{wo._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-white max-w-xs truncate">
                      {wo.incident?.title || 'Defect Docket'}
                    </td>
                    <td className="py-3 px-4 text-[#94A3B8]">
                      {wo.contractor?.contractorFirmName || wo.contractor?.name || 'Municipal Maintenance Crew'}
                    </td>
                    <td className="py-3 px-4">
                      <SlaCountdownTimer
                        deadline={wo.slaDeadline}
                        createdAt={wo.createdAt}
                        slaStatus={wo.slaStatus}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                            wo.stage === 'INSPECTED_PASSED'
                              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                              : wo.stage === 'WORK_COMPLETED'
                              ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30'
                              : wo.stage === 'IN_PROGRESS'
                              ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30'
                              : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                          }`}
                        >
                          {wo.stage.replace('_', ' ')}
                        </span>
                        {wo.completionProof?.geofenceVerified && (
                          <div className="text-[9px] text-[#10B981] flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            <span>GPS Verified ({wo.completionProof.distanceFromIncident}m &le; 35m)</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {wo.stage === 'WORK_COMPLETED' && (
                        <button
                          onClick={() => setInspectModalWO(wo)}
                          className="px-3 py-1 rounded bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-[10px] uppercase transition-colors shadow-sm inline-flex items-center gap-1 font-mono"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Inspect Evidence</span>
                        </button>
                      )}
                      {wo.stage === 'INSPECTED_PASSED' && (
                        <span className="text-[10px] text-[#10B981] font-bold">
                          ✓ Signed Off
                        </span>
                      )}
                      {wo.stage !== 'WORK_COMPLETED' && wo.stage !== 'INSPECTED_PASSED' && (
                        <span className="text-[10px] text-[#64748B]">
                          Field Work Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL: DISPATCH WORK ORDER TO CONTRACTOR              */}
      {/* ======================================================== */}
      {dispatchModalIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-[#111B2B] border border-[#243247] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#0C1321] border-b border-[#243247] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Dispatch Municipal Work Order
                </h3>
              </div>
              <button
                onClick={() => setDispatchModalIncident(null)}
                className="p-1 rounded text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="p-5 space-y-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#080D17] border border-[#243247] space-y-1">
                <div className="text-[#64748B] text-[10px]">TARGET CIVIC DEFECT</div>
                <div className="font-bold text-white text-xs">{dispatchModalIncident.title}</div>
                <div className="text-[11px] text-[#94A3B8]">{dispatchModalIncident.address}</div>
              </div>

              {/* Contractor Select */}
              <div className="space-y-1">
                <label className="text-[#94A3B8] text-[11px] block">ASSIGN VETTED CONTRACTOR FIRM</label>
                <select
                  value={dispatchForm.assignedContractorId}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, assignedContractorId: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:border-[#3B82F6] outline-none"
                >
                  {contractors.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.contractorFirmName || c.name} — {c.specializationDepartment || 'General Maintenance'}
                    </option>
                  ))}
                </select>
              </div>

              {/* SLA & Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] text-[11px] block">SLA DEADLINE (HOURS)</label>
                  <input
                    type="number"
                    min="12"
                    max="168"
                    value={dispatchForm.allocatedHours}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, allocatedHours: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] text-[11px] block">BUDGET ALLOCATION (INR)</label>
                  <input
                    type="number"
                    step="500"
                    value={dispatchForm.costEstimate}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, costEstimate: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <label className="text-[#94A3B8] text-[11px] block">FIELD REPAIR DIRECTIVE</label>
                <textarea
                  rows="2"
                  value={dispatchForm.instructions}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, instructions: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:border-[#3B82F6] outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDispatchModalIncident(null)}
                  className="px-4 py-2 rounded-lg bg-[#162235] hover:bg-[#1f2d47] text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'DISPATCHING...' : 'DISPATCH WORK ORDER'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: BEFORE/AFTER INSPECTION & PAYMENT SIGN-OFF     */}
      {/* ======================================================== */}
      {inspectModalWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-[#111B2B] border border-[#243247] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#0C1321] border-b border-[#243247] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Forensic Quality Inspection & Sign-off
                </h3>
              </div>
              <button
                onClick={() => setInspectModalWO(null)}
                className="p-1 rounded text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Interactive Before/After Comparison Slider */}
              <BeforeAfterSlider
                beforeImage={inspectModalWO.incident?.photoUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'}
                afterImage={inspectModalWO.completionProof?.photoUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'}
                title="Forensic Repair Comparison (Grievance vs Field Completion)"
                geofenceDistance={inspectModalWO.completionProof?.distanceFromIncident || 14.2}
              />

              {/* Rework instruction if rejected */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[#94A3B8]">REWORK DIRECTIVE (IF INCOMPLETE)</label>
                <input
                  type="text"
                  placeholder="e.g. Edges not compacted properly. Seal with bitumen mastic."
                  value={reworkNotes}
                  onChange={(e) => setReworkNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:border-[#F59E0B] outline-none text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#243247]">
                <button
                  type="button"
                  onClick={() => handleDemandRework(inspectModalWO._id)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30 border border-[#F59E0B]/30 font-mono text-xs font-bold transition-colors"
                >
                  DEMAND REWORK & RE-INSPECT
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setInspectModalWO(null)}
                    className="px-4 py-2 rounded-lg bg-[#162235] text-[#94A3B8] hover:text-white font-mono text-xs"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveWorkOrder(inspectModalWO._id)}
                    disabled={actionLoading}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>APPROVE & MARK RESOLVED</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
