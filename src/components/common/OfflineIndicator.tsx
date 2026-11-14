import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/95 backdrop-blur-xs border border-amber-400/50 px-3.5 py-2 text-xs font-bold text-white shadow-xl"
    >
      <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Field Mode — Cached Cadastral Engine Active</span>
    </div>
  );
};
