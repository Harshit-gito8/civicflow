import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ImageUploader from '../components/ImageUploader';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Camera,
  Navigation,
  ShieldCheck,
  X,
  Check,
  HardHat,
  ArrowRight,
  ShieldAlert,
  Compass,
  FileCheck,
  Building,
  Radio,
  Layers,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

function calculateHaversineDistance(lon1, lat1, lon2, lat2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}

export default function ContractorPortal() {
  const { user } = useAuth();
  const toast = useToast();

  const [workOrders, setWorkOrders] = useState([]);
  const [contractorList, setContractorList] = useState([]);
  const [selectedCrew, setSelectedCrew] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);

  // Active Work Order Modal & Geofence Submission State
  const [activeWO, setActiveWO] = useState(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'
  );
  const [completionNotes, setCompletionNotes] = useState(
    'Bituminous patch compaction and surface sealing completed according to municipal IRC specifications.'
  );
  const [contractorCoords, setContractorCoords] = useState([76.7181, 30.7047]);
  const [fraudAlertModal, setFraudAlertModal] = useState(null);

  const fetchWorkOrders = async (crewId = selectedCrew) => {
    try {
      setLoading(true);
      let url = '/work-orders?allCrews=true';
      if (crewId && crewId !== 'ALL') {
        url = `/work-orders?contractorId=${crewId}`;
      }
      const [res, conRes] = await Promise.all([
        api.get(url),
        api.get('/auth/contractors'),
      ]);
      if (res.data?.success) {
        setWorkOrders(res.data.workOrders);
      }
      if (conRes.data?.success) {
        setContractorList(conRes.data.contractors);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load work orders from municipal backend.', 'Network Notice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleUpdateStage = async (woId, stage) => {
    try {
      setActionLoading(true);
      const res = await api.put(`/work-orders/${woId}/stage`, { stage });
      if (res.data?.success) {
        toast.success(`Work order updated to stage: ${stage.replace('_', ' ')}`, 'Status Synchronized');
        fetchWorkOrders();
        if (activeWO?._id === woId) {
          setActiveWO(res.data.workOrder);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed', 'Action Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openCompleteModal = (wo) => {
    setActiveWO(wo);
    // Initialize contractor location slightly offset (~14m) from defect for seamless demonstration
    const coords = wo.incidentId?.location?.coordinates || wo.incident?.location?.coordinates;
    if (coords) {
      const [incLng, incLat] = coords;
      setContractorCoords([Number((incLng + 0.00012).toFixed(6)), Number((incLat + 0.00008).toFixed(6))]);
    }
  };

  const handleCapturePhoneGPS = () => {
    setIsCapturingGPS(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setContractorCoords(coords);
          setIsCapturingGPS(false);
          toast.success(`Live GPS acquired: [${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}]`, 'GPS Acquired');
        },
        (err) => {
          console.warn('Geolocation error:', err);
          toast.warning('Could not acquire hardware GPS. Using manual coordinates input.', 'GPS Offline');
          setIsCapturingGPS(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      toast.error('Geolocation not supported on this device.', 'GPS Unsupported');
      setIsCapturingGPS(false);
    }
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!activeWO) return;

    if (!afterPhotoUrl) {
      toast.warning('Please capture or attach a repair completion photograph.', 'Photo Required');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        afterPhotoUrl,
        photoUrl: afterPhotoUrl,
        completionNotes,
        notes: completionNotes,
        contractorCoordinates: contractorCoords,
        coordinates: contractorCoords,
      };

      const res = await api.post(`/work-orders/${activeWO._id}/complete`, payload);
      if (res.data.success) {
        toast.success(
          `Proof of repair verified on-site (${res.data.distance || res.data.workOrder?.geofenceDistanceMeters || liveDistance}m <= 35m). Submitted for Municipal Auditor Sign-Off!`,
          'Completion Logged'
        );
        setActiveWO(null);
        fetchWorkOrders();
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setFraudAlertModal({
          message: err.response.data.message,
          distance: err.response.data.distance,
          allowedRadius: err.response.data.allowedRadius || 35,
        });
        toast.error('GEOFENCE BREACH: Submission rejected due to off-site distance.', 'Anti-Fraud Trigger');
      } else {
        toast.error(err.response?.data?.message || 'Submission error', 'Error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Live Geofence Distance calculation for the active modal
  const incCoords = activeWO?.incidentId?.location?.coordinates || activeWO?.incident?.location?.coordinates;
  const liveDistance = incCoords
    ? calculateHaversineDistance(
        contractorCoords[0],
        contractorCoords[1],
        incCoords[0],
        incCoords[1]
      )
    : 0;

  const isWithinGeofence = liveDistance <= 35;

  // KPIs
  const totalAssigned = workOrders.length;
  const acceptedOrders = workOrders.filter((w) => w.stage === 'ACCEPTED').length;
  const inProgressOrders = workOrders.filter((w) => w.stage === 'ON_SITE' || w.stage === 'IN_PROGRESS').length;
  const completedOrders = workOrders.filter((w) => w.stage === 'PENDING_INSPECTION' || w.stage === 'APPROVED' || w.stage === 'WORK_COMPLETED' || w.stage === 'INSPECTED_PASSED').length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#243247]">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#F59E0B] uppercase tracking-wider">
            <HardHat className="w-3.5 h-3.5" />
            <span>FIELD SERVICE OPERATIONS & GEOFENCING</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
            Field Operations
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Manage assignments, verify site arrival and submit repair evidence with 35m GPS geofencing.
          </p>
        </div>

        {/* Crew Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#64748B] font-mono">CONTRACTOR CREW:</span>
          <select
            value={selectedCrew}
            onChange={(e) => {
              setSelectedCrew(e.target.value);
              fetchWorkOrders(e.target.value);
            }}
            className="p-2 rounded-lg bg-[#111B2B] border border-[#243247] text-white text-xs font-mono outline-none focus:border-[#F59E0B]"
          >
            <option value="ALL">All Municipal Crews (Global)</option>
            {contractorList.map((c) => (
              <option key={c._id} value={c._id}>
                {c.contractorFirmName || c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono">
        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247] shadow-sm">
          <div className="text-[10px] text-[#64748B] uppercase">Total Assigned</div>
          <div className="text-2xl font-black text-white mt-1">{totalAssigned}</div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Dockets assigned</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247] shadow-sm">
          <div className="text-[10px] text-[#64748B] uppercase">Accepted Assignments</div>
          <div className="text-2xl font-black text-[#3B82F6] mt-1">{acceptedOrders}</div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Mobilizing crews</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247] shadow-sm">
          <div className="text-[10px] text-[#64748B] uppercase">Active Repairs</div>
          <div className="text-2xl font-black text-[#06B6D4] mt-1">{inProgressOrders}</div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Currently on site</div>
        </div>

        <div className="p-4 rounded-xl bg-[#111B2B] border border-[#243247] shadow-sm">
          <div className="text-[10px] text-[#64748B] uppercase">Completed Submissions</div>
          <div className="text-2xl font-black text-[#10B981] mt-1">{completedOrders}</div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Under engineer sign-off</div>
        </div>
      </div>

      {/* Work Orders List / Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#F59E0B]" />
            <span>Field Work Orders Queue ({workOrders.length})</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workOrders.map((wo) => {
            const isCompleted = wo.stage === 'WORK_COMPLETED' || wo.stage === 'INSPECTED_PASSED';
            const isCritical = wo.incident?.severityLevel === 'CRITICAL';

            return (
              <div
                key={wo._id}
                className="p-5 rounded-xl bg-[#111B2B] border border-[#243247] hover:border-[#F59E0B]/50 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-[#F59E0B]">
                      WO #{wo._id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase ${
                        isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {wo.incident?.severityLevel || 'NORMAL'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-1">
                    {wo.incident?.title || 'Defect Docket'}
                  </h4>

                  <div className="text-xs text-[#94A3B8] font-mono flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="truncate">{wo.incident?.address || `Ward ${wo.incident?.wardNumber}`}</span>
                  </div>

                  {/* Allocated Budget & SLA */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#0C1321] border border-[#243247] text-[10px] font-mono">
                    <div>
                      <span className="text-[#64748B]">BUDGET ALLOCATED:</span>
                      <p className="font-bold text-white">₹{wo.costEstimate?.toLocaleString() || '12,000'}</p>
                    </div>
                    <div>
                      <span className="text-[#64748B]">SLA DEADLINE:</span>
                      <p className={`font-bold ${wo.slaStatus === 'BREACHED' ? 'text-rose-400' : 'text-[#10B981]'}`}>
                        {new Date(wo.slaDeadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#64748B]">STAGE:</span>
                    <span className="font-bold text-[#22D3EE] uppercase">
                      {wo.stage.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Action buttons based on current stage */}
                <div className="pt-2 border-t border-[#243247] space-y-2">
                  {wo.stage === 'DISPATCHED' && (
                    <button
                      onClick={() => handleUpdateStage(wo._id, 'ACCEPTED')}
                      disabled={actionLoading}
                      className="w-full py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-mono text-xs font-bold transition-colors"
                    >
                      ACCEPT WORK ORDER
                    </button>
                  )}

                  {wo.stage === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateStage(wo._id, 'ON_SITE')}
                      disabled={actionLoading}
                      className="w-full py-2 rounded-lg bg-[#06B6D4] hover:bg-cyan-600 text-white font-mono text-xs font-bold transition-colors"
                    >
                      MARK ARRIVAL ON SITE
                    </button>
                  )}

                  {(wo.stage === 'ON_SITE' || wo.stage === 'IN_PROGRESS' || wo.stage === 'REWORK_REQUIRED') && (
                    <button
                      onClick={() => openCompleteModal(wo)}
                      className="w-full py-2 rounded-lg bg-[#F59E0B] hover:bg-amber-600 text-slate-950 font-mono text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>SUBMIT REPAIR PROOF (35m GPS)</span>
                    </button>
                  )}

                  {(wo.stage === 'PENDING_INSPECTION' || wo.stage === 'WORK_COMPLETED') && (
                    <div className="py-2 px-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-center font-mono text-xs text-[#10B981] font-bold">
                      ✓ Submitted for Engineer Sign-off
                    </div>
                  )}

                  {(wo.stage === 'APPROVED' || wo.stage === 'INSPECTED_PASSED') && (
                    <div className="py-2 px-3 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 text-center font-mono text-xs text-[#10B981] font-bold">
                      ✓ Inspected & Payment Released
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: REPAIR EVIDENCE SUBMISSION & GEOFENCE VALIDATION  */}
      {/* ======================================================== */}
      {activeWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl bg-[#111B2B] border border-[#243247] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 font-mono">
            
            <div className="p-4 bg-[#0C1321] border-b border-[#243247] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-bold text-white uppercase">
                  Proof-of-Work Geofenced Submission
                </h3>
              </div>
              <button onClick={() => setActiveWO(null)} className="p-1 rounded text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCompletion} className="p-5 space-y-4 text-xs">
              
              {/* Target Incident Details */}
              <div className="p-3 rounded-lg bg-[#080D17] border border-[#243247] space-y-1">
                <div className="text-[#64748B] text-[10px]">DEFECT TARGET LOCATION</div>
                <div className="text-white font-bold">{activeWO.incident?.title}</div>
                <div className="text-[#94A3B8] text-[11px]">{activeWO.incident?.address}</div>
                <div className="text-[#64748B] text-[10px]">
                  TARGET COORDS: [{activeWO.incident?.location?.coordinates?.[0].toFixed(5)}, {activeWO.incident?.location?.coordinates?.[1].toFixed(5)}]
                </div>
              </div>

              {/* Dedicated GPS Verification Component */}
              <div className="p-3 rounded-lg bg-[#0C1321] border border-[#243247] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white uppercase flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Real-Time Great-Circle Haversine Geofence</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCapturePhoneGPS}
                    disabled={isCapturingGPS}
                    className="px-2.5 py-1 rounded bg-[#3B82F6]/20 text-[#3B82F6] hover:bg-[#3B82F6]/30 border border-[#3B82F6]/30 text-[10px] font-bold"
                  >
                    {isCapturingGPS ? 'Locating...' : 'Capture Phone GPS'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded bg-[#080D17] border border-[#243247]">
                    <span className="text-[#64748B]">YOUR GPS COORDS</span>
                    <p className="font-bold text-white mt-0.5">
                      [{contractorCoords[0].toFixed(5)}, {contractorCoords[1].toFixed(5)}]
                    </p>
                  </div>
                  <div className="p-2 rounded bg-[#080D17] border border-[#243247]">
                    <span className="text-[#64748B]">DISTANCE TO DEFECT</span>
                    <p className={`font-bold mt-0.5 ${isWithinGeofence ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {liveDistance} meters (Threshold: &le; 35m)
                    </p>
                  </div>
                </div>

                {/* Geofence Status Indicator */}
                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  isWithinGeofence
                    ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                    : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                }`}>
                  {isWithinGeofence ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 min-w-[16px]" />
                      <span className="text-[11px] font-bold">
                        GEOFENCE VERIFIED ON-SITE ({liveDistance}m &le; 35m). SUBMISSION ALLOWED.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 min-w-[16px]" />
                      <span className="text-[11px] font-bold">
                        OFF-SITE DETECTED ({liveDistance}m &gt; 35m). UPLOAD WILL BE REJECTED BY SERVER.
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Photo Upload Component */}
              <ImageUploader
                value={afterPhotoUrl}
                onChange={(url) => setAfterPhotoUrl(url)}
                label="Repair Completion Photograph"
                hint="Take photo directly on site using device camera or upload image file"
                required={true}
              />

              {/* Completion Notes */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#64748B] uppercase">MATERIAL & COMPLIANCE NOTES</label>
                <textarea
                  rows="2"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#080D17] border border-[#243247] text-white focus:border-[#F59E0B] outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#243247]">
                <button
                  type="button"
                  onClick={() => setActiveWO(null)}
                  className="px-4 py-2 rounded-lg bg-[#162235] text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors ${
                    isWithinGeofence
                      ? 'bg-[#10B981] hover:bg-emerald-600 text-white'
                      : 'bg-[#EF4444] hover:bg-rose-600 text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'VERIFYING...' : 'SUBMIT QUALITY EVIDENCE'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fraud Alert Modal (If rejected by server with 422) */}
      {fraudAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl bg-[#111B2B] border border-rose-500/50 shadow-2xl p-6 text-center space-y-4 font-mono">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-400 uppercase tracking-wider">
              Off-Site Upload Rejected (HTTP 422)
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {fraudAlertModal.message}
            </p>
            <div className="p-3 rounded-lg bg-[#080D17] border border-[#243247] text-xs">
              <div className="text-[#64748B]">MEASURED GREAT-CIRCLE DISTANCE</div>
              <div className="text-lg font-black text-rose-400 mt-0.5">
                {fraudAlertModal.distance} meters
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                Maximum Allowed Threshold: &le; {fraudAlertModal.allowedRadius} meters
              </div>
            </div>
            <button
              onClick={() => setFraudAlertModal(null)}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
            >
              Acknowledge & Return to Site
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
