/**
 * Professional Geomatics GPS Accuracy & Filtering Engine
 * Enhances consumer device GNSS fixes via:
 * 1. 2D Recursive Kalman Filter with geodetic metric scaling
 * 2. Static Epoch Accumulator for stationary boundary stone averaging (Central Limit Theorem)
 * 3. Velocity and multipath spike gating (outlier rejection)
 * 4. Ground Control Point (GCP) / Known Survey Benchmark differential offset calibration
 */

import { calculateDistanceMeters, GpsCoordinates } from './geoUtils';

export interface EnhancedGpsPosition extends GpsCoordinates {
  rawLatitude: number;
  rawLongitude: number;
  rawAccuracy: number;
  enhancedAccuracy: number;
  filterMode: 'kalman' | 'stationary' | 'calibrated' | 'raw';
  epochsCount: number;
  noiseReductionPercent: number;
  isCalibrated: boolean;
  calibrationOffset?: {
    deltaLat: number;
    deltaLng: number;
    offsetMeters: number;
    benchmarkName?: string;
  };
  stationaryStats?: {
    sampleCount: number;
    stdDevMeters: number;
    standardErrorMeters: number;
    isConverged: boolean;
  };
}

export interface GcpCalibrationData {
  deltaLat: number;
  deltaLng: number;
  offsetMeters: number;
  benchmarkName?: string;
  calibratedAt: string;
}

const LOCAL_STORAGE_CALIBRATION_KEY = 'sthal_gps_gcp_calibration_v1';

/**
 * 2D Kalman Filter tailored for Geodetic coordinates (Lat/Lng)
 */
export class GpsKalmanFilter {
  private lat: number | null = null;
  private lng: number | null = null;
  private variance: number = -1; // Error covariance in meters squared
  private lastTimestampMs: number = 0;

  // Process noise (variance added per second based on human walking speed ~ 1.2 m/s)
  // Higher = more responsive to fast movement; Lower = smoother, filters more jitter
  private processNoise: number = 3.0; // meters^2 / sec

  constructor(processNoise = 3.0) {
    this.processNoise = processNoise;
  }

  public reset(): void {
    this.lat = null;
    this.lng = null;
    this.variance = -1;
    this.lastTimestampMs = 0;
  }

  public setProcessNoise(noise: number): void {
    this.processNoise = Math.max(0.1, noise);
  }

  /**
   * Update the filter with a new raw measurement
   * @param rawLat Raw Latitude in degrees
   * @param rawLng Raw Longitude in degrees
   * @param accuracy Device reported 68% confidence radius in meters
   * @param timestampMs Epoch timestamp in ms (defaults to Date.now())
   */
  public update(
    rawLat: number,
    rawLng: number,
    accuracy: number,
    timestampMs = Date.now()
  ): { lat: number; lng: number; estimatedAccuracy: number } {
    const measurementVariance = Math.max(0.5, accuracy) ** 2; // R in meters^2

    // First fix: initialize state
    if (this.lat === null || this.lng === null || this.variance < 0) {
      this.lat = rawLat;
      this.lng = rawLng;
      this.variance = measurementVariance;
      this.lastTimestampMs = timestampMs;
      return {
        lat: this.lat,
        lng: this.lng,
        estimatedAccuracy: accuracy,
      };
    }

    // Time elapsed in seconds
    const dtSeconds = Math.max(0.1, Math.min(10.0, (timestampMs - this.lastTimestampMs) / 1000));
    this.lastTimestampMs = timestampMs;

    // Metric scaling factors around current latitude
    const latRadians = (this.lat * Math.PI) / 180;
    const metersPerDegLat = 111132.954 - 559.822 * Math.cos(2 * latRadians);
    const metersPerDegLng = 111412.84 * Math.cos(latRadians);

    // 1. Predict Step
    // Increase estimated error variance over time due to potential physical movement
    let predictedVariance = this.variance + dtSeconds * this.processNoise;

    // 2. Kalman Gain: K = P_pred / (P_pred + R)
    const kalmanGain = predictedVariance / (predictedVariance + measurementVariance);

    // 3. Update Step (State Update)
    // Blend in latitude and longitude
    const latDiffMeters = (rawLat - this.lat) * metersPerDegLat;
    const lngDiffMeters = (rawLng - this.lng) * metersPerDegLng;

    const newLatMeters = latDiffMeters * kalmanGain;
    const newLngMeters = lngDiffMeters * kalmanGain;

    this.lat += newLatMeters / metersPerDegLat;
    this.lng += newLngMeters / metersPerDegLng;

    // 4. Update Error Covariance: P = (1 - K) * P_pred
    this.variance = (1 - kalmanGain) * predictedVariance;

    const estimatedAccuracy = Math.max(0.3, Math.sqrt(this.variance));

    return {
      lat: Number(this.lat.toFixed(7)),
      lng: Number(this.lng.toFixed(7)),
      estimatedAccuracy: Number(estimatedAccuracy.toFixed(2)),
    };
  }

