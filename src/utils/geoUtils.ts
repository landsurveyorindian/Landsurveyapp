/**
 * Pure GIS & Geolocation Utility Functions for Sthal Measure
 */

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

/**
 * Detect Indian State based on coordinates.
 * Covers states referenced across Sthal Measure (cadastral portals, AI advisors, UTM zones).
 * Uses bounded approximations ordered from specific micro-regions to broad state envelopes.
 */
export function detectIndianState(lat: number, lng: number): string | null {
  // 1. Delhi / National Capital Region (28.4°N - 28.9°N, 76.8°E - 77.4°E)
  if (lat >= 28.40 && lat <= 28.88 && lng >= 76.84 && lng <= 77.35) {
    return 'Delhi';
  }

  // 2. Goa (14.89°N - 15.80°N, 73.65°E - 74.35°E)
  if (lat >= 14.89 && lat <= 15.80 && lng >= 73.65 && lng <= 74.35) {
    return 'Goa';
  }

  // 3. Kerala (Southwest coastal strip: 8.2°N - 12.8°N, 74.85°E - 77.45°E)
  if (lat >= 8.25 && lat <= 12.80 && lng >= 74.85 && lng <= 77.45) {
    // West of Western Ghats boundary
    if (lat < 10.5 && lng <= 77.40) return 'Kerala';
    if (lat >= 10.5 && lat <= 12.80 && lng <= 76.25) return 'Kerala';
    if (lat >= 10.0 && lat <= 11.5 && lng <= 76.80) return 'Kerala';
  }

  // 4. Tamil Nadu (8.05°N - 13.55°N, 76.25°E - 80.35°E)
  if (lat >= 8.05 && lat <= 13.55 && lng >= 76.25 && lng <= 80.35) {
    // West of 77.75E above 11.8N is Karnataka (Bengaluru, Mandya, Mysuru)
    if (lat >= 11.8 && lng < 77.75) {
      return 'Karnataka';
    }
    return 'Tamil Nadu';
  }

  // 5. Telangana: Inland plateau between AP and Maharashtra (15.83°N - 19.85°N, 77.2°E - 81.3°E)
  if (lat >= 15.83 && lat <= 19.85 && lng >= 77.2 && lng <= 81.3) {
    if (lng > 80.1 && lat < 16.8) {
      // Krishna / Guntur district, AP
      return 'Andhra Pradesh';
    }
    return 'Telangana';
  }

  // 6. Karnataka: Southern peninsula western plateau (11.5°N - 18.45°N, 74.05°E - 78.58°E)
  if (lat >= 11.5 && lat <= 18.45 && lng >= 74.05 && lng <= 78.58) {
    if (lat > 15.5 && lng > 77.6) {
      return 'Telangana';
    }
    return 'Karnataka';
  }

  // 7. Andhra Pradesh (Coastal Andhra & Rayalaseema: 12.6°N - 19.15°N, 76.7°E - 84.8°E)
  if (lat >= 12.6 && lat <= 19.15 && lng >= 76.7 && lng <= 84.8) {
    return 'Andhra Pradesh';
  }

  // 8. Gujarat (20.1°N - 24.7°N, 68.1°E - 74.5°E)
  if (lat >= 20.10 && lat <= 24.70 && lng >= 68.10 && lng <= 74.45) {
    return 'Gujarat';
  }

  // 9. Maharashtra (15.6°N - 22.05°N, 72.6°E - 80.9°E)
  if (lat >= 15.6 && lat <= 22.05 && lng >= 72.6 && lng <= 80.9) {
    return 'Maharashtra';
  }

  // 10. Odisha (17.8°N - 22.6°N, 81.4°E - 87.5°E)
  if (lat >= 17.80 && lat <= 22.60 && lng >= 81.40 && lng <= 87.50) {
    return 'Odisha';
  }

  // 11. West Bengal (21.5°N - 27.3°N, 85.8°E - 89.9°E)
  if (lat >= 21.50 && lat <= 27.30 && lng >= 85.80 && lng <= 89.90) {
    if (lat >= 24.0 && lng < 87.8) {
      return 'Jharkhand';
    }
    return 'West Bengal';
  }

  // 12. Bihar (24.3°N - 27.5°N, 83.3°E - 88.3°E)
  if (lat >= 24.30 && lat <= 27.50 && lng >= 83.30 && lng <= 88.30) {
    return 'Bihar';
  }

  // 13. Jharkhand (21.9°N - 25.3°N, 83.3°E - 87.9°E)
  if (lat >= 21.90 && lat <= 25.30 && lng >= 83.30 && lng <= 87.90) {
    return 'Jharkhand';
  }

  // 14. Chhattisgarh (17.8°N - 24.1°N, 80.2°E - 84.4°E)
  if (lat >= 17.80 && lat <= 24.10 && lng >= 80.20 && lng <= 84.40) {
    return 'Chhattisgarh';
  }

  // 15. Uttar Pradesh (24.2°N - 30.4°N, 77.1°E - 84.6°E)
  if (lat >= 24.20 && lat <= 30.40 && lng >= 77.10 && lng <= 84.60) {
    if (lat < 26.5 && lng < 78.5) {
      // Gwalior / Shivpuri / Datia protrusion of MP
      return 'Madhya Pradesh';
    }
    return 'Uttar Pradesh';
  }

  // 16. Madhya Pradesh (21.1°N - 26.9°N, 74.0°E - 82.8°E)
  if (lat >= 21.10 && lat <= 26.90 && lng >= 74.00 && lng <= 82.80) {
    return 'Madhya Pradesh';
  }

  // 17. Rajasthan (23.3°N - 30.2°N, 69.5°E - 78.3°E)
  if (lat >= 23.30 && lat <= 30.20 && lng >= 69.50 && lng <= 78.30) {
    if (lat > 27.5 && lng > 76.8) {
      return 'Haryana';
    }
    return 'Rajasthan';
  }

  // 18. Punjab (29.5°N - 32.5°N, 73.8°E - 76.9°E)
  if (lat >= 29.50 && lat <= 32.50 && lng >= 73.80 && lng <= 76.90) {
    return 'Punjab';
  }

  // 19. Haryana (27.6°N - 30.9°N, 74.4°E - 77.6°E)
  if (lat >= 27.60 && lat <= 30.90 && lng >= 74.40 && lng <= 77.60) {
    return 'Haryana';
  }

  // 20. Assam (24.1°N - 28.0°N, 89.7°E - 96.0°E)
  if (lat >= 24.10 && lat <= 28.00 && lng >= 89.70 && lng <= 96.00) {
    return 'Assam';
  }

  return null;
}

