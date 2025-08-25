import * as faceapi from 'face-api.js';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, Results } from '@mediapipe/pose';
import { EmotionAnalysis, GestureAnalysis, ToneAnalysis, StressAnalysis } from '@/types';
import { StressDetector, StressDetectionResult } from './stress-detector';


export const initFaceModels = async () => {
  try {
    await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')]
    );
    console.log('Face-api models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading face-api models:', error);
    return false;
  }
};


export class ToneAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;

  private isAnalyzing: boolean = false;
  private pitchValues: number[] = [];
  private wordCount: number = 0;
  private startTime: number = 0;
  private confidenceScore: number = 50;

  constructor() {
    this.startTime = Date.now();
  }

  async start(stream: MediaStream) {
    try {
      this.audioContext = new AudioContext();
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 2048;

      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyzer);

      const bufferLength = this.analyzer.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.isAnalyzing = true;
      this.startTime = Date.now();
      this.analyze();

      return true;
    } catch (error) {
      console.error('Error starting tone analysis:', error);
      return false;
    }
  }

  stop() {
    this.isAnalyzing = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyzer = null;
    this.microphone = null;
    this.dataArray = null;
  }


  processSpeech(text: string) {
    const words = text.trim().split(/\s+/);
    this.wordCount = words.length;
  }


  updateConfidence(value: number) {
    this.confidenceScore = Math.max(0, Math.min(100, this.confidenceScore + value));
  }

  private analyze() {
    if (!this.isAnalyzing || !this.analyzer || !this.dataArray) return;


    this.analyzer.getByteFrequencyData(this.dataArray);


    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const averageFrequency = sum / this.dataArray.length;


    const normalizedPitch = Math.min(100, averageFrequency / 255 * 100);
    this.pitchValues.push(normalizedPitch);


    if (this.pitchValues.length > 100) {
      this.pitchValues.shift();
    }


    requestAnimationFrame(() => this.analyze());
  }

  getAnalysis(): ToneAnalysis {

    const avgPitch = this.pitchValues.length > 0 ?
    this.pitchValues.reduce((a, b) => a + b, 0) / this.pitchValues.length :
    50;


    const durationMinutes = (Date.now() - this.startTime) / 60000;
    const speed = durationMinutes > 0 ? Math.round(this.wordCount / durationMinutes) : 0;


    let confidence: "confident" | "hesitant" | "authoritative" | "nervous" | "enthusiastic" = "hesitant";
    if (this.confidenceScore > 80) confidence = "confident";else
    if (this.confidenceScore > 60) confidence = "enthusiastic";else
    if (this.confidenceScore > 40) confidence = "authoritative";else
    if (this.confidenceScore > 20) confidence = "hesitant";else
    confidence = "nervous";


    let feedback = "";
    if (avgPitch > 75) feedback = "Try lowering your pitch for a more authoritative tone.";else
    if (avgPitch < 25) feedback = "Try varying your pitch more to sound more engaging.";else
    if (speed > 160) feedback = "Consider slowing down to improve clarity.";else
    if (speed < 100) feedback = "Try speaking a bit faster to maintain engagement.";else
    feedback = "Your tone is well-balanced. Maintain this level of delivery.";

    return {
      pitch: Math.round(avgPitch),
      speed,
      confidence,
      feedback
    };
  }
}


export class EmotionAnalyzer {
  private isAnalyzing: boolean = false;
  private emotionTimeline: Array<{emotion: string;timestamp: number;}> = [];
  private detectionInterval: number | null = null;
  private video: HTMLVideoElement | null = null;

  async start(video: HTMLVideoElement) {
    try {
      this.video = video;
      this.isAnalyzing = true;


      this.detectionInterval = window.setInterval(() => {
        this.detectEmotions();
      }, 1000) as unknown as number;

      return true;
    } catch (error) {
      console.error('Error starting emotion analysis:', error);
      return false;
    }
  }

