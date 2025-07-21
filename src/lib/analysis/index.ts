import * as faceapi from 'face-api.js';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, Results } from '@mediapipe/pose';
import { EmotionAnalysis, GestureAnalysis, ToneAnalysis } from '@/types';

// Initialize face-api models
export const initFaceModels = async () => {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models')
    ]);
    console.log('Face-api models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading face-api models:', error);
    return false;
  }
};

// Tone Analysis using Web Audio API
export class ToneAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;

  private isAnalyzing: boolean = false;
  private pitchValues: number[] = [];
  private wordCount: number = 0;
  private startTime: number = 0;
  private confidenceScore: number = 50; // Default middle value

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

  // Process speech for word count (simplified)
  processSpeech(text: string) {
    const words = text.trim().split(/\s+/);
    this.wordCount = words.length;
  }

  // Update confidence based on voice patterns
  updateConfidence(value: number) {
    this.confidenceScore = Math.max(0, Math.min(100, this.confidenceScore + value));
  }

  private analyze() {
    if (!this.isAnalyzing || !this.analyzer || !this.dataArray) return;

    // Get frequency data
    this.analyzer.getByteFrequencyData(this.dataArray);
    
    // Calculate average frequency (simplified pitch detection)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const averageFrequency = sum / this.dataArray.length;
    
    // Store pitch value (normalized to 0-100)
    const normalizedPitch = Math.min(100, (averageFrequency / 255) * 100);
    this.pitchValues.push(normalizedPitch);
    
    // Limit stored values to prevent memory issues
    if (this.pitchValues.length > 100) {
      this.pitchValues.shift();
    }
    
    // Continue analyzing
    requestAnimationFrame(() => this.analyze());
  }

  getAnalysis(): ToneAnalysis {
    // Calculate average pitch
    const avgPitch = this.pitchValues.length > 0 
      ? this.pitchValues.reduce((a, b) => a + b, 0) / this.pitchValues.length 
      : 50;
    
    // Calculate speaking speed (words per minute)
    const durationMinutes = (Date.now() - this.startTime) / 60000;
    const speed = durationMinutes > 0 ? Math.round(this.wordCount / durationMinutes) : 0;
    
    // Determine confidence level based on score
    let confidence: "confident" | "hesitant" | "authoritative" | "nervous" | "enthusiastic" = "hesitant";
    if (this.confidenceScore > 80) confidence = "confident";
    else if (this.confidenceScore > 60) confidence = "enthusiastic";
    else if (this.confidenceScore > 40) confidence = "authoritative";
    else if (this.confidenceScore > 20) confidence = "hesitant";
    else confidence = "nervous";
    
    // Generate feedback based on analysis
    let feedback = "";
    if (avgPitch > 75) feedback = "Try lowering your pitch for a more authoritative tone.";
    else if (avgPitch < 25) feedback = "Try varying your pitch more to sound more engaging.";
    else if (speed > 160) feedback = "Consider slowing down to improve clarity.";
    else if (speed < 100) feedback = "Try speaking a bit faster to maintain engagement.";
    else feedback = "Your tone is well-balanced. Maintain this level of delivery.";
    
    return {
      pitch: Math.round(avgPitch),
      speed,
      confidence,
      feedback
    };
  }
}

// Face Expression Analysis using face-api.js
export class EmotionAnalyzer {
  private isAnalyzing: boolean = false;
  private emotionTimeline: Array<{emotion: string, timestamp: number}> = [];
  private detectionInterval: number | null = null;
  private video: HTMLVideoElement | null = null;

  async start(video: HTMLVideoElement) {
    try {
      this.video = video;
      this.isAnalyzing = true;
      
      // Start detection loop
      this.detectionInterval = window.setInterval(() => {
        this.detectEmotions();
      }, 1000) as unknown as number; // Check every second
      
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
      const detections = await faceapi.detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
      
      if (detections && detections.length > 0) {
        const expressions = detections[0].expressions;
        
        // Find the dominant emotion
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
        
        // Add to timeline
        this.emotionTimeline.push({
          emotion: dominantEmotion,
          timestamp: Date.now()
        });
        
        // Limit timeline length
        if (this.emotionTimeline.length > 60) { // Keep last minute
          this.emotionTimeline.shift();
        }
      }
    } catch (error) {
      console.error('Error detecting emotions:', error);
    }
  }

