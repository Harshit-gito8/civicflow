import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = {
      id,
      type: toast.type || 'info',
      title: toast.title,
      message: toast.message,
      duration: toast.duration || 4000,
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message }),
    warning: (message, title = 'Attention') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Notification') => addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let borderClass = 'border-blue-500/40 bg-surface/95 text-slate-100';
          let icon = <Info className="w-4 h-4 text-accent-primary flex-shrink-0" />;

          if (t.type === 'success') {
            borderClass = 'border-emerald-500/50 bg-surface/95 text-slate-100 shadow-glow-emerald/20';
            icon = <CheckCircle2 className="w-4 h-4 text-accent-emerald flex-shrink-0" />;
          } else if (t.type === 'error') {
            borderClass = 'border-rose-500/50 bg-surface/95 text-slate-100 shadow-lg';
            icon = <AlertCircle className="w-4 h-4 text-accent-rose flex-shrink-0" />;
          } else if (t.type === 'warning') {
            borderClass = 'border-amber-500/50 bg-surface/95 text-slate-100 shadow-lg';
            icon = <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-3.5 rounded-2xl border backdrop-blur-md shadow-2xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-3 duration-250 ${borderClass}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <p className="text-xs font-bold text-white tracking-tight">{t.title}</p>
                )}
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-card transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
