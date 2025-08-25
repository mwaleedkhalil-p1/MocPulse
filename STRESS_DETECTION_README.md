# Stress Detection Implementation for MOC-PULSE

## Overview

This implementation provides real-time stress detection using face-api.js for the MOC-PULSE interview simulation system. The solution uses baseline calibration and temporal smoothing to minimize false positives while accurately detecting stress indicators during interviews.

## Features

- **Baseline Calibration**: 5-second neutral expression capture to establish user's natural facial structure
- **Real-time Detection**: Continuous stress monitoring during interview sessions
- **Temporal Smoothing**: 5-frame rolling window to reduce flickering and false positives
- **Stress Indicators**: Focuses on angry, fearful, sad, and disgusted expressions
- **Confidence Scoring**: Provides confidence levels (0.0-1.0) for stress detection
- **Feature Detection**: Identifies specific stress indicators (eyebrow tension, lip compression, etc.)

## Implementation Details

### Core Components

1. **StressDetector** (`src/lib/analysis/stress-detector.ts`)
   - Main stress detection engine
   - Handles baseline calibration and real-time analysis
   - Uses face-api.js TinyFaceDetector with expression analysis

2. **StressAnalyzer** (`src/lib/analysis/index.ts`)
   - Integrates with existing analysis system
   - Provides timeline tracking and feedback generation

3. **useStressDetection Hook** (`src/hooks/useStressDetection.ts`)
   - React hook for managing stress detection state
   - Handles initialization, calibration, and detection lifecycle

4. **StressDetection Component** (`src/components/stress-detection.tsx`)
   - UI component for stress detection interface
   - Shows calibration progress and real-time results

### Technical Specifications

- **Detection Threshold**: 0.25 deviation from baseline
- **Confidence Threshold**: 0.6 minimum for stress detection
- **Calibration Duration**: 5 seconds (15 samples)
- **Detection Frequency**: ~3 FPS (333ms intervals)
- **Smoothing Window**: 5 frames for temporal stability

### Stress Expression Weights

```javascript
const STRESS_EXPRESSIONS = {
  angry: 1.0,      // Direct stress indicator
  fearful: 1.0,    // Direct stress indicator  
  sad: 0.8,        // Moderate stress indicator
  disgusted: 0.7,  // Moderate stress indicator
  surprised: 0.3,  // Mild stress indicator
};
```

## Usage

### Basic Integration

```typescript
import { StressDetection } from '@/components/stress-detection';

// In your component
<StressDetection
  videoElement={webcamRef.current?.video || null}
  isRecording={isRecording}
  onStressDetected={(stress, confidence, features) => {
    console.log('Stress detected:', { stress, confidence, features });
  }}
/>
```

### Manual Control

```typescript
import { useStressDetection } from '@/hooks/useStressDetection';

const [state, controls] = useStressDetection();

// Initialize with video element
await controls.initialize(videoElement);

// Start calibration
await controls.startCalibration();

// Start detection
controls.startDetection();

// Get current stress level
const currentStress = state.currentStress;
```

## Output Format

The stress detection system outputs data in the following format:

```json
{
  "stress": true,
  "confidence": 0.75,
  "features": ["eyebrow tension", "lip compression", "facial tension"]
}
```

### Extended Analysis Format

```json
{
  "stress": true,
  "confidence": 0.75,
  "features": ["eyebrow tension", "lip compression"],
  "timeline": [
    {
      "stress": false,
      "confidence": 0.2,
      "timestamp": 1640995200000
    },
    {
      "stress": true,
      "confidence": 0.8,
      "timestamp": 1640995201000
    }
  ],
  "feedback": "Moderate stress detected. Focus on staying calm and confident in your responses."
}
```

## Integration with MOC-PULSE

### Database Schema

The stress analysis data is automatically saved to Firebase with each interview response:

```typescript
{
  // ... other fields
  stressAnalysis: {
    stress: boolean,
    confidence: number,
    features: string[],
    timeline: Array<{stress: boolean, confidence: number, timestamp: number}>,
    feedback: string
  }
}
```

### Interview Flow Integration

1. **Pre-Interview**: User enables webcam
2. **Calibration**: 5-second baseline capture when recording starts
3. **Detection**: Real-time stress monitoring during answers
4. **Analysis**: Stress data included in AI feedback generation
5. **Storage**: Results saved with interview responses

## Demo and Testing

### Access the Demo

Visit `http://localhost:5174/stress-demo` to test the stress detection system.

### Demo Features

- Live webcam feed
- Real-time stress detection
- Calibration progress indicator
- Stress indicator visualization
- Technical details and usage instructions

### Testing Scenarios

1. **Neutral Expression**: Maintain relaxed face during calibration
2. **Stress Simulation**: Try frowning, raising eyebrows, or showing concern
3. **False Positive Testing**: Make natural expressions to test baseline filtering
4. **Temporal Smoothing**: Quick expression changes should be filtered out

## Performance Considerations

### Optimization Features

- **Lightweight Models**: Uses TinyFaceDetector for fast processing
- **Efficient Sampling**: 3 FPS detection rate balances accuracy and performance
- **Memory Management**: Automatic cleanup of old detection data
- **Error Handling**: Graceful degradation when face detection fails

### Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (with WebRTC permissions)
- **Edge**: Full support

## Troubleshooting

### Common Issues

1. **Camera Permission Denied**
   - Ensure browser has camera permissions
   - Check system privacy settings

2. **Models Not Loading**
   - Verify `/models` directory contains face-api.js models
   - Check network connectivity

3. **Poor Detection Accuracy**
   - Ensure good lighting conditions
   - Position face clearly in camera view
   - Complete full calibration process

### Debug Information

Enable debug logging by setting:
```javascript
localStorage.setItem('debug-stress-detection', 'true');
```

## Future Enhancements

### Planned Features

1. **Advanced Calibration**: Multiple baseline captures for different lighting
2. **Stress Patterns**: Recognition of stress progression patterns
3. **Environmental Adaptation**: Automatic adjustment for lighting changes
4. **Multi-face Support**: Detection in group interview scenarios

### Performance Improvements

1. **WebWorker Integration**: Move detection to background thread
2. **Model Optimization**: Custom lightweight models for stress detection
3. **Caching**: Intelligent baseline caching across sessions

## API Reference

### StressDetector Class

```typescript
class StressDetector {
  async initialize(videoElement: HTMLVideoElement): Promise<boolean>
  async startCalibration(): Promise<boolean>
  startDetection(): boolean
  stopDetection(): void
  getCurrentStressLevel(): StressDetectionResult
  getDetectionStats(): DetectionStats
  reset(): void
}
```

### StressDetectionResult Interface

```typescript
interface StressDetectionResult {
  stress: boolean;
  confidence: number;
  features: string[];
  rawData?: {
    baseline: FaceExpressions | null;
    current: FaceExpressions | null;
    deviations: Record<string, number>;
  };
}
```

## Contributing

When contributing to the stress detection system:

1. Maintain the baseline calibration approach
2. Preserve temporal smoothing for stability
3. Add comprehensive tests for new features
4. Update documentation for API changes
5. Consider performance impact of modifications

## License

This stress detection implementation is part of the MOC-PULSE project and follows the same licensing terms.