  stop() {
    this.isAnalyzing = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  private async detectEmotions() {
    if (!this.isAnalyzing || !this.video) return;

    try {
      const detections = await faceapi.detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions()).
      withFaceLandmarks().
      withFaceExpressions();

      if (detections && detections.length > 0) {
        const expressions = detections[0].expressions;


        let dominantEmotion = 'neutral';
        let maxScore = expressions.neutral;

        if (expressions.happy > maxScore) {
          dominantEmotion = 'happiness';
          maxScore = expressions.happy;
        }
        if (expressions.sad > maxScore) {
          dominantEmotion = 'sadness';
          maxScore = expressions.sad;
        }
        if (expressions.angry > maxScore) {
          dominantEmotion = 'anger';
          maxScore = expressions.angry;
        }
        if (expressions.surprised > maxScore) {
          dominantEmotion = 'surprise';
          maxScore = expressions.surprised;
        }
        if (expressions.fearful > maxScore) {
          dominantEmotion = 'frustration';
          maxScore = expressions.fearful;
        }


        this.emotionTimeline.push({
          emotion: dominantEmotion,
          timestamp: Date.now()
        });


        if (this.emotionTimeline.length > 60) {
          this.emotionTimeline.shift();
        }
      }
    } catch (error) {
      console.error('Error detecting emotions:', error);
    }
  }

  getAnalysis(): EmotionAnalysis {

    let primary: "happiness" | "sadness" | "anger" | "surprise" | "frustration" | "neutral" = "neutral";
    let intensity = 50;
    let feedback = "Maintain consistent emotional engagement throughout your answer.";


    if (this.emotionTimeline.length > 0) {
      const emotionCounts: Record<string, number> = {
        happiness: 0,
        sadness: 0,
        anger: 0,
        surprise: 0,
        frustration: 0,
        neutral: 0
      };

      this.emotionTimeline.forEach((item) => {
        if (emotionCounts[item.emotion] !== undefined) {
          emotionCounts[item.emotion]++;
        }
      });


      let maxCount = 0;
      let dominantEmotion = "neutral";
      Object.entries(emotionCounts).forEach(([emotion, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      });

      primary = dominantEmotion as "happiness" | "sadness" | "anger" | "surprise" | "frustration" | "neutral";


      intensity = Math.round(maxCount / this.emotionTimeline.length * 100);


      if (dominantEmotion === "neutral" && intensity > 70) {
        feedback = "Try to show more emotional engagement to connect better with your audience.";
      } else if (dominantEmotion === "happiness" && intensity > 70) {
        feedback = "Your positive demeanor is excellent, but vary your expressions for key points.";
      } else if (dominantEmotion === "sadness" || dominantEmotion === "anger") {
        feedback = "Try to maintain a more positive emotional tone during your responses.";
      } else if (emotionCounts["neutral"] < 10) {
        feedback = "Your emotional expressiveness is good. Continue to match emotions to content.";
      }
    }

    return {
      primary,
      intensity,
      timeline: this.emotionTimeline,
      feedback
    };
  }
}


export class GestureAnalyzer {
  private pose: Pose | null = null;
  private camera: Camera | null = null;
  private isAnalyzing: boolean = false;
  private postureSamples: string[] = [];
  private handMovementSamples: string[] = [];
  private facialEngagementSamples: string[] = [];
  private bodyLanguageSamples: string[] = [];

  async start(video: HTMLVideoElement) {
    try {

      this.pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.pose.onResults((results) => {
        this.processResults(results);
      });


      this.camera = new Camera(video, {
        onFrame: async () => {
          if (this.pose && this.isAnalyzing) {
            await this.pose.send({ image: video });
          }
        },
        width: 640,
        height: 480
      });

      this.isAnalyzing = true;
      await this.camera.start();

      return true;
    } catch (error) {
      console.error('Error starting gesture analysis:', error);
      return false;
    }
  }

  stop() {
    this.isAnalyzing = false;
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    this.pose = null;
  }

  private processResults(results: Results) {
    if (!results.poseLandmarks) return;


    this.analyzePosture(results.poseLandmarks);


    this.analyzeHandMovements(results.poseLandmarks);


    this.analyzeFacialEngagement(results.poseLandmarks);


    this.analyzeBodyLanguage(results.poseLandmarks);
  }

  private analyzePosture(landmarks: any[]) {

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (leftShoulder && rightShoulder) {
      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);

      if (shoulderDiff < 0.05) {
        this.postureSamples.push('good');
      } else {
        this.postureSamples.push('poor');
      }


      if (this.postureSamples.length > 30) {
        this.postureSamples.shift();
      }
    }
  }

  private analyzeHandMovements(landmarks: any[]) {

    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];

