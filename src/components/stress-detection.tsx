import React, { useEffect, useRef } from 'react';
import { useStressDetection } from '@/hooks/useStressDetection';
import { AlertTriangle, Brain, CheckCircle, Loader, Play, Square, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipButton } from './tooltip-button';

interface StressDetectionProps {
  videoElement: HTMLVideoElement | null;
  isRecording: boolean;
  onStressDetected?: (stress: boolean, confidence: number, features: string[]) => void;
  className?: string;
}

export const StressDetection: React.FC<StressDetectionProps> = ({
  videoElement,
  isRecording,
  onStressDetected,
  className
}) => {
  const [state, controls] = useStressDetection();
  const hasInitialized = useRef(false);

  // Initialize when video element is available
  useEffect(() => {
    if (videoElement && !hasInitialized.current) {
      hasInitialized.current = true;
      controls.initialize(videoElement);
    }
  }, [videoElement, controls]);

  // Handle recording state changes
  useEffect(() => {
    if (!state.isInitialized) return;

    if (isRecording) {
      // Start detection when recording starts (after calibration)
      if (state.calibrationProgress >= 1 && !state.isDetecting) {
        controls.startDetection();
      }
    } else {
      // Stop detection when recording stops
      if (state.isDetecting) {
        controls.stopDetection();
      }
    }
  }, [isRecording, state.isInitialized, state.calibrationProgress, state.isDetecting, controls]);

  // Notify parent component of stress changes
  useEffect(() => {
    if (onStressDetected && state.isDetecting) {
      onStressDetected(
        state.currentStress.stress,
        state.currentStress.confidence,
        state.currentStress.features
      );
    }
  }, [state.currentStress, state.isDetecting, onStressDetected]);

  const handleStartCalibration = async () => {
    await controls.startCalibration();
  };

  const handleReset = () => {
    controls.reset();
    hasInitialized.current = false;
    if (videoElement) {
      controls.initialize(videoElement);
    }
  };

  const getStressLevelColor = (confidence: number) => {
    if (confidence < 0.3) return 'text-green-600';
    if (confidence < 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStressLevelBg = (confidence: number) => {
    if (confidence < 0.3) return 'bg-green-100 border-green-200';
    if (confidence < 0.6) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  if (!state.isInitialized) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-gray-100 rounded-lg", className)}>
        <Loader className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-600">Initializing stress detection...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">Stress Detection</h3>
        </div>
        
        <div className="flex items-center gap-1">
          {state.calibrationProgress < 1 && (
            <TooltipButton
              content="Start Calibration"
              icon={<Play className="w-4 h-4" />}
              onClick={handleStartCalibration}
              disbaled={state.isCalibrating}
            />
          )}
          
          <TooltipButton
            content="Reset"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={handleReset}
          />
        </div>
      </div>

      {/* Calibration Status */}
      {state.calibrationProgress < 1 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {state.isCalibrating ? (
              <Loader className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-blue-600" />
            )}
            <span className="text-sm font-medium text-blue-800">
              {state.isCalibrating ? 'Calibrating...' : 'Calibration Required'}
            </span>
          </div>
          
          {state.isCalibrating && (
            <div className="space-y-2">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.calibrationProgress * 100}%` }}
                />
              </div>
              <p className="text-xs text-blue-700">
                Stay relaxed and look at the camera for {Math.ceil((1 - state.calibrationProgress) * 5)} more seconds
              </p>
            </div>
          )}
          
          {!state.isCalibrating && (
            <p className="text-xs text-blue-700">
              Click "Start Calibration" and maintain a neutral expression for 5 seconds to establish your baseline.
            </p>
          )}
        </div>
      )}

      {/* Detection Status */}
      {state.calibrationProgress >= 1 && (
        <div className={cn(
          "p-3 border rounded-lg transition-all duration-300",
          state.currentStress.stress 
            ? getStressLevelBg(state.currentStress.confidence)
            : "bg-green-50 border-green-200"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {state.isDetecting ? (
                state.currentStress.stress ? (
                  <AlertTriangle className={cn("w-4 h-4", getStressLevelColor(state.currentStress.confidence))} />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              
              <span className={cn(
                "text-sm font-medium",
                state.currentStress.stress 
                  ? getStressLevelColor(state.currentStress.confidence)
                  : "text-green-700"
              )}>
                {state.isDetecting ? (
                  state.currentStress.stress ? 'Stress Detected' : 'Relaxed'
                ) : 'Ready'}
              </span>
            </div>
            
            {state.isDetecting && (
              <span className="text-xs text-gray-600">
                {Math.round(state.currentStress.confidence * 100)}% confidence
              </span>
            )}
          </div>

          {/* Stress Features */}
          {state.isDetecting && state.currentStress.features.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-600">Detected indicators:</p>
              <div className="flex flex-wrap gap-1">
                {state.currentStress.features.map((feature, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs bg-white rounded-full border"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detection Stats */}
          {state.isDetecting && state.stats.totalDetections > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Detections:</span> {state.stats.totalDetections}
                </div>
                <div>
                  <span className="font-medium">Stress Events:</span> {state.stats.stressDetections}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">{state.error}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!state.isDetecting && state.calibrationProgress >= 1 && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600">
            Stress detection is ready. Start recording to begin real-time analysis.
          </p>
        </div>
      )}
    </div>
  );
};