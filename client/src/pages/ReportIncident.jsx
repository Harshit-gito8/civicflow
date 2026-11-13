import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import LeafletMap from '../components/LeafletMap';
import ImageUploader from '../components/ImageUploader';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Navigation,
  Info,
  Send,
  Building2,
  Compass,
  Sparkles,
  Layers,
  FileText,
  RotateCcw,
  Camera,
  ShieldCheck,
  Check,
  ArrowRight,
  ChevronRight,
  Flame,
  ThumbsUp
} from 'lucide-react';

const CATEGORIES = [
  { id: 'POTHOLE', label: 'Pothole / Road Cave-in', dept: 'Roads & Bridges Division', icon: '🕳️' },
  { id: 'WATER_LEAK', label: 'Water Main Burst', dept: 'Water Supply & Sewerage', icon: '💧' },
  { id: 'STREETLIGHT', label: 'Streetlight Failure', dept: 'Electrical & City Lighting', icon: '💡' },
  { id: 'SEWAGE_OVERFLOW', label: 'Sewage Line Overflow', dept: 'Public Health Sanitation', icon: '🚰' },
  { id: 'TRAFFIC_SIGNAL', label: 'Traffic Signal Outage', dept: 'Traffic & Signage Cell', icon: '🚦' },
  { id: 'FALLEN_TREE', label: 'Fallen Tree / Obstruction', dept: 'Horticulture & Emergency', icon: '🌲' },
];

const SEVERITY_LEVELS = [
  { id: 'LOW', label: 'Low', desc: 'Cosmetic or minor inconvenience' },
  { id: 'MEDIUM', label: 'Medium', desc: 'Noticeable delay or local issue' },
  { id: 'HIGH', label: 'High', desc: 'Hazardous to vehicles or pedestrians' },
  { id: 'CRITICAL', label: 'Critical', desc: 'Immediate danger or major gridlock' },
];

const QUICK_LOCATIONS = [
  { label: 'Mohali Sector 62 (Phase 7 Market)', coords: [76.7180, 30.7048], ward: 4 },
  { label: 'Sector 17 Plaza Chandigarh', coords: [76.7801, 30.7402], ward: 2 },
  { label: 'Chandigarh University Highway Gate', coords: [76.6430, 30.7450], ward: 7 },
  { label: 'Aerocity Main Ring Road', coords: [76.7350, 30.6720], ward: 5 },
];

