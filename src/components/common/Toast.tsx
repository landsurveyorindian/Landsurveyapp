import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  durationMs?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  durationMs = 4000,
  onClose,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
      <div
        className={`flex items-start gap-2.5 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md ${
          isSuccess
            ? 'bg-emerald-950/90 text-white border-emerald-500/30'
            : isError
            ? 'bg-rose-950/90 text-white border-rose-500/30'
            : 'bg-slate-900/90 text-white border-slate-700'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {!isSuccess && !isError && <Info className="w-4 h-4 text-cyan-400" />}
        </div>
        <div className="flex-1 text-xs font-medium leading-relaxed">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
