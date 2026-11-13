import React, { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle2, Sparkles, RefreshCw, Eye } from 'lucide-react';
import { uploadImage } from '../api';
import { useToast } from '../context/ToastContext';

const DEMO_PRESETS = [
  {
    label: 'Road Pothole',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Water Main Burst',
    url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Streetlight Failure',
    url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Road Hazard',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
  },
];

export default function ImageUploader({
  value,
  onChange,
  label = 'Evidence Photograph',
  hint = 'Upload a photo, snap directly using device camera, or choose a preset',
  required = false,
}) {
  const toast = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Resize and upload image file
  const processImageFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Please upload a valid image file (JPG, PNG, WEBP).', 'Invalid File Type');
      return;
    }

    setIsUploading(true);

    try {
      // First attempt: try uploading to backend /api/upload
      try {
        const uploadRes = await uploadImage(file);
        if (uploadRes && uploadRes.url) {
          onChange(uploadRes.url);
          toast.success('Photograph uploaded and stored on municipal server.', 'Photo Attached');
          setIsUploading(false);
          return;
        }
      } catch (uploadErr) {
        console.warn('Backend upload failed, falling back to local canvas downscaling:', uploadErr);
      }

      // Fallback: local HTML5 canvas compression to generate lightweight Data URI (<300KB)
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          onChange(optimizedDataUrl);
          toast.success('Photograph optimized and attached.', 'Photo Attached');
          setIsUploading(false);
        };

        img.onerror = () => {
          setIsUploading(false);
          toast.error('Could not decode the selected image file.', 'Image Error');
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        setIsUploading(false);
        toast.error('Failed to read file from disk.', 'File Read Error');
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploading(false);
      toast.error('Failed to process image.', 'Upload Error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset file input so user can pick the same file again if needed
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300">
          {label} {required && <span className="text-accent-rose">*</span>}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              toast.info('Photograph removed.', 'Evidence Reset');
            }}
            className="text-[11px] text-accent-rose hover:underline font-semibold flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Remove Photo</span>
          </button>
        )}
      </div>

      {/* Hidden File & Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Box / Image Preview */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-surface-border bg-canvas group shadow-inner">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 sm:h-56 object-cover transition-transform group-hover:scale-[1.02] duration-300"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-950/85 px-3 py-1.5 rounded-xl border border-emerald-800 shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
              <span>Photograph Attached</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-surface-card hover:bg-surface-hover text-white text-xs font-semibold border border-surface-border transition-colors flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className="w-3 h-3 text-accent-primary" />
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  toast.info('Photograph removed.', 'Evidence Reset');
                }}
                className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors shadow-md"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-3 ${
            isDragging
              ? 'border-accent-primary bg-accent-primary/10'
              : 'border-surface-border bg-canvas/60 hover:border-slate-600'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-surface-card text-accent-primary border border-surface-border flex items-center justify-center shadow-md">
            {isUploading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-accent-primary" />
            ) : (
              <Camera className="w-5 h-5 text-accent-primary" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-white">
              {isUploading ? 'Uploading and optimizing photo...' : 'Direct Camera Snapshot or File Upload'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">{hint}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => cameraInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primaryHover text-white text-xs font-bold shadow-glow-primary transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Take Photo</span>
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-hover text-slate-200 text-xs font-semibold border border-surface-border transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-accent-primary" />
              <span>Choose from Device</span>
            </button>
          </div>

          {/* Quick Presets Bar */}
          <div className="pt-2.5 border-t border-surface-border/60 w-full">
            <div className="flex items-center justify-center gap-1 mb-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-accent-amber" />
              <span>Or click a sample civic photo:</span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {DEMO_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(p.url);
                    toast.info(`Selected "${p.label}" demo image.`, 'Sample Photo Selected');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-[10px] font-medium text-slate-300 hover:text-white hover:border-accent-primary transition-colors hover:bg-surface-hover"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
