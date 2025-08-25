import * as faceapi from 'face-api.js';
import { toast } from 'sonner';


export const initializeFaceModels = async () => {
  try {
    console.log('Loading face-api models...');
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
    toast.error('Failed to load analysis models', {
      description: 'Some features may not work correctly. Please refresh the page.'
    });
    return false;
  }
};


export const setupAnalysisModels = () => {

  initializeFaceModels().then((success) => {
    if (success) {
      console.log('Analysis models initialized successfully');
    }
  });
};