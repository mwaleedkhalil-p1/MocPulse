import * as faceapi from 'face-api.js';

// Define our own expression type for baseline calculations
type ExpressionValues = {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
};

export interface StressDetectionResult {
  stress: boolean;
  confidence: number;
  features: string[];
  rawData?: {
    baseline: ExpressionValues | null;
    current: faceapi.FaceExpressions | null;
    deviations: Record<string, number>;
  };
}

export interface BaselineCalibration {
  expressions: faceapi.FaceExpressions[];
  averageExpressions: ExpressionValues;
  timestamp: number;
}

export class StressDetector {
  private baseline: BaselineCalibration | null = null;
  private isCalibrating: boolean = false;
  private isDetecting: boolean = false;
  private video: HTMLVideoElement | null = null;
  private calibrationSamples: faceapi.FaceExpressions[] = [];
  private detectionHistory: StressDetectionResult[] = [];
  private detectionInterval: number | null = null;
  
  // Configuration
  private readonly CALIBRATION_DURATION = 5000; // 5 seconds
  private readonly CALIBRATION_SAMPLES_TARGET = 15; // ~3 samples per second
  private readonly STRESS_THRESHOLD = 0.15; // Lower threshold for more sensitivity
  private readonly CONFIDENCE_THRESHOLD = 0.4; // Lower threshold for quicker detection
  private readonly SMOOTHING_WINDOW = 3; // Reduced window for faster response
  private readonly DETECTION_INTERVAL = 100; // ~10 FPS for real-time detection

  // Stress-related expressions (higher values indicate stress)
  private readonly STRESS_EXPRESSIONS = {
    angry: 1.0,      // Direct stress indicator
    fearful: 1.0,    // Direct stress indicator  
    sad: 0.8,        // Moderate stress indicator
    disgusted: 0.7,  // Moderate stress indicator
    surprised: 0.3,  // Mild stress indicator (can indicate anxiety)
  };

  constructor() {
    this.reset();
  }

  /**
   * Initialize the stress detector with a video element
   */
  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      this.video = videoElement;
      
