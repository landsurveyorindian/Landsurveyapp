// Triangulation & Heron's formula calculations for Irregular Plots

export interface HeronTriangleResult {
  a: number;
  b: number;
  c: number;
  isValid: boolean;
  s: number;
  area: number; // in square meters (or square of chosen input units)
  errorMessage?: string;
  calculationDetails?: string;
}

export function calculateHeronTriangle(a: number, b: number, c: number): HeronTriangleResult {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
    return { a, b, c, isValid: false, s: 0, area: 0, errorMessage: 'All triangle side lengths must be finite numbers.' };
  }
  if (a <= 0 || b <= 0 || c <= 0) {
    return { a, b, c, isValid: false, s: 0, area: 0, errorMessage: 'All triangle side lengths must be strictly greater than zero.' };
  }

  // Strict triangle inequality check with epsilon
  const eps = 1e-6;
  if (a + b <= c + eps || a + c <= b + eps || b + c <= a + eps) {
    return {
      a,
      b,
      c,
      isValid: false,
      s: 0,
      area: 0,
      errorMessage: `Invalid triangle inequality: Sum of any two sides must strictly exceed the third (Sides: ${a}, ${b}, ${c}).`,
    };
  }

  const s = (a + b + c) / 2;
  const termA = Math.max(0, s - a);
  const termB = Math.max(0, s - b);
  const termC = Math.max(0, s - c);
  const radicand = s * termA * termB * termC;

  if (radicand <= 1e-9) {
    return {
      a,
      b,
      c,
      isValid: false,
      s,
      area: 0,
      errorMessage: 'Degenerate triangle with zero enclosed area (collinear points).',
    };
  }

  const area = Math.sqrt(radicand);
  const calculationDetails = `s = (${a} + ${b} + ${c}) / 2 = ${s.toFixed(2)}; Area = √(${s.toFixed(2)} × ${(s - a).toFixed(2)} × ${(s - b).toFixed(2)} × ${(s - c).toFixed(2)}) = ${area.toFixed(2)}`;

  return {
    a,
    b,
    c,
    isValid: true,
    s,
    area,
    calculationDetails,
  };
}

export interface FourSidedResult {
  isValid: boolean;
  totalArea: number; // in input unit squared (typically meters or feet)
  triangle1: HeronTriangleResult; // Side A, Side B, Diag AC
  triangle2: HeronTriangleResult; // Side C, Side D, Diag AC
  calculationMethod: string;
  errorMessage?: string;
  points: { x: number; y: number; label: string }[];
}

export function calculateFourSidedPlot(
  sideA: number,
  sideB: number,
  sideC: number,
  sideD: number,
  diagonal: number
): FourSidedResult {
  const calculationMethod =
    "Heron Triangulation via diagonal AC decomposition: Area = Area(ΔABC) + Area(ΔCDA). Exact surveyed area.";

  if (!Number.isFinite(sideA) || !Number.isFinite(sideB) || !Number.isFinite(sideC) || !Number.isFinite(sideD) || !Number.isFinite(diagonal)) {
    const invalidT = { a: 0, b: 0, c: 0, isValid: false, s: 0, area: 0, errorMessage: 'All dimensions must be finite numbers.' };
    return {
      isValid: false,
      totalArea: 0,
      triangle1: invalidT,
      triangle2: invalidT,
      calculationMethod,
      errorMessage: 'All 4 sides and the measured diagonal must be finite numbers.',
      points: [],
    };
  }

  // Triangle 1: V1-V2 (sideA), V2-V3 (sideB), V1-V3 (diagonal)
  const t1 = calculateHeronTriangle(sideA, sideB, diagonal);
  // Triangle 2: V3-V4 (sideC), V4-V1 (sideD), V1-V3 (diagonal)
  const t2 = calculateHeronTriangle(sideC, sideD, diagonal);

  if (!t1.isValid || !t2.isValid) {
    return {
      isValid: false,
      totalArea: 0,
      triangle1: t1,
      triangle2: t2,
      calculationMethod,
      errorMessage:
        t1.errorMessage || t2.errorMessage || 'Invalid 4-sided quadrilateral dimensions with measured diagonal.',
      points: [],
    };
  }

  // Construct coordinates for proportional 2D plot
  // V1 = (0, 0)
  // V2 = (sideA, 0)
  // V3 from V1 (dist = diagonal) and V2 (dist = sideB)
  const v1 = { x: 0, y: 0, label: 'A' };
  const v2 = { x: sideA, y: 0, label: 'B' };

  // Angle at V1 for triangle 1: cos(theta1) = (A^2 + diag^2 - B^2) / (2 * A * diag)
  const denom1 = 2 * sideA * diagonal;
  const cosTheta1 = denom1 > 0 ? Math.max(-1, Math.min(1, (sideA * sideA + diagonal * diagonal - sideB * sideB) / denom1)) : 0;
  const theta1 = Math.acos(cosTheta1);
  const v3 = {
    x: diagonal * Math.cos(theta1),
    y: Math.max(0.1, diagonal * Math.sin(theta1)),
    label: 'C',
  };

  // Angle for triangle 2 on side V1-V3: cos(theta2) = (diag^2 + D^2 - C^2) / (2 * diag * D)
  const denom2 = 2 * diagonal * sideD;
  const cosTheta2 = denom2 > 0 ? Math.max(-1, Math.min(1, (diagonal * diagonal + sideD * sideD - sideC * sideC) / denom2)) : 0;
  const theta2 = Math.acos(cosTheta2);
  const totalAngleV4 = theta1 + theta2;
  const v4 = {
    x: sideD * Math.cos(totalAngleV4),
    y: Math.max(0.1, sideD * Math.sin(totalAngleV4)),
    label: 'D',
  };

  return {
    isValid: true,
    totalArea: Number((t1.area + t2.area).toFixed(3)),
    triangle1: t1,
    triangle2: t2,
    calculationMethod,
    points: [v1, v2, v3, v4],
  };
}

