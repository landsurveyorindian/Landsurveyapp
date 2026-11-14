import React, { useEffect, useState } from 'react';
import { fetchSystemSettings } from '../../services/adminService';
import { SystemAnnouncement } from '../../types/auth';
import { Info, AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const SystemAnnouncementBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchSystemSettings().then((s) => {
      if (s?.announcement?.active && s.announcement.message) {
        setAnnouncement(s.announcement);
      }
    });
  }, []);

  if (!announcement || !announcement.active || dismissed) return null;

  const typeConfig = {
    info: {
      bg: 'bg-cyan-900/90 border-cyan-700/80 text-cyan-100',
      icon: <Info className="w-4 h-4 text-cyan-300 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-900/90 border-amber-700/80 text-amber-100',
      icon: <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />,
    },
    alert: {
      bg: 'bg-rose-900/90 border-rose-700/80 text-rose-100',
      icon: <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-900/90 border-emerald-700/80 text-emerald-100',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />,
    },
  }[announcement.type || 'info'];

  return (
    <div
      role="alert"
      className={`w-full py-2 px-4 border-b text-xs flex items-center justify-between gap-3 shadow-md transition-all ${typeConfig.bg}`}
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto flex-1">
        {typeConfig.icon}
        <span className="font-medium">{announcement.message}</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition"
        aria-label="Dismiss banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
