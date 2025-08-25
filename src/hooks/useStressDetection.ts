import { useEffect, useRef, useState, useCallback } from 'react';
import { StressDetector, StressDetectionResult } from '@/lib/analysis/stress-detector';

export interface StressDetectionState {
  isInitialized: boolean;
  isCalibrating: boolean;
  isDetecting: boolean;
  calibrationProgress: number;
  currentStress: StressDetectionResult;
  error: string | null;
  stats: {
    totalDetections: number;
    stressDetections: number;
    averageConfidence: number;
    baselineAge: number;
  };
}

export interface StressDetectionControls {
  initialize: (videoElement: HTMLVideoElement) => Promise<boolean>;
  startCalibration: () => Promise<boolean>;
  startDetection: () => boolean;
  stopDetection: () => void;
  stopCalibration: () => void;
  reset: () => void;
}

const initialState: StressDetectionState = {
  isInitialized: false,
  isCalibrating: false,
  isDetecting: false,
  calibrationProgress: 0,
  currentStress: {
    stress: false,
    confidence: 0,
    features: []
  },
  error: null,
  stats: {
    totalDetections: 0,
    stressDetections: 0,
    averageConfidence: 0,
    baselineAge: 0
  }
};

export const useStressDetection = (): [StressDetectionState, StressDetectionControls] => {
  const [state, setState] = useState<StressDetectionState>(initialState);
  const detectorRef = useRef<StressDetector | null>(null);
  const updateIntervalRef = useRef<number | null>(null);

  // Initialize detector
  const initialize = useCallback(async (videoElement: HTMLVideoElement): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      if (!detectorRef.current) {
        detectorRef.current = new StressDetector();
      }

      const success = await detectorRef.current.initialize(videoElement);
      
      setState(prev => ({
        ...prev,
        isInitialized: success,
        error: success ? null : 'Failed to initialize stress detector'
      }));

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      setState(prev => ({
        ...prev,
        isInitialized: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  // Start calibration
  const startCalibration = useCallback(async (): Promise<boolean> => {
    if (!detectorRef.current) {
      setState(prev => ({ ...prev, error: 'Detector not initialized' }));
      return false;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isCalibrating: true, 
        calibrationProgress: 0,
        error: null 
      }));

      const success = await detectorRef.current.startCalibration();
      
      setState(prev => ({
        ...prev,
        isCalibrating: false,
        calibrationProgress: success ? 1 : 0,
        error: success ? null : 'Calibration failed'
      }));

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calibration error';
      setState(prev => ({
        ...prev,
        isCalibrating: false,
        calibrationProgress: 0,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  // Start detection
  const startDetection = useCallback((): boolean => {
    if (!detectorRef.current) {
      setState(prev => ({ ...prev, error: 'Detector not initialized' }));
      return false;
    }

    try {
      const success = detectorRef.current.startDetection();
      
      setState(prev => ({
        ...prev,
        isDetecting: success,
        error: success ? null : 'Failed to start detection'
      }));

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Detection start error';
      setState(prev => ({
        ...prev,
        isDetecting: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  // Stop detection
  const stopDetection = useCallback((): void => {
    if (detectorRef.current) {
      detectorRef.current.stopDetection();
    }
    setState(prev => ({ ...prev, isDetecting: false }));
  }, []);

  // Stop calibration
  const stopCalibration = useCallback((): void => {
    if (detectorRef.current) {
      detectorRef.current.stopCalibration();
    }
    setState(prev => ({ 
      ...prev, 
      isCalibrating: false, 
      calibrationProgress: 0 
    }));
  }, []);

  // Reset detector
  const reset = useCallback((): void => {
    if (detectorRef.current) {
      detectorRef.current.reset();
    }
    setState(initialState);
  }, []);

  // Update state periodically when detecting
  useEffect(() => {
    if (state.isDetecting && detectorRef.current) {
      updateIntervalRef.current = window.setInterval(() => {
        if (detectorRef.current) {
          const currentStress = detectorRef.current.getCurrentStressLevel();
          const stats = detectorRef.current.getDetectionStats();
          
          setState(prev => ({
            ...prev,
            currentStress,
            stats
          }));
        }
      }, 500); // Update UI every 500ms

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
      };
    }
  }, [state.isDetecting]);

  // Update calibration progress
  useEffect(() => {
    if (state.isCalibrating && detectorRef.current) {
      const progressInterval = setInterval(() => {
        if (detectorRef.current) {
          const progress = detectorRef.current.getCalibrationProgress();
          setState(prev => ({ ...prev, calibrationProgress: progress }));
          
          // Stop updating when calibration is complete
          if (progress >= 1 || !detectorRef.current.isCalibrationActive()) {
            clearInterval(progressInterval);
          }
        }
      }, 200);

      return () => clearInterval(progressInterval);
    }
  }, [state.isCalibrating]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (detectorRef.current) {
        detectorRef.current.reset();
      }
    };
  }, []);

  const controls: StressDetectionControls = {
    initialize,
    startCalibration,
    startDetection,
    stopDetection,
    stopCalibration,
    reset
  };

  return [state, controls];
};