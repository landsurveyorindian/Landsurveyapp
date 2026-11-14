import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GpsCoordinates,
  detectIndianState,
  rateGpsAccuracy,
  toDms,
} from '../utils/geoUtils';
import {
  EnhancedGpsPosition,
  GpsKalmanFilter,
  StaticEpochAccumulator,
  checkVelocityGate,
  GcpCalibrationManager,
  GcpCalibrationData,
} from '../utils/gpsFilter';

export type GeolocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface UseGeolocationReturn {
  permissionState: GeolocationPermissionState;
  coordinates: EnhancedGpsPosition | null;
  rawCoordinates: GpsCoordinates | null;
  detectedState: string | null;
  accuracyRating: ReturnType<typeof rateGpsAccuracy> | null;
  dmsCoords: { latDms: string; lngDms: string } | null;
  isLoading: boolean;
  errorMessage: string | null;
  requestLocation: (enableHighAccuracy?: boolean) => Promise<EnhancedGpsPosition | null>;
  startWatching: (enableHighAccuracy?: boolean, onUpdate?: (coords: EnhancedGpsPosition) => void) => void;
  stopWatching: () => void;
  isWatching: boolean;
  clearError: () => void;

  // Stale status and outlier diagnostics
  isGpsStale: boolean;
  rejectedOutliersCount: number;

  // Accuracy & Filtering Controls
  filterMode: 'kalman' | 'stationary' | 'raw';
  setFilterMode: (mode: 'kalman' | 'stationary' | 'raw') => void;

  // Stationary Epoch Averaging (Survey Mark Mode)
  isStationaryAveraging: boolean;
  stationaryProgress: {
    count: number;
    target: number;
    convergedAccuracy: number;
    stdDevMeters: number;
    isComplete: boolean;
  };
  startStationaryAveraging: (targetEpochs?: number) => void;
  stopStationaryAveraging: () => EnhancedGpsPosition | null;
  resetStationaryAveraging: () => void;

  // GCP Benchmark Calibration
  calibration: GcpCalibrationData | null;
  calibrateAtKnownPoint: (knownLat: number, knownLng: number, benchmarkName?: string) => GcpCalibrationData;
  clearCalibration: () => void;

  // Real-time metrics
  noiseReductionPercent: number;
  sampleCount: number;
}

