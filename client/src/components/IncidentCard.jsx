import React from 'react';
import {
  MapPin,
  Users,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  ThumbsUp,
  Clock
} from 'lucide-react';

export default function IncidentCard({
  incident,
  onUpvote,
  onSelect,
  isDetailed = false,
}) {
  const getSeverityStyle = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      case 'MEDIUM':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/80';
      default:
        return 'bg-slate-800/80 text-slate-300 border-slate-700';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
      case 'IN_PROGRESS':
        return 'bg-sky-950/80 text-sky-300 border-sky-800/80';
      case 'WORK_ORDER_CREATED':
        return 'bg-violet-950/80 text-violet-300 border-violet-800/80';
      case 'TRIAGED':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/80';
      default:
        return 'bg-slate-800/80 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="civic-card civic-card-hover rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5 transition-all">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-canvas text-blue-300 border border-surface-border">
              {(incident.category || '').replace('_', ' ')}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getSeverityStyle(
                incident.severityLevel
              )}`}
            >
              {incident.severityLevel || 'NORMAL'}
            </span>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getStatusStyle(
              incident.status
            )}`}
          >
            {(incident.status || '').replace('_', ' ')}
          </span>
        </div>

        {/* Thumbnail & Title */}
        <div className="flex gap-3.5 mb-2.5">
          <img
            src={incident.photoUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'}
            alt={incident.title}
            className="w-16 h-16 rounded-xl object-cover border border-surface-border flex-shrink-0 bg-canvas"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
              {incident.title}
            </h3>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
              <MapPin className="w-3 h-3 text-accent-primary flex-shrink-0" />
              <span>{incident.address} (Ward {incident.wardNumber})</span>
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
          {incident.description}
        </p>

        {/* Dynamic Priority Score Indicator */}
        <div className="bg-canvas p-2.5 rounded-xl border border-surface-border mb-2.5">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <TrendingUp className="w-3.5 h-3.5 text-accent-primary" />
              Priority Score:
            </span>
            <span className="text-xs font-bold text-accent-primary font-mono">
              {incident.calculatedPriorityScore || 35} / 100
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-surface-card rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (incident.calculatedPriorityScore || 35) >= 80
                  ? 'bg-rose-500'
                  : (incident.calculatedPriorityScore || 35) >= 50
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, incident.calculatedPriorityScore || 35)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-2.5 border-t border-surface-border/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>
            <strong className="text-slate-200">{incident.reportCount || 1}</strong> {incident.reportCount > 1 ? 'citizens clustered' : 'citizen reported'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onUpvote && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpvote(incident._id);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border text-slate-200 hover:text-white transition-colors text-[11px] font-semibold"
              title="Endorse this public grievance to raise triage priority"
            >
              <ThumbsUp className="w-3 h-3 text-accent-primary" />
              <span>Endorse</span>
            </button>
          )}

          {onSelect && (
            <button
              onClick={() => onSelect(incident)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-primary hover:bg-accent-primaryHover text-white transition-colors text-[11px] font-bold shadow-sm"
            >
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
