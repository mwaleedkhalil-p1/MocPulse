import React, { useRef, useState, useEffect } from 'react';
import { StressDetection } from './stress-detection';
import { Play, Square, Video, VideoOff } from 'lucide-react';
import { TooltipButton } from './tooltip-button';
import WebCam from 'react-webcam';

export const StressDetectionDemo: React.FC = () => {
  const [isWebCamActive, setIsWebCamActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [stressData, setStressData] = useState<{
    stress: boolean;
    confidence: number;
    features: string[];
  }>({
    stress: false,
    confidence: 0,
    features: []
  });

  const webcamRef = useRef<WebCam>(null);

  const handleStressDetected = (stress: boolean, confidence: number, features: string[]) => {
    setStressData({ stress, confidence, features });
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const toggleWebcam = () => {
    setIsWebCamActive(!isWebCamActive);
    if (isRecording && !isWebCamActive) {
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Stress Detection Demo
        </h1>
        <p className="text-gray-600">
          Real-time stress detection using face-api.js with baseline calibration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webcam Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Camera Feed</h2>
          
          <div className="w-full h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            {isWebCamActive ? (
              <WebCam
                ref={webcamRef}
                onUserMedia={() => setIsWebCamActive(true)}
                onUserMediaError={() => setIsWebCamActive(false)}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="text-center">
                <Video className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Camera not active</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            <TooltipButton
              content={isWebCamActive ? "Turn Off Camera" : "Turn On Camera"}
              icon={isWebCamActive ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              onClick={toggleWebcam}
            />
            
            <TooltipButton
              content={isRecording ? "Stop Detection" : "Start Detection"}
              icon={isRecording ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              onClick={toggleRecording}
              disbaled={!isWebCamActive}
            />
          </div>
        </div>

        {/* Stress Detection Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Stress Analysis</h2>
          
          {isWebCamActive && (
            <StressDetection
              videoElement={webcamRef.current?.video || null}
              isRecording={isRecording}
              onStressDetected={handleStressDetected}
              className="w-full"
            />
          )}

          {!isWebCamActive && (
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">Enable camera to start stress detection</p>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Results */}
      {isRecording && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Real-time Stress Detection Results
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-bold ${stressData.stress ? 'text-red-600' : 'text-green-600'}`}>
                {stressData.stress ? 'STRESSED' : 'RELAXED'}
              </div>
              <p className="text-sm text-gray-600 mt-1">Current State</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(stressData.confidence * 100)}%
              </div>
              <p className="text-sm text-gray-600 mt-1">Confidence</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stressData.features.length}
              </div>
              <p className="text-sm text-gray-600 mt-1">Stress Indicators</p>
            </div>
          </div>

          {stressData.features.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-800 mb-2">Detected Features:</h4>
              <div className="flex flex-wrap gap-2">
                {stressData.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full border border-red-200"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Use</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-700">
          <li>Click "Turn On Camera" to enable your webcam</li>
          <li>Click "Start Detection" to begin stress analysis</li>
          <li>The system will first calibrate by capturing your neutral expression for 5 seconds</li>
          <li>After calibration, real-time stress detection will begin</li>
          <li>Try different expressions to see how the system responds</li>
          <li>The system uses temporal smoothing to reduce false positives</li>
        </ol>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Technical Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Detection Method</h4>
            <ul className="space-y-1">
              <li>• Uses face-api.js TinyFaceDetector</li>
              <li>• Baseline calibration (5 seconds)</li>
              <li>• Expression deviation analysis</li>
              <li>• Temporal smoothing (5-frame window)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Stress Indicators</h4>
            <ul className="space-y-1">
              <li>• Angry expressions (eyebrow tension)</li>
              <li>• Fearful expressions (eye widening)</li>
              <li>• Sad expressions (lip compression)</li>
              <li>• Disgusted expressions (nose wrinkling)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};