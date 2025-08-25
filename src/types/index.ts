import { FieldValue, Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  createdAt: Timestamp | FieldValue;
  updateAt: Timestamp | FieldValue;
}

export interface CVData {
  rawText: string;
  timestamp: string;
}

export interface Interview {
  id: string;
  position: string;
  description: string;
  experience: number;
  userId: string;
  techStack: string;
  numberOfQuestions: number;
  cvData?: CVData;
  questions: {question: string;answer: string;}[];
  createdAt: Timestamp;
  updateAt: Timestamp;
}

export interface ToneAnalysis {
  pitch: number;
  speed: number;
  confidence: "confident" | "hesitant" | "authoritative" | "nervous" | "enthusiastic";
  feedback: string;
}

export interface EmotionAnalysis {
  primary: "happiness" | "sadness" | "anger" | "surprise" | "frustration" | "neutral";
  intensity: number;
  timeline: Array<{
    emotion: string;
    timestamp: number;
  }>;
  feedback: string;
}

export interface GestureAnalysis {
  posture: "good" | "poor" | "neutral";
  handMovements: "minimal" | "moderate" | "excessive";
  facialEngagement: "high" | "low" | "moderate";
  bodyLanguage: "open" | "closed" | "neutral";
  feedback: string;
}

export interface StressAnalysis {
  stress: boolean;
  confidence: number;
  features: string[];
  timeline: Array<{
    stress: boolean;
    confidence: number;
    timestamp: number;
  }>;
  feedback: string;
}

export interface UserAnswer {
  id: string;
  mockIdRef: string;
  question: string;
  correct_ans: string;
  user_ans: string;
  feedback: string;
  rating: number;
  userId: string;
  createdAt: Timestamp;
  updateAt: Timestamp;

  toneAnalysis?: ToneAnalysis;
  emotionAnalysis?: EmotionAnalysis;
  gestureAnalysis?: GestureAnalysis;
  stressAnalysis?: StressAnalysis;
  cvData?: CVData;
}