/**
 * Rate GPS survey accuracy
 */
export function rateGpsAccuracy(accuracyMeters: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  label: string;
  surveyReady: boolean;
  color: string;
} {
  if (accuracyMeters <= 5) {
    return {
      level: 'excellent',
      label: `Survey-Grade Precision (±${(Math.round(accuracyMeters * 10) / 10).toFixed(1)}m)`,
      surveyReady: true,
      color: 'emerald',
    };
  }
  if (accuracyMeters <= 15) {
    return {
      level: 'good',
      label: `Cadastral Field Grade (±${Math.round(accuracyMeters)}m)`,
      surveyReady: true,
      color: 'teal',
    };
  }
  if (accuracyMeters <= 30) {
    return {
      level: 'fair',
      label: `Approximate Fix (±${Math.round(accuracyMeters)}m)`,
      surveyReady: false,
      color: 'amber',
    };
  }
  return {
    level: 'poor',
    label: `Low Accuracy (±${Math.round(accuracyMeters)}m)`,
    surveyReady: false,
    color: 'rose',
  };
}

/**
 * Format decimal degrees to DMS (Degrees, Minutes, Seconds)
 */
export function toDms(degrees: number, isLatitude: boolean): string {
  const absDeg = Math.abs(degrees);
  const d = Math.floor(absDeg);
  const minFloat = (absDeg - d) * 60;
  const m = Math.floor(minFloat);
  const s = ((minFloat - m) * 60).toFixed(2);
  const direction = isLatitude
    ? degrees >= 0
      ? 'N'
      : 'S'
    : degrees >= 0
    ? 'E'
    : 'W';

  return `${d}° ${m}' ${s}" ${direction}`;
}

/**
 * Calculate Great-Circle distance between two points in meters (Haversine formula)
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
