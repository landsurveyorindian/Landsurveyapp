// 4-Sided Plot Calculation Without Measured Diagonal (Cyclic Quadrilateral / Brahmagupta Rule)

export interface FourSidedNoDiagResult {
  isValid: boolean;
  cyclicArea: number; // Brahmagupta formula for cyclic quadrilateral: sqrt((s-a)(s-b)(s-c)(s-d))
  patwariArea: number; // Traditional average method: ((A + C) / 2) * ((B + D) / 2)
  maxArea: number; // Same as cyclicArea (Brahmagupta cyclic upper bound)
  semiPerimeter: number; // s = (a + b + c + d) / 2
  diagonalAC: number; // Calculated cyclic diagonal between corners A and C
  diagonalBD: number; // Calculated cyclic diagonal between corners B and D
  cornerAngleDegA: number; // Solved cyclic corner angle at A (degrees)
  cornerAngleDegB: number; // Solved cyclic corner angle at B (degrees)
  geometricAssumption: string;
  methodLimitation: string;
  patwariLimitation: string;
  errorMessage?: string;
  points: { x: number; y: number; label: string }[];
}

/**
 * Validates whether 4 side lengths are finite, positive, and can close into a non-degenerate quadrilateral.
 * Condition: Each side must be strictly less than the sum of the other three sides.
 * That is: a < s, b < s, c < s, d < s where s = (a + b + c + d) / 2.
 */
export function validateQuadrilateralSides(
  a: number,
  b: number,
  c: number,
  d: number
): { valid: boolean; error?: string } {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || !Number.isFinite(d)) {
    return { valid: false, error: 'All 4 sides must be finite numbers.' };
  }
  if (a <= 0 || b <= 0 || c <= 0 || d <= 0) {
    return { valid: false, error: 'All 4 boundary sides must be positive numbers greater than zero.' };
  }
  const s = (a + b + c + d) / 2;
  if (a >= s || b >= s || c >= s || d >= s) {
    return {
      valid: false,
      error: `Invalid quadrilateral: No single side can be equal to or greater than half the perimeter (${s.toFixed(2)}). Impossible polygon closure.`,
    };
  }
  return { valid: true };
}

/**
 * Cyclic quadrilateral area calculation using Brahmagupta's formula.
 *
 * IMPORTANT SURVEYING PRINCIPLE:
 * Four boundary side lengths alone DO NOT uniquely determine the area of a general quadrilateral.
 * An infinite number of shapes can be formed with the same 4 perimeter lengths unless at least one
 * diagonal or internal angle is surveyed.
 *
 * Under the assumption that the plot is cyclic (vertices lie on a common circle), Brahmagupta's formula
 * yields the UNIQUE MAXIMUM possible area that these 4 sides can enclose.
 */