export function useGeolocation(): UseGeolocationReturn {
  const [permissionState, setPermissionState] = useState<GeolocationPermissionState>('prompt');
  const [coordinates, setCoordinates] = useState<EnhancedGpsPosition | null>(null);
  const [rawCoordinates, setRawCoordinates] = useState<GpsCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [isGpsStale, setIsGpsStale] = useState<boolean>(false);
  const [rejectedOutliersCount, setRejectedOutliersCount] = useState<number>(0);

  // Filter mode
  const [filterMode, setFilterMode] = useState<'kalman' | 'stationary' | 'raw'>('kalman');

  // Stationary averaging state
  const [isStationaryAveraging, setIsStationaryAveraging] = useState<boolean>(false);
  const [stationaryProgress, setStationaryProgress] = useState<{
    count: number;
    target: number;
    convergedAccuracy: number;
    stdDevMeters: number;
    isComplete: boolean;
  }>({
    count: 0,
    target: 20,
    convergedAccuracy: 10,
    stdDevMeters: 0,
    isComplete: false,
  });

  const [calibration, setCalibration] = useState<GcpCalibrationData | null>(() =>
    GcpCalibrationManager.getInstance().getCalibration()
  );

  const [sampleCount, setSampleCount] = useState<number>(0);
  const [noiseReductionPercent, setNoiseReductionPercent] = useState<number>(0);

  // Filtering instances
  const kalmanRef = useRef<GpsKalmanFilter>(new GpsKalmanFilter(2.5));
  const epochAccumulatorRef = useRef<StaticEpochAccumulator>(new StaticEpochAccumulator(20));
  const lastValidFixRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const lastFixReceivedAtRef = useRef<number>(0);
  const consecutiveOutliersRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const onUpdateCallbackRef = useRef<((coords: EnhancedGpsPosition) => void) | null>(null);

  // Stale GPS watchdog timer: marks GPS stale if no new fix for > 10 seconds while watching
  useEffect(() => {
    const interval = setInterval(() => {
      if (isWatching && lastFixReceivedAtRef.current > 0) {
        const timeSinceLastFix = Date.now() - lastFixReceivedAtRef.current;
        if (timeSinceLastFix > 10000) {
          setIsGpsStale(true);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isWatching]);

  // Sync calibration from storage
  useEffect(() => {
    setCalibration(GcpCalibrationManager.getInstance().getCalibration());
  }, []);

  // Check initial permission status if Permissions API is supported
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setPermissionState('unsupported');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((status) => {
            setPermissionState(status.state as GeolocationPermissionState);
            status.onchange = () => {
              setPermissionState(status.state as GeolocationPermissionState);
              if (status.state === 'granted') {
                setErrorMessage(null);
              }
            };
          })
          .catch(() => {
            setPermissionState('prompt');
          });
      } catch {
        setPermissionState('prompt');
      }
    } else {
      setPermissionState('prompt');
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  /**
   * Process raw GPS fix through geodetic Kalman filter, velocity check, and GCP calibration.
   * Truly discards impossible multipath jumps, stale fixes, and excessive variance before contaminating state.
   */
  const processFix = useCallback(
    (pos: GeolocationPosition): EnhancedGpsPosition | null => {
      const rawLat = pos.coords.latitude;
      const rawLng = pos.coords.longitude;
      const rawAccuracy = Math.max(0.5, pos.coords.accuracy);
      const timestampMs = pos.timestamp || Date.now();
      const now = Date.now();

      // Reject stale GPS fix (> 10 seconds old timestamp)
      if (now - timestampMs > 10000) {
        console.warn(`[GPS Guard] Fix rejected due to stale timestamp (${Math.round((now - timestampMs) / 1000)}s old > 10s limit).`);
        setRejectedOutliersCount((prev) => prev + 1);
        return null;
      }

      // Basic Range & Validity Validation
      if (
        !Number.isFinite(rawLat) ||
        !Number.isFinite(rawLng) ||
        rawLat < -90 ||
        rawLat > 90 ||
        rawLng < -180 ||
        rawLng > 180
      ) {
        console.warn('[GPS Guard] Discarded non-finite or out-of-range coordinate fix:', { rawLat, rawLng });
        setRejectedOutliersCount((prev) => prev + 1);
        return null;
      }

      // Discard severely degraded fixes (> 45m accuracy) that pollute boundary recording
      if (rawAccuracy > 45) {
        console.warn(`[GPS Guard] Fix rejected due to poor accuracy radius (±${rawAccuracy.toFixed(1)}m > 45m).`);
        setRejectedOutliersCount((prev) => prev + 1);
        return null;
      }

      const rawCoords: GpsCoordinates = {
        latitude: rawLat,
        longitude: rawLng,
        accuracy: rawAccuracy,
        altitude: pos.coords.altitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
      };
      setRawCoordinates(rawCoords);

      // Check velocity gating: reject impossible multipath speed spikes (> 6.0 m/s for walking/running surveyor)
      if (lastValidFixRef.current) {
        const velCheck = checkVelocityGate(
          lastValidFixRef.current.lat,
          lastValidFixRef.current.lng,
          lastValidFixRef.current.time,
          rawLat,
          rawLng,
          timestampMs,
          6.0 // 6.0 m/s velocity threshold
        );
        const timeSinceLastValid = (timestampMs - lastValidFixRef.current.time) / 1000;

        // If speed is invalid, check if this is an outlier spike or if sufficient time has elapsed for recovery (> 15s)
        if (!velCheck.isValid && timeSinceLastValid <= 15) {
          if (rawAccuracy <= 8 && consecutiveOutliersRef.current >= 3) {
            console.log('[GPS Guard] Recovered from outlier state after consecutive high-confidence fixes.');
            consecutiveOutliersRef.current = 0;
          } else {
            console.warn('[GPS Guard] Multipath velocity spike suppressed:', velCheck);
            consecutiveOutliersRef.current += 1;
            setRejectedOutliersCount((prev) => prev + 1);
            return null;
          }
        }
      }

      // Valid fix accepted: update last valid fix reference and reset stale flag
      consecutiveOutliersRef.current = 0;
      lastValidFixRef.current = { lat: rawLat, lng: rawLng, time: timestampMs };
      lastFixReceivedAtRef.current = Date.now();
      setIsGpsStale(false);
      setSampleCount((prev) => prev + 1);

      let processedLat = rawLat;
      let processedLng = rawLng;
      let processedAccuracy = rawAccuracy;
      let currentFilterMode: 'kalman' | 'stationary' | 'calibrated' | 'raw' = filterMode;

      // Handle Stationary Epoch Averaging mode
      if (isStationaryAveraging) {
        epochAccumulatorRef.current.addSample(rawLat, rawLng, rawAccuracy);
        const staticResult = epochAccumulatorRef.current.computeResult();
        if (staticResult) {
          processedLat = staticResult.lat;
          processedLng = staticResult.lng;
          processedAccuracy = staticResult.convergedAccuracy;
          currentFilterMode = 'stationary';

          setStationaryProgress({
            count: staticResult.sampleCount,
            target: epochAccumulatorRef.current.getTargetCount(),
            convergedAccuracy: staticResult.convergedAccuracy,
            stdDevMeters: staticResult.stdDevMeters,
            isComplete: staticResult.isConverged,
          });
        }
      } else if (filterMode === 'kalman') {
        // Continuous 2D Geodesic Kalman Filter
        const kalmanResult = kalmanRef.current.update(rawLat, rawLng, rawAccuracy, timestampMs);
        processedLat = kalmanResult.lat;
        processedLng = kalmanResult.lng;
        processedAccuracy = kalmanResult.estimatedAccuracy;
        currentFilterMode = 'kalman';
      }

      // Apply GCP / Benchmark differential offset if active
      const activeCalibration = GcpCalibrationManager.getInstance().getCalibration();
      let isCalibrated = false;
      let calOffsetData: EnhancedGpsPosition['calibrationOffset'] = undefined;

      if (activeCalibration) {
        processedLat = Number((processedLat + activeCalibration.deltaLat).toFixed(7));
        processedLng = Number((processedLng + activeCalibration.deltaLng).toFixed(7));
        isCalibrated = true;
        calOffsetData = {
          deltaLat: activeCalibration.deltaLat,
          deltaLng: activeCalibration.deltaLng,
          offsetMeters: activeCalibration.offsetMeters,
          benchmarkName: activeCalibration.benchmarkName,
        };
      }

      // Calculate precision gain percentage (purely statistical variance reduction)
      const noiseReduction = Math.max(
        0,
        Math.min(95, Math.round(((rawAccuracy - processedAccuracy) / rawAccuracy) * 100))
      );
      setNoiseReductionPercent(noiseReduction);

      const enhanced: EnhancedGpsPosition = {
        latitude: processedLat,
        longitude: processedLng,
        accuracy: processedAccuracy,
        altitude: pos.coords.altitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        rawLatitude: rawLat,
        rawLongitude: rawLng,
        rawAccuracy,
        enhancedAccuracy: processedAccuracy,
        filterMode: isCalibrated ? 'calibrated' : currentFilterMode,
        epochsCount: isStationaryAveraging ? epochAccumulatorRef.current.getCount() : 1,
        noiseReductionPercent: noiseReduction,
        isCalibrated,
        calibrationOffset: calOffsetData,
      };

      setCoordinates(enhanced);
      setPermissionState('granted');
      setErrorMessage(null);
      return enhanced;
    },
    [filterMode, isStationaryAveraging]
  );

  const handleGeoError = useCallback((err: GeolocationPositionError) => {
    let msg = 'Unable to acquire location.';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        msg = 'Location permission was denied. Please allow location access in your browser settings to use GPS surveying.';
        setPermissionState('denied');
        break;
      case err.POSITION_UNAVAILABLE:
        msg = 'GPS location unavailable. Please ensure your device location/GPS is switched on.';
        break;
      case err.TIMEOUT:
        msg = 'GPS location request timed out. Please try again with clear sky visibility.';
        break;
      default:
        msg = err.message || 'Unknown GPS error occurred.';
    }
    setErrorMessage(msg);
  }, []);

  const requestLocation = useCallback(
    async (enableHighAccuracy = true): Promise<EnhancedGpsPosition | null> => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setPermissionState('unsupported');
        setErrorMessage('Geolocation is not supported by your browser or device.');
        return null;
      }

      setIsLoading(true);
      setErrorMessage(null);

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLoading(false);
            const enhanced = processFix(pos);
            resolve(enhanced);
          },
          (err) => {
            setIsLoading(false);
            handleGeoError(err);
            resolve(null);
          },
          {
            enableHighAccuracy,
            timeout: 15000,
            maximumAge: 0, // Always get fresh fix
          }
        );
      });
    },
    [processFix, handleGeoError]
  );

  const startWatching = useCallback(
    (enableHighAccuracy = true, onUpdate?: (coords: EnhancedGpsPosition) => void) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setPermissionState('unsupported');
        setErrorMessage('Geolocation is not supported by your browser.');
        return;
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      onUpdateCallbackRef.current = onUpdate || null;
      setIsWatching(true);

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const enhanced = processFix(pos);
          if (enhanced && onUpdateCallbackRef.current) {
            onUpdateCallbackRef.current(enhanced);
          }
        },
        (err) => {
          handleGeoError(err);
          setIsWatching(false);
        },
        {
          enableHighAccuracy,
          timeout: 15000,
          maximumAge: 500,
        }
      );

      watchIdRef.current = id;
    },
    [processFix, handleGeoError]
  );

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  // Stationary Epoch Averaging Controls
  const startStationaryAveraging = useCallback((targetEpochs = 20) => {
    epochAccumulatorRef.current.reset();
    epochAccumulatorRef.current.setTargetCount(targetEpochs);
    setIsStationaryAveraging(true);
    setStationaryProgress({
      count: 0,
      target: targetEpochs,
      convergedAccuracy: 10,
      stdDevMeters: 0,
      isComplete: false,
    });
  }, []);

  const stopStationaryAveraging = useCallback((): EnhancedGpsPosition | null => {
    setIsStationaryAveraging(false);
    const result = epochAccumulatorRef.current.computeResult();
    if (!result || !coordinates) return null;

    return {
      ...coordinates,
      latitude: result.lat,
      longitude: result.lng,
      accuracy: result.convergedAccuracy,
      enhancedAccuracy: result.convergedAccuracy,
      filterMode: 'stationary',
      epochsCount: result.sampleCount,
      stationaryStats: {
        sampleCount: result.sampleCount,
        stdDevMeters: result.stdDevMeters,
        standardErrorMeters: result.standardErrorMeters,
        isConverged: result.isConverged,
      },
    };
  }, [coordinates]);

  const resetStationaryAveraging = useCallback(() => {
    epochAccumulatorRef.current.reset();
    setIsStationaryAveraging(false);
    setStationaryProgress({
      count: 0,
      target: 20,
      convergedAccuracy: 10,
      stdDevMeters: 0,
      isComplete: false,
    });
  }, []);

  // Benchmark / Ground Control Point Calibration Controls
  const calibrateAtKnownPoint = useCallback(
    (knownLat: number, knownLng: number, benchmarkName?: string): GcpCalibrationData => {
      const activeLat = coordinates?.rawLatitude || coordinates?.latitude || knownLat;
      const activeLng = coordinates?.rawLongitude || coordinates?.longitude || knownLng;

      const cal = GcpCalibrationManager.getInstance().calibrate(
        activeLat,
        activeLng,
        knownLat,
        knownLng,
        benchmarkName
      );
      setCalibration(cal);
      return cal;
    },
    [coordinates]
  );

  const clearCalibration = useCallback(() => {
    GcpCalibrationManager.getInstance().clear();
    setCalibration(null);
  }, []);

  const detectedState = coordinates
    ? detectIndianState(coordinates.latitude, coordinates.longitude)
    : null;

  const accuracyRating = coordinates
    ? rateGpsAccuracy(coordinates.accuracy)
    : null;

  const dmsCoords = coordinates
    ? {
        latDms: toDms(coordinates.latitude, true),
        lngDms: toDms(coordinates.longitude, false),
      }
    : null;

  return {
    permissionState,
    coordinates,
    rawCoordinates,
    detectedState,
    accuracyRating,
    dmsCoords,
    isLoading,
    errorMessage,
    requestLocation,
    startWatching,
    stopWatching,
    isWatching,
    clearError: () => setErrorMessage(null),

    filterMode,
    setFilterMode,

    isStationaryAveraging,
    stationaryProgress,
    startStationaryAveraging,
    stopStationaryAveraging,
    resetStationaryAveraging,

    calibration,
    calibrateAtKnownPoint,
    clearCalibration,

    noiseReductionPercent,
    sampleCount,
    isGpsStale,
    rejectedOutliersCount,
  };
}
