import * as faceapi from 'face-api.js';

export interface StressDetectionResult {
  stress: boolean;
  confidence: number;
  features: string[];
  rawData?: {
    baseline: faceapi.FaceExpressions | null;
    current: faceapi.FaceExpressions | null;
    deviations: Record<string, number>;
  };
}

export interface BaselineCalibration {
  expressions: faceapi.FaceExpressions[];
  averageExpressions: faceapi.FaceExpressions;
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
  private readonly STRESS_THRESHOLD = 0.25; // Minimum deviation to consider stress
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence for stress detection
  private readonly SMOOTHING_WINDOW = 5; // Number of frames for temporal smoothing
  private readonly DETECTION_INTERVAL = 333; // ~3 FPS for detection

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
      return false;
    }

    try {
      this.isCalibrating = true;
      this.calibrationSamples = [];
      
      console.log('Starting stress detection baseline calibration...');
      
      // Collect samples for calibration
      const calibrationPromise = new Promise<boolean>((resolve) => {
        const startTime = Date.now();
        const sampleInterval = this.CALIBRATION_DURATION / this.CALIBRATION_SAMPLES_TARGET;
        
        const collectSample = async () => {
          if (!this.isCalibrating || !this.video) {
            resolve(false);
            return;
          }

          const elapsed = Date.now() - startTime;
          
          if (elapsed >= this.CALIBRATION_DURATION) {
            // Calibration complete
            this.finishCalibration();
            resolve(true);
            return;
          }

          // Collect sample
          try {
            const detection = await faceapi
              .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
              .withFaceExpressions();

            if (detection && detection.expressions) {
              this.calibrationSamples.push(detection.expressions);
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
      console.warn('No calibration samples collected');
      this.isCalibrating = false;
      return;
    }

    // Calculate average expressions for baseline
    const avgExpressions: faceapi.FaceExpressions = {
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
      Object.keys(avgExpressions).forEach(key => {
        avgExpressions[key as keyof faceapi.FaceExpressions] += 
          expressions[key as keyof faceapi.FaceExpressions];
      });
    });

    // Calculate averages
    const sampleCount = this.calibrationSamples.length;
    Object.keys(avgExpressions).forEach(key => {
      avgExpressions[key as keyof faceapi.FaceExpressions] /= sampleCount;
    });

    this.baseline = {
      expressions: [...this.calibrationSamples],
      averageExpressions: avgExpressions,
      timestamp: Date.now()
    };

    this.isCalibrating = false;
    console.log(`Stress detection baseline established with ${sampleCount} samples`);
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
        .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (!detection || !detection.expressions) {
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
      const currentValue = currentExpressions[expression as keyof faceapi.FaceExpressions];
      const baselineValue = baseline[expression as keyof faceapi.FaceExpressions];
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

    // Apply temporal smoothing over recent frames
    const recentResults = this.detectionHistory.slice(-this.SMOOTHING_WINDOW);
    
    // Calculate smoothed confidence
    const avgConfidence = recentResults.reduce((sum, result) => sum + result.confidence, 0) / recentResults.length;
    
    // Stress is detected if majority of recent frames indicate stress
    const stressCount = recentResults.filter(result => result.stress).length;
    const smoothedStress = stressCount > (this.SMOOTHING_WINDOW / 2);
    
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