  public getState(): { lat: number; lng: number; estimatedAccuracy: number } | null {
    if (this.lat === null || this.lng === null || this.variance < 0) return null;
    return {
      lat: Number(this.lat.toFixed(7)),
      lng: Number(this.lng.toFixed(7)),
      estimatedAccuracy: Number(Math.max(0.3, Math.sqrt(this.variance)).toFixed(2)),
    };
  }
}

/**
 * Static Epoch Accumulator for Stationary Boundary Stones
 * Uses Inverse-Variance Weighted Centroid Averaging (Central Limit Theorem)
 * Significantly reduces random receiver jitter down to sub-meter precision
 */
export interface EpochSample {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export class StaticEpochAccumulator {
  private samples: EpochSample[] = [];
  private targetCount: number = 20;

  constructor(targetCount = 20) {
    this.targetCount = targetCount;
  }

  public reset(): void {
    this.samples = [];
  }

  public setTargetCount(count: number): void {
    this.targetCount = Math.max(5, count);
  }

  public addSample(lat: number, lng: number, accuracy: number): void {
    // Only accumulate fixes with realistic accuracy (skip > 25m multipath spikes)
    if (accuracy > 25) return;
    this.samples.push({
      lat,
      lng,
      accuracy: Math.max(0.5, accuracy),
      timestamp: Date.now(),
    });
  }

  public getCount(): number {
    return this.samples.length;
  }

  public getTargetCount(): number {
    return this.targetCount;
  }

  public isComplete(): boolean {
    return this.samples.length >= this.targetCount;
  }