    if (leftWrist && rightWrist && leftElbow && rightElbow) {

      const leftMovement = Math.sqrt(
        Math.pow(leftWrist.x - leftElbow.x, 2) +
        Math.pow(leftWrist.y - leftElbow.y, 2)
      );

      const rightMovement = Math.sqrt(
        Math.pow(rightWrist.x - rightElbow.x, 2) +
        Math.pow(rightWrist.y - rightElbow.y, 2)
      );

      const totalMovement = leftMovement + rightMovement;

      if (totalMovement < 0.2) {
        this.handMovementSamples.push('minimal');
      } else if (totalMovement < 0.5) {
        this.handMovementSamples.push('moderate');
      } else {
        this.handMovementSamples.push('excessive');
      }


      if (this.handMovementSamples.length > 30) {
        this.handMovementSamples.shift();
      }
    }
  }

  private analyzeFacialEngagement(landmarks: any[]) {

    const nose = landmarks[0];
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];

    if (nose && leftEye && rightEye) {
      const visibility = (nose.visibility + leftEye.visibility + rightEye.visibility) / 3;

      if (visibility > 0.8) {
        this.facialEngagementSamples.push('high');
      } else if (visibility > 0.5) {
        this.facialEngagementSamples.push('moderate');
      } else {
        this.facialEngagementSamples.push('low');
      }


      if (this.facialEngagementSamples.length > 30) {
        this.facialEngagementSamples.shift();
      }
    }
  }

  private analyzeBodyLanguage(landmarks: any[]) {

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];

    if (leftShoulder && rightShoulder && leftElbow && rightElbow) {

      const leftArmAngle = Math.atan2(
        leftElbow.y - leftShoulder.y,
        leftElbow.x - leftShoulder.x
      );

      const rightArmAngle = Math.atan2(
        rightElbow.y - rightShoulder.y,
        rightElbow.x - rightShoulder.x
      );


      if (leftArmAngle * rightArmAngle < 0) {
        this.bodyLanguageSamples.push('open');
      } else {
        this.bodyLanguageSamples.push('closed');
      }


      if (this.bodyLanguageSamples.length > 30) {
        this.bodyLanguageSamples.shift();
      }
    }
  }

  getAnalysis(): GestureAnalysis {

    const getMostFrequent = (samples: string[]) => {
      if (samples.length === 0) return 'neutral';

      const counts: Record<string, number> = {};
      let maxCount = 0;
      let mostFrequent = 'neutral';

      samples.forEach((sample) => {
        counts[sample] = (counts[sample] || 0) + 1;
        if (counts[sample] > maxCount) {
          maxCount = counts[sample];
          mostFrequent = sample;
        }
      });

      return mostFrequent;
    };

    const posture = getMostFrequent(this.postureSamples) as "good" | "poor" | "neutral";
    const handMovements = getMostFrequent(this.handMovementSamples) as "minimal" | "moderate" | "excessive";
    const facialEngagement = getMostFrequent(this.facialEngagementSamples) as "high" | "low" | "moderate";
    const bodyLanguage = getMostFrequent(this.bodyLanguageSamples) as "open" | "closed" | "neutral";


    let feedback = "";

    if (posture === "poor") {
      feedback = "Try to maintain a straight posture with shoulders level.";
    } else if (handMovements === "minimal") {
      feedback = "Use more hand gestures to emphasize key points in your answer.";
    } else if (handMovements === "excessive") {
      feedback = "Reduce excessive hand movements as they may distract from your message.";
    } else if (facialEngagement === "low") {
      feedback = "Increase facial expressions to appear more engaged and confident.";
    } else if (bodyLanguage === "closed") {
      feedback = "Adopt a more open posture to appear more confident and approachable.";
    } else {
      feedback = "Your body language is effective. Continue to match gestures with your message.";
    }

    return {
      posture,
      handMovements,
      facialEngagement,
      bodyLanguage,
      feedback
    };
  }
}


export class StressAnalyzer {
  private stressDetector: StressDetector;
  private isAnalyzing: boolean = false;
  private stressTimeline: Array<{stress: boolean;confidence: number;timestamp: number;}> = [];
  private video: HTMLVideoElement | null = null;

  constructor() {
    this.stressDetector = new StressDetector();
  }

  async start(video: HTMLVideoElement) {
    try {
      this.video = video;
      
      // Initialize the stress detector
      const initialized = await this.stressDetector.initialize(video);
      if (!initialized) {
        throw new Error('Failed to initialize stress detector');
      }

      // Start calibration automatically
      const calibrated = await this.stressDetector.startCalibration();
      if (!calibrated) {
        throw new Error('Failed to calibrate stress detector');
      }

      // Start detection
      const detectionStarted = this.stressDetector.startDetection();
      if (!detectionStarted) {
        throw new Error('Failed to start stress detection');
      }

      this.isAnalyzing = true;
      this.startTimelineTracking();
      
      return true;
    } catch (error) {
      console.error('Error starting stress analysis:', error);
      return false;
    }
  }

