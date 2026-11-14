import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Sthal Measure ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });

    // Auto-recover on dynamic import chunk load error (common when server restarted or bundle redeployed)
    const isChunkLoadError =
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically');

    if (isChunkLoadError && typeof window !== 'undefined') {
      const alreadyReloaded = sessionStorage.getItem('sthal_auto_reloaded_chunk');
      if (!alreadyReloaded) {
        sessionStorage.setItem('sthal_auto_reloaded_chunk', 'true');
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    }
  }

  private handleReload = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('sthal_auto_reloaded_chunk');
    }
    window.location.reload();
  };

  private handleReset = () => {
    try {
      // Clear all sthal_ cached data (per-user projects, marketplace caches, offline queue, GPS calibration)
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sthal_'))
          .forEach((k) => localStorage.removeItem(k));
      }
      sessionStorage.clear();
    } catch {
      // pass
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sthal Measure
              </h1>
              <p className="text-sm font-semibold text-rose-600">
                Application Recovery Shield
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                An unexpected error was safely caught. Your land measurement calculations and projects are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-100 rounded-xl p-3 text-left font-mono text-[11px] text-slate-700 overflow-x-auto max-h-32 border border-slate-200">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Reset to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
