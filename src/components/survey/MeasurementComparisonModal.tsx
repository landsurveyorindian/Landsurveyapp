import React from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  FileText,
  ArrowRight,
} from 'lucide-react';

export interface ComparisonDataset {
  sideA: number;
  sideB: number;
  sideC: number;
  sideD: number;
  diagonal?: number;
  unit: string;
  diagonalAreaSqMeters: number;
  cyclicAreaSqMeters: number;
  patwariAreaSqMeters: number;
  gpsAreaSqMeters?: number;
}

interface MeasurementComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ComparisonDataset;
}

export const MeasurementComparisonModal: React.FC<MeasurementComparisonModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  const hasDiagonalBaseline = Boolean(data.diagonal && data.diagonalAreaSqMeters > 0);
  const baseline = hasDiagonalBaseline ? data.diagonalAreaSqMeters : data.cyclicAreaSqMeters;
  const cyclicDiff = hasDiagonalBaseline
    ? (((data.cyclicAreaSqMeters - data.diagonalAreaSqMeters) / data.diagonalAreaSqMeters) * 100).toFixed(1)
    : null;
  const patwariDiff = hasDiagonalBaseline
    ? (((data.patwariAreaSqMeters - data.diagonalAreaSqMeters) / data.diagonalAreaSqMeters) * 100).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#101B2D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#101B2D] text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5 text-[#0F9F79]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#101B2D]">Cadastral Measurement Comparison</h3>
              <p className="text-[11px] text-[#64748B]">Rigorous side-by-side audit of geometric formulas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Dimensions Summary */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#64748B] block">Measured Boundary Dimensions</span>
          <div className="flex flex-wrap gap-2 text-slate-800 font-medium">
            <span>A: <strong>{data.sideA} {data.unit}</strong></span> •
            <span>B: <strong>{data.sideB} {data.unit}</strong></span> •
            <span>C: <strong>{data.sideC} {data.unit}</strong></span> •
            <span>D: <strong>{data.sideD} {data.unit}</strong></span>
            {data.diagonal && (
              <> • <span className="text-[#0F9F79] font-bold">Diagonal d₁: {data.diagonal} {data.unit}</span></>
            )}
          </div>
        </div>

        {/* Comparison Matrix Cards */}
        <div className="space-y-3">
          {/* 1. Heron Diagonal Triangulation */}
          <div className={`p-4 rounded-xl border ${data.diagonal ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#101B2D]">1. Heron Diagonal Triangulation</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                    Exact Ground Truth
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Divided into 2 fixed triangles via measured diagonal. Immensely rigid and uniquely determined.
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-emerald-800 font-mono">
                  {data.diagonalAreaSqMeters ? `${data.diagonalAreaSqMeters.toFixed(2)} m²` : 'Requires Diagonal'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {hasDiagonalBaseline ? 'Baseline (0.0% variance)' : 'No diagonal measured'}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Standard FMB G-line diagonal tie (fixed geometric ground truth).</span>
            </div>
          </div>

          {/* 2. Brahmagupta Cyclic Quadrilateral */}
          <div className="p-4 rounded-xl border bg-[#F8FAFC] border-[#E2E8F0]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#101B2D]">2. Brahmagupta Cyclic Formula</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                    Theoretical Max
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Formula: √(s-a)(s-b)(s-c)(s-d). Assumes all 4 vertices lie on a common circle.
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-slate-900 font-mono">
                  {data.cyclicAreaSqMeters.toFixed(2)} m²
                </span>
                <span className="text-[10px] font-semibold text-amber-700 block">
                  {cyclicDiff !== null ? `+${cyclicDiff}% overestimate` : '—'}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[#64748B] bg-white p-2 rounded-lg border border-[#E2E8F0] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>Real ground plots rarely form exact cyclic quadrilaterals. Gives upper-bound maximum.</span>
            </div>
          </div>

          {/* 3. Patwari Average Method */}
          <div className="p-4 rounded-xl border bg-[#F8FAFC] border-[#E2E8F0]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#101B2D]">3. Patwari Average Method</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                    Rough Estimate
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Formula: ((a+c)/2) × ((b+d)/2). Traditional village rule-of-thumb.
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-slate-900 font-mono">
                  {data.patwariAreaSqMeters.toFixed(2)} m²
                </span>
                <span className="text-[10px] font-semibold text-rose-700 block">
                  {patwariDiff !== null ? `+${patwariDiff}% variance` : '—'}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[#64748B] bg-white p-2 rounded-lg border border-[#E2E8F0] flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#64748B] shrink-0" />
              <span>Only accurate for perfect rectangles. Significantly distorts trapezoidal or acute plots.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#101B2D] text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