  stop() {
    this.isAnalyzing = false;
    this.stressDetector.reset();
  }

  private startTimelineTracking() {
    if (!this.isAnalyzing) return;

    // Track stress levels every second
    const trackingInterval = setInterval(() => {
      if (!this.isAnalyzing) {
        clearInterval(trackingInterval);
        return;
      }

      const currentStress = this.stressDetector.getCurrentStressLevel();
      this.stressTimeline.push({
        stress: currentStress.stress,
        confidence: currentStress.confidence,
        timestamp: Date.now()
      });

      // Keep only last 5 minutes of data
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      this.stressTimeline = this.stressTimeline.filter(
        entry => entry.timestamp > fiveMinutesAgo
      );
    }, 1000);
  }

  getAnalysis(): StressAnalysis {
    const currentStress = this.stressDetector.getCurrentStressLevel();
    const stats = this.stressDetector.getDetectionStats();
    
    // Calculate overall stress level
    const stressEvents = this.stressTimeline.filter(entry => entry.stress).length;
    const totalEvents = this.stressTimeline.length;
    const stressPercentage = totalEvents > 0 ? stressEvents / totalEvents : 0;
    
    // Generate feedback based on stress analysis
    let feedback = "";
    if (stressPercentage > 0.7) {
      feedback = "High stress levels detected throughout the interview. Try deep breathing and relaxation techniques.";
    } else if (stressPercentage > 0.4) {
      feedback = "Moderate stress detected. Focus on staying calm and confident in your responses.";
    } else if (stressPercentage > 0.2) {
      feedback = "Some stress indicators observed. This is normal - try to maintain composure.";
    } else {
      feedback = "Excellent stress management! You maintained composure throughout the interview.";
    }

    return {
      stress: currentStress.stress,
      confidence: currentStress.confidence,
      features: currentStress.features,
      timeline: this.stressTimeline,
      feedback
    };
  }

  getCurrentStressLevel(): StressDetectionResult {
    return this.stressDetector.getCurrentStressLevel();
  }

  isBaselineReady(): boolean {
    return this.stressDetector.isBaselineReady();
  }

  isDetectionActive(): boolean {
    return this.stressDetector.isDetectionActive();
  }
}


export class AnalysisManager {
  private toneAnalyzer: ToneAnalyzer;
  private emotionAnalyzer: EmotionAnalyzer;
  private gestureAnalyzer: GestureAnalyzer;
  private stressAnalyzer: StressAnalyzer;
  private isAnalyzing: boolean = false;

  constructor() {
    this.toneAnalyzer = new ToneAnalyzer();
    this.emotionAnalyzer = new EmotionAnalyzer();
    this.gestureAnalyzer = new GestureAnalyzer();
    this.stressAnalyzer = new StressAnalyzer();
  }

  async start(videoElement: HTMLVideoElement, audioStream: MediaStream) {
    try {

      await initFaceModels();


      await Promise.all([
      this.toneAnalyzer.start(audioStream),
      this.emotionAnalyzer.start(videoElement),
      this.gestureAnalyzer.start(videoElement),
      this.stressAnalyzer.start(videoElement)]
      );

      this.isAnalyzing = true;
      return true;
    } catch (error) {
      console.error('Error starting analysis:', error);
      return false;
    }
  }

  stop() {
    this.toneAnalyzer.stop();
    this.emotionAnalyzer.stop();
    this.gestureAnalyzer.stop();
    this.stressAnalyzer.stop();
    this.isAnalyzing = false;
  }

  updateSpeechText(text: string) {

    this.toneAnalyzer.processSpeech(text);
  }

  getAnalysisResults() {
    return {
      toneAnalysis: this.toneAnalyzer.getAnalysis(),
      emotionAnalysis: this.emotionAnalyzer.getAnalysis(),
      gestureAnalysis: this.gestureAnalyzer.getAnalysis(),
      stressAnalysis: this.stressAnalyzer.getAnalysis()
    };
  }

  isActive() {
    return this.isAnalyzing;
  }
}

// Export stress detection components
export { StressDetector, type StressDetectionResult } from './stress-detector';