  getAnalysis(): EmotionAnalysis {
    // Default values
    let primary: "happiness" | "sadness" | "anger" | "surprise" | "frustration" | "neutral" = "neutral";
    let intensity = 50;
    let feedback = "Maintain consistent emotional engagement throughout your answer.";

    // Calculate dominant emotion
    if (this.emotionTimeline.length > 0) {
      const emotionCounts: Record<string, number> = {
        happiness: 0,
        sadness: 0,
        anger: 0,
        surprise: 0,
        frustration: 0,
        neutral: 0
      };

      this.emotionTimeline.forEach(item => {
        if (emotionCounts[item.emotion] !== undefined) {
          emotionCounts[item.emotion]++;
        }
      });

      // Find most frequent emotion
      let maxCount = 0;
      let dominantEmotion = "neutral";
      Object.entries(emotionCounts).forEach(([emotion, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      });

      primary = dominantEmotion as "happiness" | "sadness" | "anger" | "surprise" | "frustration" | "neutral";

      // Calculate intensity (percentage of dominant emotion)
      intensity = Math.round((maxCount / this.emotionTimeline.length) * 100);

      // Generate feedback based on analysis
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

// Gesture Analysis using MediaPipe
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
      // Initialize MediaPipe Pose
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
      
      // Start camera
      this.camera = new Camera(video, {
        onFrame: async () => {
          if (this.pose && this.isAnalyzing) {
            await this.pose.send({image: video});
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
    
    // Analyze posture
    this.analyzePosture(results.poseLandmarks);
    
    // Analyze hand movements
    this.analyzeHandMovements(results.poseLandmarks);
    
    // Analyze facial engagement
    this.analyzeFacialEngagement(results.poseLandmarks);
    
    // Analyze body language
    this.analyzeBodyLanguage(results.poseLandmarks);
  }

  private analyzePosture(landmarks: any[]) {
    // Simplified posture analysis based on shoulder alignment
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (leftShoulder && rightShoulder) {
      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
      
      if (shoulderDiff < 0.05) {
        this.postureSamples.push('good');
      } else {
        this.postureSamples.push('poor');
      }
      
      // Limit sample size
      if (this.postureSamples.length > 30) {
        this.postureSamples.shift();
      }
    }
  }

  private analyzeHandMovements(landmarks: any[]) {
    // Simplified hand movement analysis
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    
    if (leftWrist && rightWrist && leftElbow && rightElbow) {
      // Calculate movement range
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
      
      // Limit sample size
      if (this.handMovementSamples.length > 30) {
        this.handMovementSamples.shift();
      }
    }
  }

  private analyzeFacialEngagement(landmarks: any[]) {
    // Simplified facial engagement based on face visibility
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
      
      // Limit sample size
      if (this.facialEngagementSamples.length > 30) {
        this.facialEngagementSamples.shift();
      }
    }
  }

  private analyzeBodyLanguage(landmarks: any[]) {
    // Simplified body language analysis based on arm positions
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    
    if (leftShoulder && rightShoulder && leftElbow && rightElbow) {
      // Check if arms are crossed or open
      const leftArmAngle = Math.atan2(
        leftElbow.y - leftShoulder.y,
        leftElbow.x - leftShoulder.x
      );
      
      const rightArmAngle = Math.atan2(
        rightElbow.y - rightShoulder.y,
        rightElbow.x - rightShoulder.x
      );
      
      // Simplified check for open vs closed posture
      if (leftArmAngle * rightArmAngle < 0) {
        this.bodyLanguageSamples.push('open');
      } else {
        this.bodyLanguageSamples.push('closed');
      }
      
      // Limit sample size
      if (this.bodyLanguageSamples.length > 30) {
        this.bodyLanguageSamples.shift();
      }
    }
  }

  getAnalysis(): GestureAnalysis {
    // Calculate most frequent values
    const getMostFrequent = (samples: string[]) => {
      if (samples.length === 0) return 'neutral';
      
      const counts: Record<string, number> = {};
      let maxCount = 0;
      let mostFrequent = 'neutral';
      
      samples.forEach(sample => {
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
    
    // Generate feedback
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

// Main Analysis Manager
export class AnalysisManager {
  private toneAnalyzer: ToneAnalyzer;
  private emotionAnalyzer: EmotionAnalyzer;
  private gestureAnalyzer: GestureAnalyzer;
  private isAnalyzing: boolean = false;
  
  constructor() {
    this.toneAnalyzer = new ToneAnalyzer();
    this.emotionAnalyzer = new EmotionAnalyzer();
    this.gestureAnalyzer = new GestureAnalyzer();
  }
  
  async start(videoElement: HTMLVideoElement, audioStream: MediaStream) {
    try {
      // Initialize face-api models if not already loaded
      await initFaceModels();
      
      // Start analyzers
      await Promise.all([
        this.toneAnalyzer.start(audioStream),
        this.emotionAnalyzer.start(videoElement),
        this.gestureAnalyzer.start(videoElement)
      ]);
      
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
    this.isAnalyzing = false;
  }
  
  updateSpeechText(text: string) {
    // Update tone analyzer with speech text for word count
    this.toneAnalyzer.processSpeech(text);
  }
  
  getAnalysisResults() {
    return {
      toneAnalysis: this.toneAnalyzer.getAnalysis(),
      emotionAnalysis: this.emotionAnalyzer.getAnalysis(),
      gestureAnalysis: this.gestureAnalyzer.getAnalysis()
    };
  }
  
  isActive() {
    return this.isAnalyzing;
  }
}