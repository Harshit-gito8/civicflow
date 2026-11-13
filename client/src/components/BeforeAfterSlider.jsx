import React, { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, ShieldCheck, Check } from 'lucide-react';

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  title = 'Verified Repair Quality Comparison',
  geofenceDistance = 14.2,
}) {
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleSliderChange = (e) => {
    setSliderPosition(e.target.value);
  };

  return (
    <div className="civic-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-3.5">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-accent-primary" />
          <span>{title}</span>
        </h4>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/70 px-2.5 py-1 rounded-full border border-emerald-800 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>GPS Geofence Verified ({geofenceDistance}m &le; 35m)</span>
          </span>
        </div>
      </div>

      <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden select-none border border-surface-border bg-canvas shadow-inner">
        {/* After Image (Background) */}
        <img
          src={afterImage}
          alt="After Repair"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-emerald-600/95 backdrop-blur-sm text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-md shadow-md flex items-center gap-1 border border-emerald-400/30">
          <CheckCircle2 className="w-3 h-3" />
          <span>Completed & Inspected</span>
        </div>

        {/* Before Image (Foreground with clip-path) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt="Before Defect"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-rose-600/95 backdrop-blur-sm text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-md shadow-md border border-rose-400/30">
            Original Citizen Grievance
          </div>
        </div>

        {/* Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-xl border-2 border-white">
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Range Input Overlay */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
        />
      </div>

      <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
        <span>Slide horizontally to inspect bitumen compaction & site repair</span>
        <span className="text-accent-primary font-semibold font-mono text-[11px] bg-canvas px-2.5 py-0.5 rounded-md border border-surface-border">
          {sliderPosition}% Comparison Split
        </span>
      </div>
    </div>
  );
}