      // Ensure face-api models are loaded
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        console.log('Loading face-api models for stress detection...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing stress detector:', error);
      return false;
    }
  }

  /**
   * Start baseline calibration process
   */
  async startCalibration(): Promise<boolean> {
    if (!this.video || this.isCalibrating) {
      console.warn('Cannot start calibration: video not available or already calibrating');
      return false;
    }

    // Check if video is ready
    if (this.video.readyState < 2) {
      console.warn('Video not ready for calibration');
      return false;
    }

    try {
      this.isCalibrating = true;
      this.calibrationSamples = [];
      
      console.log('Starting stress detection baseline calibration...');
      
      // Test face detection first
      try {
        const testDetection = await faceapi
          .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
          .withFaceExpressions();
        
        if (!testDetection) {
          console.warn('No face detected in initial test - please ensure face is visible');
          this.isCalibrating = false;
          return false;
        }
        
        console.log('Face detection test successful, starting calibration');
      } catch (testError) {
        console.error('Face detection test failed:', testError);
        this.isCalibrating = false;
        return false;
      }
      
      // Collect samples for calibration
      const calibrationPromise = new Promise<boolean>((resolve) => {
        const startTime = Date.now();
        const sampleInterval = this.CALIBRATION_DURATION / this.CALIBRATION_SAMPLES_TARGET;
        let samplesCollected = 0;
        
        const collectSample = async () => {
          if (!this.isCalibrating || !this.video) {
            console.log('Calibration stopped or video unavailable');
            resolve(false);
            return;
          }

          const elapsed = Date.now() - startTime;
          
          if (elapsed >= this.CALIBRATION_DURATION) {
            // Calibration complete
            console.log(`Calibration completed. Collected ${samplesCollected} samples out of ${this.CALIBRATION_SAMPLES_TARGET} target`);
            this.finishCalibration();
            resolve(samplesCollected > 0);
            return;
          }

          // Collect sample
          try {
            const detection = await faceapi
              .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
              .withFaceExpressions();

            if (detection && detection.expressions) {
              this.calibrationSamples.push(detection.expressions);
              samplesCollected++;
              console.log(`Calibration sample ${samplesCollected}/${this.CALIBRATION_SAMPLES_TARGET} collected`);
            } else {
              console.warn('No face detected in calibration sample');
            }
          } catch (error) {
            console.warn('Error during calibration sample collection:', error);
          }

          // Schedule next sample
          setTimeout(collectSample, sampleInterval);
        };

        collectSample();
      });

      return await calibrationPromise;
    } catch (error) {
      console.error('Error during calibration:', error);
      this.isCalibrating = false;
      return false;
    }
  }

  /**
   * Finish calibration and compute baseline
   */
  private finishCalibration(): void {
    if (this.calibrationSamples.length === 0) {
      console.warn('No calibration samples collected - calibration failed');
      this.isCalibrating = false;
      return;
    }

    if (this.calibrationSamples.length < 3) {
      console.warn(`Only ${this.calibrationSamples.length} calibration samples collected (minimum 3 recommended)`);
    }

    // Calculate average expressions for baseline
    const avgExpressions: ExpressionValues = {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0
    };

    // Sum all expressions
    this.calibrationSamples.forEach(expressions => {
      avgExpressions.neutral += expressions.neutral;
      avgExpressions.happy += expressions.happy;
      avgExpressions.sad += expressions.sad;
      avgExpressions.angry += expressions.angry;
      avgExpressions.fearful += expressions.fearful;
      avgExpressions.disgusted += expressions.disgusted;
      avgExpressions.surprised += expressions.surprised;
    });

    // Calculate averages
    const sampleCount = this.calibrationSamples.length;
    avgExpressions.neutral /= sampleCount;
    avgExpressions.happy /= sampleCount;
    avgExpressions.sad /= sampleCount;
    avgExpressions.angry /= sampleCount;
    avgExpressions.fearful /= sampleCount;
    avgExpressions.disgusted /= sampleCount;
    avgExpressions.surprised /= sampleCount;

    this.baseline = {
      expressions: [...this.calibrationSamples],
      averageExpressions: avgExpressions,
      timestamp: Date.now()
    };

    this.isCalibrating = false;
    console.log(`Stress detection baseline established with ${sampleCount} samples`);
    console.log('Baseline averages:', avgExpressions);
  }

  /**
   * Start real-time stress detection
   */
  startDetection(): boolean {
    if (!this.video || !this.baseline || this.isDetecting) {
      return false;
    }

    this.isDetecting = true;
    this.detectionHistory = [];

    this.detectionInterval = window.setInterval(() => {
      this.detectStress();
    }, this.DETECTION_INTERVAL);

    console.log('Stress detection started');
    return true;
  }

  /**
   * Stop stress detection
   */
  stopDetection(): void {
    this.isDetecting = false;
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  /**
   * Stop calibration
   */
  stopCalibration(): void {
    this.isCalibrating = false;
  }

  /**
   * Perform stress detection on current frame
   */
  private async detectStress(): Promise<void> {
    if (!this.isDetecting || !this.video || !this.baseline) {
      return;
    }

    try {
      const detection = await faceapi
        .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
        .withFaceExpressions();

      if (!detection || !detection.expressions) {
        // console.warn('No face detected during stress detection');
        return;
      }

      const result = this.analyzeStress(detection.expressions);
      this.detectionHistory.push(result);

      // Keep only recent history for smoothing
      if (this.detectionHistory.length > this.SMOOTHING_WINDOW * 2) {
        this.detectionHistory = this.detectionHistory.slice(-this.SMOOTHING_WINDOW * 2);
      }

    } catch (error) {
      console.warn('Error during stress detection:', error);
    }
  }

  /**
   * Analyze stress based on expression deviations from baseline
   */
  private analyzeStress(currentExpressions: faceapi.FaceExpressions): StressDetectionResult {
    if (!this.baseline) {
      return {
        stress: false,
        confidence: 0,
        features: []
      };
    }

    const baseline = this.baseline.averageExpressions;
    const deviations: Record<string, number> = {};
    const features: string[] = [];
    let stressScore = 0;
    let totalWeight = 0;

    // Calculate deviations for stress-related expressions
    Object.entries(this.STRESS_EXPRESSIONS).forEach(([expression, weight]) => {
      const expressionKey = expression as keyof ExpressionValues;
      const currentValue = currentExpressions[expressionKey];
      const baselineValue = baseline[expressionKey];
      const deviation = currentValue - baselineValue;
      
      deviations[expression] = deviation;

      // Only consider positive deviations (increases in stress expressions)
      if (deviation > this.STRESS_THRESHOLD) {
        stressScore += deviation * weight;
        totalWeight += weight;

        // Add specific features based on expression
        switch (expression) {
          case 'angry':
            features.push('eyebrow tension', 'jaw clenching');
            break;
          case 'fearful':
            features.push('eye widening', 'facial tension');
            break;
          case 'sad':
            features.push('lip compression', 'downturned mouth');
            break;
          case 'disgusted':
            features.push('nose wrinkling', 'upper lip tension');
            break;
          case 'surprised':
            features.push('raised eyebrows', 'eye tension');
            break;
        }
      }
    });

    // Calculate confidence based on weighted average
    const confidence = totalWeight > 0 ? Math.min(stressScore / totalWeight, 1.0) : 0;
    const isStressed = confidence >= this.CONFIDENCE_THRESHOLD;

    return {
      stress: isStressed,
      confidence: Math.round(confidence * 100) / 100,
      features: [...new Set(features)], // Remove duplicates
      rawData: {
        baseline: baseline,
        current: currentExpressions,
        deviations: deviations
      }
    };
  }

  /**
   * Get instant stress detection result (no smoothing) for immediate feedback
   */
  getInstantStressLevel(): StressDetectionResult {
    if (this.detectionHistory.length === 0) {
      return {
        stress: false,
        confidence: 0,
        features: []
      };
    }

    // Return the most recent detection result
    return this.detectionHistory[this.detectionHistory.length - 1];
  }

  /**
   * Get current stress detection result with temporal smoothing
   */
  getCurrentStressLevel(): StressDetectionResult {
    if (this.detectionHistory.length === 0) {
      return {
        stress: false,
        confidence: 0,
        features: []
      };
    }

    // For real-time responsiveness, prioritize recent detections
    const recentResults = this.detectionHistory.slice(-this.SMOOTHING_WINDOW);
    
    // Use weighted average giving more weight to recent detections
    let weightedConfidence = 0;
    let totalWeight = 0;
    
    recentResults.forEach((result, index) => {
      const weight = index + 1; // More recent = higher weight
      weightedConfidence += result.confidence * weight;
      totalWeight += weight;
    });
    
    const avgConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;
    
    // For immediate response, also check the most recent detection
    const mostRecent = recentResults[recentResults.length - 1];
    const hasRecentStress = mostRecent && mostRecent.stress && mostRecent.confidence > 0.5;
    
    // Stress is detected if:
    // 1. Most recent detection shows high confidence stress, OR
    // 2. Majority of recent frames indicate stress
    const stressCount = recentResults.filter(result => result.stress).length;
    const majorityStress = stressCount > (this.SMOOTHING_WINDOW / 2);
    const smoothedStress = hasRecentStress || majorityStress;
    
    // Combine all features from recent frames
    const allFeatures = recentResults.flatMap(result => result.features);
    const uniqueFeatures = [...new Set(allFeatures)];

    return {
      stress: smoothedStress,
      confidence: Math.round(avgConfidence * 100) / 100,
      features: uniqueFeatures
    };
  }

  /**
   * Get calibration progress (0-1)
   */
  getCalibrationProgress(): number {
    if (!this.isCalibrating) {
      return this.baseline ? 1 : 0;
    }
    
    return Math.min(this.calibrationSamples.length / this.CALIBRATION_SAMPLES_TARGET, 1);
  }

  /**
   * Check if baseline is established
   */
  isBaselineReady(): boolean {
    return this.baseline !== null;
  }

  /**
   * Check if currently calibrating
   */
  isCalibrationActive(): boolean {
    return this.isCalibrating;
  }

  /**
   * Check if detection is active
   */
  isDetectionActive(): boolean {
    return this.isDetecting;
  }

  /**
   * Reset the detector
   */
  reset(): void {
    this.stopDetection();
    this.stopCalibration();
    this.baseline = null;
    this.calibrationSamples = [];
    this.detectionHistory = [];
  }

  /**
   * Get detection statistics
   */
  getDetectionStats(): {
    totalDetections: number;
    stressDetections: number;
    averageConfidence: number;
    baselineAge: number;
  } {
    const stressDetections = this.detectionHistory.filter(r => r.stress).length;
    const avgConfidence = this.detectionHistory.length > 0 
      ? this.detectionHistory.reduce((sum, r) => sum + r.confidence, 0) / this.detectionHistory.length 
      : 0;
    
    return {
      totalDetections: this.detectionHistory.length,
      stressDetections,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      baselineAge: this.baseline ? Date.now() - this.baseline.timestamp : 0
    };
  }
}