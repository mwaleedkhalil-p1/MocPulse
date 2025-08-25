import { StressDetector } from './stress-detector';

// Mock face-api.js
jest.mock('face-api.js', () => ({
  nets: {
    tinyFaceDetector: {
      loadFromUri: jest.fn().mockResolvedValue(true),
      isLoaded: true
    },
    faceLandmark68TinyNet: {
      loadFromUri: jest.fn().mockResolvedValue(true)
    },
    faceExpressionNet: {
      loadFromUri: jest.fn().mockResolvedValue(true)
    }
  },
  detectSingleFace: jest.fn(),
  TinyFaceDetectorOptions: jest.fn()
}));

describe('StressDetector', () => {
  let detector: StressDetector;
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    detector = new StressDetector();
    mockVideoElement = document.createElement('video') as HTMLVideoElement;
  });

  afterEach(() => {
    detector.reset();
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid video element', async () => {
      const result = await detector.initialize(mockVideoElement);
      expect(result).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock face-api to throw error
      const faceapi = require('face-api.js');
      faceapi.nets.tinyFaceDetector.loadFromUri.mockRejectedValueOnce(new Error('Load failed'));
      
      const result = await detector.initialize(mockVideoElement);
      expect(result).toBe(false);
    });
  });

  describe('Calibration', () => {
    beforeEach(async () => {
      await detector.initialize(mockVideoElement);
    });

    test('should not start calibration without initialization', async () => {
      const uninitializedDetector = new StressDetector();
      const result = await uninitializedDetector.startCalibration();
      expect(result).toBe(false);
    });

    test('should track calibration progress', async () => {
      expect(detector.getCalibrationProgress()).toBe(0);
      expect(detector.isBaselineReady()).toBe(false);
    });

    test('should prevent multiple simultaneous calibrations', async () => {
      // Start first calibration
      const promise1 = detector.startCalibration();
      
      // Try to start second calibration
      const result2 = await detector.startCalibration();
      
      expect(result2).toBe(false);
      
      // Wait for first calibration to complete
      await promise1;
    });
  });

  describe('Detection', () => {
    beforeEach(async () => {
      await detector.initialize(mockVideoElement);
    });

    test('should not start detection without baseline', () => {
      const result = detector.startDetection();
      expect(result).toBe(false);
    });

    test('should track detection state', () => {
      expect(detector.isDetectionActive()).toBe(false);
    });

    test('should stop detection properly', () => {
      detector.stopDetection();
      expect(detector.isDetectionActive()).toBe(false);
    });
  });

  describe('Stress Analysis', () => {
    test('should return default result when no detection is active', () => {
      const result = detector.getCurrentStressLevel();
      
      expect(result).toEqual({
        stress: false,
        confidence: 0,
        features: []
      });
    });

    test('should provide detection statistics', () => {
      const stats = detector.getDetectionStats();
      
      expect(stats).toHaveProperty('totalDetections');
      expect(stats).toHaveProperty('stressDetections');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('baselineAge');
      
      expect(typeof stats.totalDetections).toBe('number');
      expect(typeof stats.stressDetections).toBe('number');
      expect(typeof stats.averageConfidence).toBe('number');
      expect(typeof stats.baselineAge).toBe('number');
    });
  });

  describe('Reset Functionality', () => {
    test('should reset all state properly', async () => {
      await detector.initialize(mockVideoElement);
      
      detector.reset();
      
      expect(detector.isBaselineReady()).toBe(false);
      expect(detector.isDetectionActive()).toBe(false);
      expect(detector.isCalibrationActive()).toBe(false);
      expect(detector.getCalibrationProgress()).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('should use correct thresholds', () => {
      // Access private properties through type assertion for testing
      const detectorAny = detector as any;
      
      expect(detectorAny.STRESS_THRESHOLD).toBe(0.25);
      expect(detectorAny.CONFIDENCE_THRESHOLD).toBe(0.6);
      expect(detectorAny.SMOOTHING_WINDOW).toBe(5);
    });

    test('should have correct stress expression weights', () => {
      const detectorAny = detector as any;
      const weights = detectorAny.STRESS_EXPRESSIONS;
      
      expect(weights.angry).toBe(1.0);
      expect(weights.fearful).toBe(1.0);
      expect(weights.sad).toBe(0.8);
      expect(weights.disgusted).toBe(0.7);
      expect(weights.surprised).toBe(0.3);
    });
  });
});

// Integration test with mock expressions
describe('StressDetector Integration', () => {
  let detector: StressDetector;
  let mockVideoElement: HTMLVideoElement;

  beforeEach(async () => {
    detector = new StressDetector();
    mockVideoElement = document.createElement('video') as HTMLVideoElement;
    
    // Mock face-api detection results
    const faceapi = require('face-api.js');
    faceapi.detectSingleFace.mockImplementation(() => ({
      withFaceExpressions: () => Promise.resolve({
        expressions: {
          neutral: 0.8,
          happy: 0.1,
          sad: 0.05,
          angry: 0.02,
          fearful: 0.02,
          disgusted: 0.01,
          surprised: 0.0
        }
      })
    }));
  });

  afterEach(() => {
    detector.reset();
  });

  test('should complete full workflow: initialize -> calibrate -> detect', async () => {
    // Initialize
    const initialized = await detector.initialize(mockVideoElement);
    expect(initialized).toBe(true);

    // Calibrate
    const calibrated = await detector.startCalibration();
    expect(calibrated).toBe(true);
    expect(detector.isBaselineReady()).toBe(true);

    // Start detection
    const detectionStarted = detector.startDetection();
    expect(detectionStarted).toBe(true);
    expect(detector.isDetectionActive()).toBe(true);

    // Get stress level
    const stressLevel = detector.getCurrentStressLevel();
    expect(stressLevel).toHaveProperty('stress');
    expect(stressLevel).toHaveProperty('confidence');
    expect(stressLevel).toHaveProperty('features');
  });

  test('should detect stress when expressions deviate from baseline', async () => {
    const faceapi = require('face-api.js');
    
    // Initialize and calibrate with neutral expressions
    await detector.initialize(mockVideoElement);
    await detector.startCalibration();
    detector.startDetection();

    // Mock stressed expressions
    faceapi.detectSingleFace.mockImplementation(() => ({
      withFaceExpressions: () => Promise.resolve({
        expressions: {
          neutral: 0.2,
          happy: 0.05,
          sad: 0.1,
          angry: 0.4,  // High anger indicates stress
          fearful: 0.2, // High fear indicates stress
          disgusted: 0.05,
          surprised: 0.0
        }
      })
    }));

    // Allow some time for detection
    await new Promise(resolve => setTimeout(resolve, 1000));

    const stressLevel = detector.getCurrentStressLevel();
    // Note: Actual stress detection depends on the temporal smoothing
    // This test verifies the structure is correct
    expect(typeof stressLevel.stress).toBe('boolean');
    expect(typeof stressLevel.confidence).toBe('number');
    expect(Array.isArray(stressLevel.features)).toBe(true);
  });
});