export interface FiveSidedResult {
  isValid: boolean;
  totalArea: number;
  triangle1: HeronTriangleResult; // Side A, Side B, Diag 1
  triangle2: HeronTriangleResult; // Diag 1, Side C, Diag 2
  triangle3: HeronTriangleResult; // Diag 2, Side D, Side E
  calculationMethod: string;
  errorMessage?: string;
  points: { x: number; y: number; label: string }[];
}

export function calculateFiveSidedPlot(
  sideA: number,
  sideB: number,
  sideC: number,
  sideD: number,
  sideE: number,
  diag1: number, // 1 to 3
  diag2: number // 1 to 4
): FiveSidedResult {
  const calculationMethod =
    'Three-Triangle Heron Triangulation via diagonals D1 and D2: Area = Area(T1) + Area(T2) + Area(T3). Exact surveyed area.';

  const t1 = calculateHeronTriangle(sideA, sideB, diag1);
  const t2 = calculateHeronTriangle(diag1, sideC, diag2);
  const t3 = calculateHeronTriangle(diag2, sideD, sideE);

  if (!t1.isValid || !t2.isValid || !t3.isValid) {
    return {
      isValid: false,
      totalArea: 0,
      triangle1: t1,
      triangle2: t2,
      triangle3: t3,
      calculationMethod,
      errorMessage: t1.errorMessage || t2.errorMessage || t3.errorMessage || 'Invalid 5-sided pentagon dimensions.',
      points: [],
    };
  }

  // Construct coordinates:
  // V1 = (0, 0)
  // V2 = (sideA, 0)
  const v1 = { x: 0, y: 0, label: '1' };
  const v2 = { x: sideA, y: 0, label: '2' };

  // V3
  const cosT1 = Math.max(-1, Math.min(1, (sideA * sideA + diag1 * diag1 - sideB * sideB) / (2 * sideA * diag1)));
  const ang1 = Math.acos(cosT1);
  const v3 = { x: diag1 * Math.cos(ang1), y: Math.max(0.1, diag1 * Math.sin(ang1)), label: '3' };

  // V4
  const cosT2 = Math.max(-1, Math.min(1, (diag1 * diag1 + diag2 * diag2 - sideC * sideC) / (2 * diag1 * diag2)));
  const ang2 = Math.acos(cosT2);
  const totalAngV4 = ang1 + ang2;
  const v4 = { x: diag2 * Math.cos(totalAngV4), y: Math.max(0.1, diag2 * Math.sin(totalAngV4)), label: '4' };

  // V5
  const cosT3 = Math.max(-1, Math.min(1, (diag2 * diag2 + sideE * sideE - sideD * sideD) / (2 * diag2 * sideE)));
  const ang3 = Math.acos(cosT3);
  const totalAngV5 = totalAngV4 + ang3;
  const v5 = { x: sideE * Math.cos(totalAngV5), y: Math.max(0.1, sideE * Math.sin(totalAngV5)), label: '5' };

  return {
    isValid: true,
    totalArea: Number((t1.area + t2.area + t3.area).toFixed(3)),
    triangle1: t1,
    triangle2: t2,
    triangle3: t3,
    calculationMethod,
    points: [v1, v2, v3, v4, v5],
  };
}

// Normalize points to fit inside an SVG viewport (width x height) with padding
export function fitPointsToSvg(
  points: { x: number; y: number; label: string }[],
  width = 380,
  height = 260,
  padding = 40
): { x: number; y: number; label: string }[] {
  if (!points || points.length === 0) return [];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;

  const scale = Math.min((width - padding * 2) / dx, (height - padding * 2) / dy);
  const offsetX = (width - dx * scale) / 2;
  const offsetY = (height - dy * scale) / 2;

  // Invert Y for SVG coordinates so math positive Y is up
  return points.map((p) => ({
    x: offsetX + (p.x - minX) * scale,
    y: height - (offsetY + (p.y - minY) * scale),
    label: p.label,
  }));
}
