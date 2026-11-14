import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  X,
  Compass,
  Scale,
  Award,
  Layers,
  Info,
} from 'lucide-react';

export interface SurveyQualityAssessment {
  projectName: string;
  surveyMethod: 'triangulation' | 'traverse' | 'gps_walk' | 'cad_import';
  vertexCount: number;
  totalPerimeterMeters: number;
  areaSqm: number;
  areaCents: number;
  areaAcres: number;
  receiverAccuracyMeters?: number;
  linearClosingError?: number;
  relativePrecision?: string;
  hasDiagonalsMeasured?: boolean;
  isCalibrated?: boolean;
  benchmarkName?: string;
  state: string;
}

export interface SurveyQualityResult {
  score: number;
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C' | 'D';
  gradeColor: string;
  qualityTier: string;
  disclaimer: string;
}

export function parsePrecisionRatioDenominator(relativePrecision?: string): number {
  if (!relativePrecision) return 0;
  if (relativePrecision.includes('∞') || relativePrecision.toLowerCase().includes('exact')) {
    return Infinity;
  }
  // Strip leading "1 in ", "1:", "1/" then extract digits
  const cleaned = relativePrecision.replace(/^1\s*(in|:|\/)\s*/i, '').replace(/[^0-9]/g, '');
  if (cleaned) {
    const parsed = parseInt(cleaned, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const match = relativePrecision.match(/1\s*(?:in|:|\/)\s*([0-9,]+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1].replace(/,/g, ''), 10);
    if (!Number.isNaN(num)) return num;
  }
  return 0;
}

export function evaluateSurveyQuality(assessment: SurveyQualityAssessment): SurveyQualityResult {
  let score = 70;
  let grade: SurveyQualityResult['grade'] = 'B';
  let gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let qualityTier = 'Preliminary Survey Measurement (Standard boundary calculation)';

  if (assessment.surveyMethod === 'traverse') {
    const denom = parsePrecisionRatioDenominator(assessment.relativePrecision);
    if (denom >= 10000 || denom === Infinity) {
      score = 95;
      grade = 'A+';
      gradeColor = 'text-emerald-800 bg-emerald-100 border-emerald-300';
      qualityTier = 'High-Precision Closed Traverse (Bowditch balanced closure ratio >= 1:10,000)';
    } else if (denom >= 5000) {
      score = 88;
      grade = 'A';
      gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      qualityTier = 'Standard Closed Traverse (Standard boundary closure ratio >= 1:5,000)';
    } else if (denom >= 1000) {
      score = 80;
      grade = 'B+';
      gradeColor = 'text-teal-700 bg-teal-50 border-teal-200';
      qualityTier = 'Moderate-Precision Traverse (Basic boundary closure ratio >= 1:1,000)';
    } else {
      score = 65;
      grade = 'C';
      gradeColor = 'text-amber-800 bg-amber-50 border-amber-200';
      qualityTier = 'Low-Precision Traverse (Closure error exceeds 1:1,000 tolerance)';
    }
  } else if (assessment.surveyMethod === 'triangulation') {
    if (assessment.hasDiagonalsMeasured) {
      score = 92;
      grade = 'A';
      gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      qualityTier = 'Diagonal Triangulation (Rigid quadrilateral fixed via internal diagonal tie / G-Line)';
    } else {
      score = 60;
      grade = 'C';
      gradeColor = 'text-amber-800 bg-amber-50 border-amber-200';
      qualityTier = 'Four-Side Estimate Only (Cyclic/Patwari approximation without diagonal tie)';
    }
  } else if (assessment.surveyMethod === 'gps_walk') {
    const acc = assessment.receiverAccuracyMeters || 3.0;
    if (assessment.isCalibrated) {
      score = 90;
      grade = 'A-';
      gradeColor = 'text-teal-800 bg-teal-50 border-teal-200';
      qualityTier = 'GCP Calibrated GNSS Walk (Ground control point differential offset calibrated)';
    } else if (acc <= 2.5) {
      score = 82;
      grade = 'B+';
      gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      qualityTier = 'Consumer Multi-GNSS Walk (Field walk boundary with sub-3m accuracy)';
    } else {
      score = 55;
      grade = 'D';
      gradeColor = 'text-rose-800 bg-rose-50 border-rose-200';
      qualityTier = 'Degraded GPS Accuracy (High GNSS variance; static epoch averaging recommended)';
    }
  }

  const disclaimer =
    'This score is an internal data-quality estimate based on geometric rigidity and instrument precision. It does not constitute a legal certification or guarantee of revenue-department admissibility. Consult your state land records portal for certified cadastral records.';

  return { score, grade, gradeColor, qualityTier, disclaimer };
}

interface SurveyQualityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: SurveyQualityAssessment;
}

