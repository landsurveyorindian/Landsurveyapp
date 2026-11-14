import React from 'react';
import { fitPointsToSvg } from '../../utils/triangulation';

interface PlotSvgDiagramProps {
  points: { x: number; y: number; label: string }[];
  sideLabels?: string[];
  diagonalLabels?: { fromIndex: number; toIndex: number; label: string }[];
  title?: string;
  unit?: string;
}

export const PlotSvgDiagram: React.FC<PlotSvgDiagramProps> = ({
  points,
  sideLabels = [],
  diagonalLabels = [],
  title,
  unit = 'm',
}) => {
  if (!points || points.length < 3) {
    return (
      <div className="w-full h-56 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 text-xs p-4">
        <span>Enter valid side and diagonal dimensions to render geometry plot</span>
      </div>
    );
  }

  const svgWidth = 360;
  const svgHeight = 240;
  const fitted = fitPointsToSvg(points, svgWidth, svgHeight, 35);

  const polygonPath = fitted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Calculate midpoints for side labels
  const edges = fitted.map((p, i) => {
    const next = fitted[(i + 1) % fitted.length];
    return {
      x1: p.x,
      y1: p.y,
      x2: next.x,
      y2: next.y,
      midX: (p.x + next.x) / 2,
      midY: (p.y + next.y) / 2,
      label: sideLabels[i] ? `${sideLabels[i]} ${unit}` : undefined,
    };
  });

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {title || 'Proportional Triangulation Diagram'}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">Heron Decomposition</span>
      </div>

      <div className="relative w-full aspect-[360/240] max-h-[250px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="plotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.06" />
            </linearGradient>
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.6" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width={svgWidth} height={svgHeight} fill="url(#smallGrid)" rx="8" />

          {/* Main Polygon Fill & Boundary */}
          <path
            d={polygonPath}
            fill="url(#plotGradient)"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Diagonals */}
          {diagonalLabels.map((diag, idx) => {
            const pFrom = fitted[diag.fromIndex];
            const pTo = fitted[diag.toIndex];
            if (!pFrom || !pTo) return null;
            const midX = (pFrom.x + pTo.x) / 2;
            const midY = (pFrom.y + pTo.y) / 2;

            return (
              <g key={`diag-${idx}`}>
                <line
                  x1={pFrom.x}
                  y1={pFrom.y}
                  x2={pTo.x}
                  y2={pTo.y}
                  stroke="#0284c7"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                />
                {/* Diagonal label pill */}
                <rect
                  x={midX - 32}
                  y={midY - 9}
                  width="64"
                  height="18"
                  rx="4"
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth="1"
                />
                <text
                  x={midX}
                  y={midY + 3.5}
                  textAnchor="middle"
                  fill="#0369a1"
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {diag.label} {unit}
                </text>
              </g>
            );
          })}

          {/* Side Edge Labels */}
          {edges.map((edge, i) => {
            if (!edge.label) return null;
            return (
              <g key={`edge-${i}`}>
                <rect
                  x={edge.midX - 26}
                  y={edge.midY - 8}
                  width="52"
                  height="16"
                  rx="3"
                  fill="#ffffff"
                  stroke="#94a3b8"
                  strokeWidth="0.8"
                />
                <text
                  x={edge.midX}
                  y={edge.midY + 3.5}
                  textAnchor="middle"
                  fill="#1e293b"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Vertices */}
          {fitted.map((p, i) => (
            <g key={`vertex-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill="#ffffff"
                stroke="#059669"
                strokeWidth="2.5"
              />
              <text
                x={p.x}
                y={p.y - 9}
                textAnchor="middle"
                fill="#065f46"
                fontSize="11"
                fontWeight="800"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
