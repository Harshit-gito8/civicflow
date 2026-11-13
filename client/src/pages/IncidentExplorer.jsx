import React, { useState, useEffect } from 'react';
import api from '../api';
import LeafletMap from '../components/LeafletMap';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Filter,
  MapPin,
  X,
  Users,
  AlertTriangle,
  Compass,
  SlidersHorizontal,
  Layers,
  RotateCcw,
  CheckCircle2,
  Clock,
  ThumbsUp,
  ArrowRight,
  Flame,
  Activity,
  Check,
  ChevronRight,
  Calendar,
  Share2
} from 'lucide-react';

const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'POTHOLE', label: 'Pothole' },
  { id: 'WATER_LEAK', label: 'Water Leak' },
  { id: 'STREETLIGHT', label: 'Streetlight' },
  { id: 'SEWAGE_OVERFLOW', label: 'Sewage' },
  { id: 'TRAFFIC_SIGNAL', label: 'Traffic Signal' },
  { id: 'FALLEN_TREE', label: 'Fallen Tree' },
];

const STATUSES = [
  { id: '', label: 'All Statuses' },
  { id: 'REPORTED', label: 'Reported' },
  { id: 'DISPATCHED', label: 'Dispatched' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export default function IncidentExplorer() {
  const toast = useToast();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [focusedCoords, setFocusedCoords] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('masterOnly', 'true');
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (severity) params.append('severity', severity);

      const res = await api.get(`/incidents?${params.toString()}`);
      if (res.data?.success) {
        setIncidents(res.data.incidents);
        if (res.data.incidents.length > 0 && !selectedIncident) {
          setSelectedIncident(res.data.incidents[0]);
          setFocusedCoords(res.data.incidents[0].location?.coordinates);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load grievances from server.', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [category, status, severity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIncidents();
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setSeverity('');
    toast.info('All search and category filters cleared.', 'Filters Reset');
  };

  const handleSelectIncident = (incident) => {
    setSelectedIncident(incident);
    if (incident.location?.coordinates) {
      setFocusedCoords(incident.location.coordinates);
    }
  };

  const handleUpvote = async (incidentId) => {
    try {
      const res = await api.post(`/incidents/${incidentId}/upvote`);
      if (res.data.success) {
        toast.success('Your upvote was logged. Community priority score increased!', 'Endorsed');
        fetchIncidents();
        if (selectedIncident?._id === incidentId) {
          setSelectedIncident((prev) => ({
            ...prev,
            reportCount: (prev.reportCount || 0) + 1,
            calculatedPriorityScore: res.data.calculatedPriorityScore || prev.calculatedPriorityScore,
          }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upvote failed', 'Action Notice');
    }
  };

  // Status timeline steps
  const getTimelineStep = (currentStatus) => {
    switch (currentStatus) {
      case 'RESOLVED':
        return 4;
      case 'IN_PROGRESS':
        return 3;
      case 'DISPATCHED':
      case 'WORK_ORDER_CREATED':
        return 2;
      default:
        return 1;
    }
  };

  const currentTimelineStep = selectedIncident ? getTimelineStep(selectedIncident.status) : 1;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#243247]">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#3B82F6] uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>PUBLIC INFRASTRUCTURE TRANSPARENCY</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
            Explore Your City
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Discover reported infrastructure issues and monitor their resolution in real time.
          </p>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keyword or road..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg bg-[#111B2B] border border-[#243247] text-white text-xs font-mono focus:border-[#3B82F6] outline-none w-56 sm:w-72"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-mono text-xs font-bold transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#111B2B] border border-[#243247]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-1.5 rounded-lg bg-[#0C1321] border border-[#243247] text-xs font-mono text-white outline-none focus:border-[#3B82F6]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="p-1.5 rounded-lg bg-[#0C1321] border border-[#243247] text-xs font-mono text-white outline-none focus:border-[#3B82F6]"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="p-1.5 rounded-lg bg-[#0C1321] border border-[#243247] text-xs font-mono text-white outline-none focus:border-[#3B82F6]"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Hazard</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {(search || category || status || severity) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-[11px] font-mono text-[#EF4444] hover:underline px-2 py-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-[#64748B]">
          Showing <strong className="text-white">{incidents.length}</strong> master dockets
        </div>
      </div>

      {/* Main Grid: Interactive Map + Incident List + Detailed Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left: GIS Map */}
        <div className="lg:col-span-7 xl:col-span-8 h-[600px] rounded-xl overflow-hidden border border-[#243247] bg-[#111B2B]">
          <LeafletMap
            incidents={incidents}
            focusedCoords={focusedCoords}
            selectedIncidentId={selectedIncident?._id}
            onSelectIncident={handleSelectIncident}
            onUpvote={handleUpvote}
            defaultTileMode="dark"
          />
        </div>

        {/* Right: Selected Incident Detail & Timeline Panel */}
        <div className="lg:col-span-5 xl:col-span-4 h-[600px] flex flex-col rounded-xl bg-[#111B2B] border border-[#243247] overflow-hidden">
          {selectedIncident ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
              
              {/* Category & Status Bar */}
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#162235] text-[#22D3EE] font-bold uppercase text-[10px] border border-[#243247]">
                  {(selectedIncident.category || '').replace('_', ' ')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                    selectedIncident.status === 'RESOLVED'
                      ? 'bg-[#10B981]/20 text-[#10B981]'
                      : 'bg-[#3B82F6]/20 text-[#3B82F6]'
                  }`}
                >
                  {selectedIncident.status}
                </span>
              </div>

              {/* Title & Photo */}
              <div>
                <h3 className="text-sm font-bold text-white font-sans leading-tight">
                  {selectedIncident.title}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>{selectedIncident.address || `Ward ${selectedIncident.wardNumber}`}</span>
                </div>
              </div>

              {/* Photo Display */}
              {selectedIncident.photoUrl && (
                <div className="h-44 rounded-lg overflow-hidden border border-[#243247] bg-[#080D17]">
                  <img
                    src={selectedIncident.photoUrl}
                    alt={selectedIncident.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Progress Timeline: REPORTED -> DISPATCHED -> IN PROGRESS -> RESOLVED */}
              <div className="space-y-2 pt-2 border-t border-[#243247]">
                <span className="text-[10px] text-[#64748B] font-bold tracking-wider uppercase">
                  MUNICIPAL LIFECYCLE PROGRESS
                </span>
                <div className="flex items-center justify-between relative">
                  {/* Connecting Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#243247] -translate-y-1/2 z-0"></div>
                  
                  {[
                    { step: 1, label: 'Reported' },
                    { step: 2, label: 'Dispatched' },
                    { step: 3, label: 'In Progress' },
                    { step: 4, label: 'Resolved' },
                  ].map((s) => {
                    const isPassed = currentTimelineStep >= s.step;
                    const isCurrent = currentTimelineStep === s.step;
                    return (
                      <div key={s.step} className="relative z-10 flex flex-col items-center gap-1">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border-2 transition-all ${
                            isPassed
                              ? 'bg-[#10B981] border-[#10B981] text-white shadow-sm'
                              : 'bg-[#111B2B] border-[#243247] text-[#64748B]'
                          } ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#111B2B]' : ''}`}
                        >
                          {isPassed ? '✓' : s.step}
                        </div>
                        <span className={`text-[9px] uppercase tracking-wider ${isPassed ? 'text-white font-bold' : 'text-[#64748B]'}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="p-3 rounded-lg bg-[#0C1321] border border-[#243247] space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase">Grievance Narrative</span>
                <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
                  {selectedIncident.description || 'No additional citizen remarks provided.'}
                </p>
              </div>

              {/* Upvote & Endorse CTA */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-[#F59E0B]">
                    +{selectedIncident.reportCount || 1}
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    CITIZEN ENDORSEMENTS
                  </span>
                </div>

                {selectedIncident.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleUpvote(selectedIncident._id)}
                    className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>UPVOTE ISSUE</span>
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#64748B]">
              <Compass className="w-8 h-8 text-[#243247] mb-2" />
              <p className="text-xs">Select any incident marker on the map to inspect its public lifecycle docket.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