export function calculateFourSidedNoDiagonal(
  sideA: number,
  sideB: number,
  sideC: number,
  sideD: number,
  _ignoredAngle?: number
): FourSidedNoDiagResult {
  const geometricAssumption =
    'Brahmagupta cyclic calculation assumes all 4 vertices lie on a common circle. This yields the mathematical maximum possible area for the given 4 boundary lengths.';
  const methodLimitation =
    'Survey Disclaimer: 4 boundary lengths alone do not uniquely fix a parcel area without at least 1 measured diagonal or corner angle.';
  const patwariLimitation =
    'Traditional Indian Patwari Sarasari ((A+C)/2 × (B+D)/2) is an empirical rectangular average. It overestimates skewed/irregular parcels and is not an exact geometric measurement.';

  const validation = validateQuadrilateralSides(sideA, sideB, sideC, sideD);
  if (!validation.valid) {
    return {
      isValid: false,
      cyclicArea: 0,
      patwariArea: 0,
      maxArea: 0,
      semiPerimeter: 0,
      diagonalAC: 0,
      diagonalBD: 0,
      cornerAngleDegA: 0,
      cornerAngleDegB: 0,
      geometricAssumption,
      methodLimitation,
      patwariLimitation,
      errorMessage: validation.error,
      points: [],
    };
  }

  // 1. Semiperimeter
  const s = (sideA + sideB + sideC + sideD) / 2;

  // 2. Brahmagupta Cyclic Quadrilateral Area with radicand clamp
  const diffA = Math.max(0, s - sideA);
  const diffB = Math.max(0, s - sideB);
  const diffC = Math.max(0, s - sideC);
  const diffD = Math.max(0, s - sideD);
  const radicand = diffA * diffB * diffC * diffD;
  const cyclicArea = Number.isFinite(radicand) && radicand > 0 ? Math.sqrt(radicand) : 0;

  // 3. Indian Patwari Average Method (for reference / comparison)
  const patwariArea = ((sideA + sideC) / 2) * ((sideB + sideD) / 2);

  // 4. In a cyclic quadrilateral, opposite angles sum to 180 degrees.
  // Law of Cosines for cyclic quadrilaterals:
  // cos(A) = (a^2 + d^2 - b^2 - c^2) / (2 * (a*d + b*c))
  // cos(B) = (a^2 + b^2 - c^2 - d^2) / (2 * (a*b + c*d))
  const denomA = 2 * (sideA * sideD + sideB * sideC);
  const numA = sideA * sideA + sideD * sideD - (sideB * sideB + sideC * sideC);
  const cosA = denomA > 0 ? Math.max(-0.999999, Math.min(0.999999, numA / denomA)) : 0;
  const angleARad = Math.acos(cosA);
  const cornerAngleDegA = (angleARad * 180) / Math.PI;

  const denomB = 2 * (sideA * sideB + sideC * sideD);
  const numB = sideA * sideA + sideB * sideB - (sideC * sideC + sideD * sideD);
  const cosB = denomB > 0 ? Math.max(-0.999999, Math.min(0.999999, numB / denomB)) : 0;
  const angleBRad = Math.acos(cosB);
  const cornerAngleDegB = (angleBRad * 180) / Math.PI;

  // Diagonals of a cyclic quadrilateral (Ptolemy / Brahmagupta)
  // Diagonal AC (p): p^2 = ((a*c + b*d) * (a*b + c*d)) / (a*d + b*c)
  // Diagonal BD (q): q^2 = ((a*c + b*d) * (a*d + b*c)) / (a*b + c*d)
  const prodAC_BD = sideA * sideC + sideB * sideD;
  const prodAB_CD = sideA * sideB + sideC * sideD;
  const prodAD_BC = sideA * sideD + sideB * sideC;

  const diagAC = prodAD_BC > 0 ? Math.sqrt(Math.max(0, (prodAC_BD * prodAB_CD) / prodAD_BC)) : 0;
  const diagBD = prodAB_CD > 0 ? Math.sqrt(Math.max(0, (prodAC_BD * prodAD_BC) / prodAB_CD)) : 0;

  // Construct cyclic quadrilateral coordinates for SVG plot:
  // V1 (Corner A) = (0, 0)
  // V2 (Corner B) = (sideA, 0)
  // V3 (Corner C) = (sideA - sideB * cos(B), sideB * sin(B))
  // V4 (Corner D) = (sideD * cos(A), sideD * sin(A))
  const v1 = { x: 0, y: 0, label: 'A' };
  const v2 = { x: sideA, y: 0, label: 'B' };
  const v3 = {
    x: sideA - sideB * Math.cos(angleBRad),
    y: Math.max(0.1, sideB * Math.sin(angleBRad)),
    label: 'C',
  };
  const v4 = {
    x: sideD * Math.cos(angleARad),
    y: Math.max(0.1, sideD * Math.sin(angleARad)),
    label: 'D',
  };

  return {
    isValid: true,
    cyclicArea: Number(cyclicArea.toFixed(2)),
    patwariArea: Number(patwariArea.toFixed(2)),
    maxArea: Number(cyclicArea.toFixed(2)),
    semiPerimeter: Number(s.toFixed(2)),
    diagonalAC: Number(diagAC.toFixed(2)),
    diagonalBD: Number(diagBD.toFixed(2)),
    cornerAngleDegA: Number(cornerAngleDegA.toFixed(1)),
    cornerAngleDegB: Number(cornerAngleDegB.toFixed(1)),
    geometricAssumption,
    methodLimitation,
    patwariLimitation,
    points: [v1, v2, v3, v4],
  };
}