export default function ReportIncident() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    category: 'POTHOLE',
    description: '',
    address: 'Near Phase 7 Market, Sector 62, Mohali',
    wardNumber: user?.wardNumber || 4,
    severityLevel: 'HIGH',
    trafficDensityRating: 4,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
  });

  const [selectedCoords, setSelectedCoords] = useState([76.7180, 30.7048]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clusterNotice, setClusterNotice] = useState(null);

  // Reverse geocoding via OpenStreetMap Nominatim with local Tricity fallback
  const reverseGeocode = async (lng, lat) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const data = await res.json();
      
      const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood || '';
      const city = data.address?.city || data.address?.town || data.address?.county || 'Mohali';
      const postcode = data.address?.postcode ? ` - ${data.address.postcode}` : '';
      const formatted = data.display_name ? `${road ? road + ', ' : ''}${city}${postcode}` : `Pinned Location [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;

      let estimatedWard = 4;
      if (lat > 30.73) estimatedWard = 2;
      else if (lng < 76.68) estimatedWard = 7;
      else if (lat < 30.68) estimatedWard = 5;

      setFormData((prev) => ({
        ...prev,
        address: formatted,
        wardNumber: estimatedWard,
      }));
      toast.info(`Address resolved: ${formatted.slice(0, 45)}...`, 'Location Geotagged');
    } catch (err) {
      setFormData((prev) => ({
        ...prev,
        address: `Defect location near [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
      }));
    }
  };

  const handleLocationClick = (coords) => {
    setSelectedCoords(coords);
    reverseGeocode(coords[0], coords[1]);
  };

  const handleDetectGPS = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setSelectedCoords(coords);
          setIsLocating(false);
          reverseGeocode(coords[0], coords[1]);
          toast.success('Live GPS coordinates acquired.', 'Device Located');
        },
        (err) => {
          console.warn('Geolocation error:', err);
          toast.warning('GPS access denied or unavailable. Click on the map to pin location.', 'GPS Notice');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.', 'GPS Unsupported');
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.photoUrl) {
      toast.warning('Please attach a photograph of the defect before submitting.', 'Photo Required');
      setCurrentStep(2);
      return;
    }

    if (!formData.title) {
      formData.title = `${formData.category.replace('_', ' ')} at ${formData.address.slice(0, 30)}`;
    }

    setIsSubmitting(true);
    setClusterNotice(null);

    try {
      const payload = {
        ...formData,
        wardNumber: Number(formData.wardNumber),
        trafficDensityRating: Number(formData.trafficDensityRating),
        coordinates: selectedCoords,
      };

      const res = await api.post('/incidents', payload);

      if (res.data.success) {
        if (res.data.isClustered) {
          setClusterNotice({
            type: 'CLUSTERED',
            message: res.data.message,
            incidentId: res.data.incident._id,
            reports: res.data.incident.reportCount,
            incident: res.data.incident,
          });
          toast.warning('Your grievance matched an active defect within 50 meters and was automatically clustered!', 'Spatial Cluster Match');
        } else {
          setClusterNotice({
            type: 'NEW',
            message: res.data.message,
            incidentId: res.data.incident._id,
            incident: res.data.incident,
          });
          toast.success('Grievance registered and routed to the municipal engineering desk!', 'Grievance Submitted');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting grievance', 'Submission Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 text-[#0F172A]">
      
      {/* ======================================================== */}
      {/* 1. CITIZEN HERO SECTION (Light & Welcoming)              */}
      {/* ======================================================== */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563EB] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>REPORT A CIVIC ISSUE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          Help Make Your City Better.
        </h1>
        <p className="text-sm text-[#64748B] leading-relaxed">
          Report damaged roads, broken streetlights, drainage problems and other infrastructure issues.
          Your report helps municipal teams take rapid, transparent action.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <a
            href="#report-form"
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <span>Report an Issue</span>
            <ChevronRight className="w-4 h-4" />
          </a>
          <Link
            to="/explore"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] font-semibold text-xs border border-[#E2E8F0] shadow-sm transition-all"
          >
            Track Existing Complaints
          </Link>
        </div>

        {/* Trust Indicator */}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-[#64748B]">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>100% Location-Verified &bull; Automated 50m Spatial Deduplication</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SPATIAL CLUSTERING RESULT (If already triggered)     */}
      {/* ======================================================== */}
      {clusterNotice && (
        <div className={`p-6 rounded-2xl border shadow-lg ${
          clusterNotice.type === 'CLUSTERED'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
              clusterNotice.type === 'CLUSTERED' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {clusterNotice.type === 'CLUSTERED' ? '⚡' : '✓'}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">
                  {clusterNotice.type === 'CLUSTERED'
                    ? 'SIMILAR INCIDENT DETECTED'
                    : 'GRIEVANCE REGISTERED SUCCESSFULLY'}
                </h3>
                <span className="text-xs font-mono font-bold bg-white/80 px-2.5 py-1 rounded-lg border border-black/10">
                  #{clusterNotice.incidentId?.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {clusterNotice.message}
              </p>
              {clusterNotice.type === 'CLUSTERED' && (
                <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-amber-950">A civic issue has already been reported near this location.</p>
                    <p className="text-[11px] text-amber-700">
                      Your report was merged into the Master Docket and increased the community priority score!
                    </p>
                  </div>
                  <Link
                    to="/explore"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors"
                  >
                    View on Master Map
                  </Link>
                </div>
              )}
              {clusterNotice.type === 'NEW' && (
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    to="/explore"
                    className="px-4 py-2 rounded-xl bg-[#16A34A] text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    View Live on Map
                  </Link>
                  <button
                    onClick={() => {
                      setClusterNotice(null);
                      setCurrentStep(1);
                    }}
                    className="text-xs text-emerald-800 hover:underline font-semibold"
                  >
                    Report Another Issue
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MULTI-STEP REPORTING INTERFACE (4 Clean Steps)        */}
      {/* ======================================================== */}
      <div id="report-form" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        
        {/* Step Indicator Header */}
        <div className="grid grid-cols-4 border-b border-[#E2E8F0] bg-slate-50 text-xs font-semibold">
          {[
            { step: 1, label: '1. Pin Location' },
            { step: 2, label: '2. Upload Photo' },
            { step: 3, label: '3. Issue Details' },
            { step: 4, label: '4. Review & Submit' },
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => setCurrentStep(s.step)}
              className={`py-3.5 px-3 text-center transition-colors border-b-2 flex items-center justify-center gap-2 ${
                currentStep === s.step
                  ? 'border-[#2563EB] text-[#2563EB] bg-white font-bold'
                  : currentStep > s.step
                  ? 'border-transparent text-[#16A34A] hover:bg-slate-100'
                  : 'border-transparent text-[#64748B] hover:bg-slate-100'
              }`}
            >
              <span>{s.label}</span>
              {currentStep > s.step && <Check className="w-3.5 h-3.5 text-[#16A34A]" />}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* STEP 1: SELECT LOCATION */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Step 1: Select Issue Location</h3>
                  <p className="text-xs text-[#64748B]">Click anywhere on the map or use your phone GPS to geotag the exact defect.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isLocating}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs border border-blue-200 transition-colors flex items-center gap-1.5 active:scale-95"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Acquiring GPS...' : 'Detect My Location'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Leaflet Map for Citizen */}
              <div className="h-80 sm:h-96 rounded-xl overflow-hidden border border-[#E2E8F0] relative">
                <LeafletMap
                  selectedLocation={selectedCoords}
                  onSelectLocation={handleLocationClick}
                  center={[selectedCoords[1], selectedCoords[0]]}
                  zoom={14}
                  defaultTileMode="osm"
                />
              </div>

              {/* Resolved Address & Coordinates Display */}
              <div className="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#2563EB] mt-0.5" />
                  <div>
                    <div className="text-xs text-[#64748B] font-medium">REVERSE-GEOCODED STREET ADDRESS</div>
                    <div className="text-sm font-bold text-[#0F172A]">{formData.address}</div>
                    <div className="text-xs text-[#64748B] font-mono mt-0.5">
                      GPS Coords: [{selectedCoords[0].toFixed(5)}, {selectedCoords[1].toFixed(5)}] &bull; Assigned to Municipal Ward {formData.wardNumber}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span>Next: Upload Photo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD EVIDENCE */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Step 2: Upload Photographic Evidence</h3>
                <p className="text-xs text-[#64748B]">Attach a photo of the defect so municipal engineers can verify the issue.</p>
              </div>

              <ImageUploader
                value={formData.photoUrl}
                onChange={(url) => setFormData({ ...formData, photoUrl: url })}
                label="Defect Photograph"
                hint="Drag and drop, take photo with phone camera, or select a sample image"
                required={true}
              />

              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-slate-100"
                >
                  Back to Location
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <span>Next: Issue Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ISSUE DETAILS */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Step 3: Describe the Issue</h3>
                <p className="text-xs text-[#64748B]">Choose the civic category and urgency to prioritize dispatch.</p>
              </div>

              {/* Category selector grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0F172A] uppercase">Select Infrastructure Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formData.category === cat.id
                          ? 'border-[#2563EB] bg-blue-50/70 ring-2 ring-[#2563EB]/20 text-[#0F172A]'
                          : 'border-[#E2E8F0] hover:border-slate-300 text-[#64748B]'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{cat.icon}</span>
                      <span className="text-xs font-bold block text-[#0F172A]">{cat.label}</span>
                      <span className="text-[10px] text-[#64748B] block mt-0.5">{cat.dept}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Level */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0F172A] uppercase">Urgency / Severity Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SEVERITY_LEVELS.map((sev) => (
                    <button
                      key={sev.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, severityLevel: sev.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formData.severityLevel === sev.id
                          ? sev.id === 'CRITICAL'
                            ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500/20'
                            : 'border-[#2563EB] bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20'
                          : 'border-[#E2E8F0] hover:border-slate-300 text-[#64748B]'
                      }`}
                    >
                      <span className="text-xs font-bold block">{sev.label}</span>
                      <span className="text-[10px] text-[#64748B] block mt-0.5">{sev.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0F172A] uppercase">Headline / Summary</label>
                  <input
                    type="text"
                    placeholder="e.g. Dangerous 4ft pothole in middle of intersection"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0F172A] uppercase">Detailed Description</label>
                  <textarea
                    rows="3"
                    placeholder="Describe specific landmarks, traffic congestion, or hazard risk..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] focus:border-[#2563EB] outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-slate-100"
                >
                  Back to Photo
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <span>Next: Review & Submit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & SUBMIT */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Step 4: Review Your Report</h3>
                <p className="text-xs text-[#64748B]">Please verify the defect details before lodging with the municipal engine.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-[#E2E8F0] grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Photo Preview */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">ATTACHED EVIDENCE</span>
                  <div className="h-40 rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-200">
                    <img
                      src={formData.photoUrl}
                      alt="Defect Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Details Summary */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">REPORTED TITLE</span>
                    <h4 className="text-sm font-bold text-[#0F172A]">
                      {formData.title || `${formData.category.replace('_', ' ')} Defect`}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#64748B]">CATEGORY</span>
                      <p className="font-semibold text-[#0F172A]">{formData.category.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#64748B]">SEVERITY</span>
                      <p className={`font-bold ${formData.severityLevel === 'CRITICAL' ? 'text-rose-600' : 'text-[#2563EB]'}`}>
                        {formData.severityLevel}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#64748B]">GEOTAGGED LOCATION</span>
                    <p className="text-xs font-semibold text-[#0F172A]">{formData.address}</p>
                    <p className="text-[11px] font-mono text-[#64748B]">
                      [{selectedCoords[0].toFixed(5)}, {selectedCoords[1].toFixed(5)}] &bull; Ward {formData.wardNumber}
                    </p>
                  </div>

                  {formData.description && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#64748B]">DESCRIPTION</span>
                      <p className="text-xs text-[#64748B] italic">"{formData.description}"</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-slate-100"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Send className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'LODGING GRIEVANCE...' : 'CONFIRM & SUBMIT GRIEVANCE'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