  public computeResult(): {
    lat: number;
    lng: number;
    convergedAccuracy: number;
    stdDevMeters: number;
    standardErrorMeters: number;
    sampleCount: number;
    isConverged: boolean;
  } | null {
    if (this.samples.length === 0) return null;

    let sumWeight = 0;
    let sumWeightedLat = 0;
    let sumWeightedLng = 0;

    // Weight inversely proportional to accuracy variance: w_i = 1 / (accuracy_i^2)
    for (const s of this.samples) {
      const weight = 1 / (s.accuracy * s.accuracy);
      sumWeight += weight;
      sumWeightedLat += s.lat * weight;
      sumWeightedLng += s.lng * weight;
    }

    const meanLat = sumWeightedLat / sumWeight;
    const meanLng = sumWeightedLng / sumWeight;

    // Calculate spatial dispersion / standard deviation around the weighted mean
    let sumDistSq = 0;
    for (const s of this.samples) {
      const dist = calculateDistanceMeters(meanLat, meanLng, s.lat, s.lng);
      sumDistSq += dist * dist;
    }
    const stdDevMeters = Math.sqrt(sumDistSq / this.samples.length);

    // Standard error of the weighted mean: SE = 1 / sqrt(sum(weights))
    const standardErrorMeters = 1 / Math.sqrt(sumWeight);

    // Converged estimated precision: standard error of weighted mean, bounded by physical dispersion
    const meanAccuracy =
      this.samples.reduce((acc, curr) => acc + curr.accuracy, 0) / this.samples.length;
    const sampleFactor = Math.sqrt(this.samples.length);
    const convergedAccuracy = Math.max(
      0.3,
      Math.min(
        meanAccuracy,
        Math.max(standardErrorMeters, stdDevMeters / Math.max(1, sampleFactor))
      )
    );

    return {
      lat: Number(meanLat.toFixed(7)),
      lng: Number(meanLng.toFixed(7)),
      convergedAccuracy: Number(convergedAccuracy.toFixed(2)),
      stdDevMeters: Number(stdDevMeters.toFixed(2)),
      standardErrorMeters: Number(standardErrorMeters.toFixed(2)),
      sampleCount: this.samples.length,
      isConverged: this.samples.length >= this.targetCount || standardErrorMeters <= 1.0,
    };
  }
}

/**
 * Velocity & Multipath Outlier Gating
 * Verifies that consecutive GPS fixes are physically possible for a human surveyor on foot
 */
export function checkVelocityGate(
  prevLat: number,
  prevLng: number,
  prevTimestampMs: number,
  newLat: number,
  newLng: number,
  newTimestampMs: number,
  maxSpeedMps = 3.5 // 3.5 m/s (~12.6 km/h) max walking/running surveyor speed
): { isValid: boolean; impliedSpeedMps: number; distanceMeters: number } {
  const dtSeconds = (newTimestampMs - prevTimestampMs) / 1000;
  if (dtSeconds <= 0.1) {
    return { isValid: true, impliedSpeedMps: 0, distanceMeters: 0 };
  }

  const distMeters = calculateDistanceMeters(prevLat, prevLng, newLat, newLng);
  const impliedSpeedMps = distMeters / dtSeconds;

  return {
    isValid: impliedSpeedMps <= maxSpeedMps,
    impliedSpeedMps: Number(impliedSpeedMps.toFixed(2)),
    distanceMeters: Number(distMeters.toFixed(2)),
  };
}

/**
 * Ground Control Point (GCP) / Known Benchmark Calibration
 * Computes and manages differential offset between measured GPS coordinates
 * and authoritative ground truth (FMB boundary stone, GTS benchmark, or cadastral map)
 */
export class GcpCalibrationManager {
  private static instance: GcpCalibrationManager;
  private currentCalibration: GcpCalibrationData | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): GcpCalibrationManager {
    if (!GcpCalibrationManager.instance) {
      GcpCalibrationManager.instance = new GcpCalibrationManager();
    }
    return GcpCalibrationManager.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CALIBRATION_KEY);
      if (stored) {
        this.currentCalibration = JSON.parse(stored);
      }
    } catch {
      this.currentCalibration = null;
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      if (this.currentCalibration) {
        localStorage.setItem(LOCAL_STORAGE_CALIBRATION_KEY, JSON.stringify(this.currentCalibration));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_CALIBRATION_KEY);
      }
    } catch {
      // storage unavailable
    }
  }

  public getCalibration(): GcpCalibrationData | null {
    return this.currentCalibration;
  }

  /**
   * Calibrate by setting a known authoritative coordinate for current measured point
   */
  public calibrate(
    measuredLat: number,
    measuredLng: number,
    knownLat: number,
    knownLng: number,
    benchmarkName?: string
  ): GcpCalibrationData {
    const deltaLat = knownLat - measuredLat;
    const deltaLng = knownLng - measuredLng;
    const offsetMeters = calculateDistanceMeters(measuredLat, measuredLng, knownLat, knownLng);

    const calibration: GcpCalibrationData = {
      deltaLat: Number(deltaLat.toFixed(8)),
      deltaLng: Number(deltaLng.toFixed(8)),
      offsetMeters: Number(offsetMeters.toFixed(2)),
      benchmarkName: benchmarkName || 'GCP Survey Marker',
      calibratedAt: new Date().toISOString(),
    };

    this.currentCalibration = calibration;
    this.saveToStorage();
    return calibration;
  }

  public clear(): void {
    this.currentCalibration = null;
    this.saveToStorage();
  }

  /**
   * Apply calibration offset to a coordinate
   */
  public apply(lat: number, lng: number): { lat: number; lng: number } {
    if (!this.currentCalibration) {
      return { lat, lng };
    }
    return {
      lat: Number((lat + this.currentCalibration.deltaLat).toFixed(7)),
      lng: Number((lng + this.currentCalibration.deltaLng).toFixed(7)),
    };
  }
}