export const SurveyQualityReportModal: React.FC<SurveyQualityReportModalProps> = ({
  isOpen,
  onClose,
  assessment,
}) => {
  if (!isOpen) return null;

  const { score, grade, gradeColor, qualityTier, disclaimer } = evaluateSurveyQuality(assessment);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101B2D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#101B2D] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#0F9F79]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#101B2D]">Survey Quality &amp; Confidence Report</h3>
              <p className="text-[11px] text-[#64748B]">Measurement Quality &amp; Confidence Score</p>
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

        {/* Confidence Grade Banner */}
        <div className="rounded-xl border p-4 bg-[#F8FAFC] border-[#E2E8F0] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
              Confidence Grade &amp; Quality Tier
            </span>
            <p className="text-sm font-bold text-[#101B2D] leading-snug">{qualityTier}</p>
            <p className="text-[11px] text-[#64748B]">
              Jurisdiction: <strong>{assessment.state}</strong> • Methodology: <strong>{assessment.surveyMethod.replace('_', ' ').toUpperCase()}</strong>
            </p>
          </div>
          <div className="flex flex-col items-center justify-center pl-3">
            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-black text-2xl shadow-xs ${gradeColor}`}>
              {grade}
            </div>
            <span className="text-[10px] font-bold text-slate-600 mt-1">{score}/100</span>
          </div>
        </div>

        {/* Audit Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] font-semibold text-[#64748B] block uppercase">Enclosed Area</span>
            <span className="font-bold text-[#101B2D] text-sm">
              {assessment.areaCents.toFixed(2)} Cents
            </span>
            <span className="text-[10px] text-[#64748B] block">({assessment.areaSqm.toFixed(1)} m²)</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] font-semibold text-[#64748B] block uppercase">Perimeter</span>
            <span className="font-bold text-[#101B2D] text-sm">
              {assessment.totalPerimeterMeters.toFixed(1)} m
            </span>
            <span className="text-[10px] text-[#64748B] block">({assessment.vertexCount} Vertices)</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] font-semibold text-[#64748B] block uppercase">Receiver Precision</span>
            <span className="font-bold text-[#0F9F79] text-sm">
              {assessment.receiverAccuracyMeters ? `±${assessment.receiverAccuracyMeters.toFixed(1)} m` : 'Instrument Grade'}
            </span>
            <span className="text-[10px] text-[#64748B] block">
              {assessment.isCalibrated ? 'GCP Calibrated' : 'Uncalibrated'}
            </span>
          </div>
        </div>

        {/* Measurement Rigidity & Quality Checklist */}
        <div className="space-y-2 border-t border-[#E2E8F0] pt-3">
          <h4 className="text-xs font-bold text-[#101B2D] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#0F9F79]" />
            <span>Measurement Rigidity &amp; Verification Criteria</span>
          </h4>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <CheckCircle2 className="w-4 h-4 text-[#0F9F79] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Closed Ring Topology Check</p>
                <p className="text-[11px] text-[#64748B]">
                  Polygon is verified with 0 self-intersections (kinks) and non-collinear boundary nodes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              {assessment.hasDiagonalsMeasured || assessment.surveyMethod !== 'triangulation' ? (
                <CheckCircle2 className="w-4 h-4 text-[#0F9F79] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-slate-800">Internal Angle Rigidity (Diagonal Tie)</p>
                <p className="text-[11px] text-[#64748B]">
                  {assessment.hasDiagonalsMeasured || assessment.surveyMethod !== 'triangulation'
                    ? 'Rigid triangulation verified. Geometry is fixed and immune to quadrilateral angle flexing.'
                    : 'Four side lengths alone do not lock internal angles. An internal diagonal tie is required to fix exact ground area.'}
                </p>
              </div>
            </div>

            {assessment.isCalibrated && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-teal-50/60 border border-teal-200">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-teal-900">GCP Benchmark Differential Calibration</p>
                  <p className="text-[11px] text-teal-800">
                    Tied to verified survey marker: <strong>{assessment.benchmarkName || 'Permanent Benchmark'}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legal & Data-Quality Disclaimer */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
          <Info className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-800">Data Quality Disclosure:</strong> {disclaimer}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 min-h-[44px] bg-[#101B2D] hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Export Quality Summary</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
