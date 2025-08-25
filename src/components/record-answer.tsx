import { useAuth } from "@clerk/clerk-react";
import {
  CircleStop,
  Loader,
  Mic,
  RefreshCw,
  Save,
  Video,
  VideoOff,
  WebcamIcon } from
"lucide-react";
import { useEffect, useRef, useState } from "react";
import useSpeechToText, { ResultType } from "react-hook-speech-to-text";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { TooltipButton } from "./tooltip-button";
import { toast } from "sonner";
import { chatSession } from "@/scripts";
import { handleAPIError, getErrorMessage } from "@/lib/api-utils";
import { SaveModal } from "./save-modal";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where } from
"firebase/firestore";
import { db } from "@/config/firebase.config";
import { ToneAnalysis, EmotionAnalysis, GestureAnalysis, StressAnalysis } from "@/types";
import { AnalysisManager } from "@/lib/analysis";
import { StressDetection } from "./stress-detection";


interface RecordAnswerProps {
  question: {question: string;answer: string;};
  isWebCam: boolean;
  setIsWebCam: (value: boolean) => void;
}

interface AIResponse {
  ratings: number;
  feedback: string;
  toneAnalysis: ToneAnalysis;
  emotionAnalysis: EmotionAnalysis;
  gestureAnalysis: GestureAnalysis;
  stressAnalysis: StressAnalysis;
}

export const RecordAnswer = ({
  question,
  isWebCam,
  setIsWebCam
}: RecordAnswerProps) => {
  const {
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false
  });

  const [userAnswer, setUserAnswer] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordAgainLoading, setRecordAgainLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultsStartIndex, setResultsStartIndex] = useState(0);


  const webcamRef = useRef<WebCam>(null);
  const analysisManagerRef = useRef<AnalysisManager | null>(null);

  const { userId } = useAuth();
  const { interviewId } = useParams();

  const recordUserAnswer = async () => {
    if (isRecording) {
      stopSpeechToText();


      if (isAnalyzing && analysisManagerRef.current) {
        analysisManagerRef.current.stop();
        setIsAnalyzing(false);
      }


      if (userAnswer?.length >= 30) {
        const result = await generateResult(
          question.question,
          question.answer,
          userAnswer
        );
        setAiResult(result);
      } else {
        toast.error("Error", {
          description: "Your answer should be more than 30 characters"
        });
      }
    } else {
      setAiResult(null);
      setResultsStartIndex(results.length);
      startSpeechToText();


      if (isWebCam && webcamRef.current && webcamRef.current.video) {
        try {

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });


          if (!analysisManagerRef.current) {
            analysisManagerRef.current = new AnalysisManager();
          }


          const success = await analysisManagerRef.current.start(
            webcamRef.current.video,
            stream
          );

          if (success) {
            setIsAnalyzing(true);
            toast.success("Analysis started", {
              description: "Real-time analysis of tone, expression, and gestures is now active"
            });
          } else {
            toast.error("Analysis failed", {
              description: "Could not start real-time analysis. Please try again."
            });
          }
        } catch (error) {
          console.error("Error starting analysis:", error);

          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            toast.error("Microphone Permission Denied", {
              description: "Please grant microphone access in your device settings to use this feature."
            });
          } else {
            toast.error("Analysis error", {
              description: "Could not access media devices for analysis"
            });
          }
        }
      }
    }
  };

  const cleanJsonResponse = (responseText: string) => {

    let cleanText = responseText.trim();


    cleanText = cleanText.replace(/(json|```|`)/g, "");


    try {
      return JSON.parse(cleanText);
    } catch (error) {
      throw new Error("Invalid JSON format: " + (error as Error)?.message);
    }
  };

  const generateResult = async (
  qst: string,
  qstAns: string,
  userAns: string)
  : Promise<AIResponse> => {
    setIsAiGenerating(true);


    let realTimeAnalysis: {
      toneAnalysis: ToneAnalysis;
      emotionAnalysis: EmotionAnalysis;
      gestureAnalysis: GestureAnalysis;
      stressAnalysis: StressAnalysis;
    } = {
      toneAnalysis: {
        pitch: 50,
        speed: 0,
        confidence: "hesitant",
        feedback: "No tone analysis available"
      },
      emotionAnalysis: {
        primary: "neutral",
        intensity: 0,
        timeline: [],
        feedback: "No emotion analysis available"
      },
      gestureAnalysis: {
        posture: "neutral",
        handMovements: "minimal",
        facialEngagement: "low",
        bodyLanguage: "neutral",
        feedback: "No gesture analysis available"
      },
      stressAnalysis: {
        stress: false,
        confidence: 0,
        features: [],
        timeline: [],
        feedback: "No stress analysis available"
      }
    };


    if (isAnalyzing && analysisManagerRef.current) {

      analysisManagerRef.current.updateSpeechText(userAns);


      const analysisResults = analysisManagerRef.current.getAnalysisResults();
      realTimeAnalysis = {
        toneAnalysis: analysisResults.toneAnalysis,
        emotionAnalysis: analysisResults.emotionAnalysis,
        gestureAnalysis: analysisResults.gestureAnalysis,
        stressAnalysis: analysisResults.stressAnalysis
      };
    }

    const prompt = `
      Question: "${qst}"
      User Answer: "${userAns}"
      Correct Answer: "${qstAns}"
      
      Analyze the answer and provide a concise analysis with actionable tips:
      1. Content Rating (1-10) with a brief improvement tip
      
      Return a JSON response with concise tips:
      {
        "ratings": number (1-10),
        "feedback": "Brief actionable content improvement tip"
      }
    `;

    try {

      const aiResult = await chatSession.sendMessage(prompt);
      const parsedContentResult = cleanJsonResponse(aiResult.response.text());


      const combinedResult: AIResponse = {
        ratings: parsedContentResult.ratings || 0,
        feedback: parsedContentResult.feedback || "Unable to generate feedback",
        toneAnalysis: realTimeAnalysis.toneAnalysis,
        emotionAnalysis: realTimeAnalysis.emotionAnalysis,
        gestureAnalysis: realTimeAnalysis.gestureAnalysis,
        stressAnalysis: realTimeAnalysis.stressAnalysis
      };

      return combinedResult;
    } catch (error) {
      console.log(error);


      handleAPIError(error, "Feedback generation");

      return {
        ratings: 0,
        feedback: `Unable to generate feedback: ${getErrorMessage(error)}`,
        toneAnalysis: realTimeAnalysis.toneAnalysis,
        emotionAnalysis: realTimeAnalysis.emotionAnalysis,
        gestureAnalysis: realTimeAnalysis.gestureAnalysis,
        stressAnalysis: realTimeAnalysis.stressAnalysis
      };
    } finally {
      setIsAiGenerating(false);
    }
  };

  const recordNewAnswer = async () => {
    try {
      setRecordAgainLoading(true);


      setUserAnswer("");
      setAiResult(null);


      if (isRecording) {
        stopSpeechToText();

        await new Promise((resolve) => setTimeout(resolve, 500));
      }


      if (isAnalyzing && analysisManagerRef.current) {
        analysisManagerRef.current.stop();
        setIsAnalyzing(false);
      }


      setResultsStartIndex(results.length);


      startSpeechToText();


      if (isWebCam && webcamRef.current && webcamRef.current.video) {
        try {

          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });


          if (!analysisManagerRef.current) {
            analysisManagerRef.current = new AnalysisManager();
          }


          const success = await analysisManagerRef.current.start(
            webcamRef.current.video,
            audioStream
          );

          if (success) {
            setIsAnalyzing(true);
            toast.success("Recording restarted", {
              description: "New recording started with real-time analysis"
            });
          } else {
            toast.error("Analysis failed", {
              description: "Could not start real-time analysis. Recording will continue without analysis."
            });
          }
        } catch (error) {
          console.error("Error starting analysis:", error);

          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            toast.error("Microphone Permission Denied", {
              description: "Please grant microphone access to use analysis features."
            });
          } else {
            toast.error("Analysis error", {
              description: "Could not access media devices for analysis. Recording will continue without analysis."
            });
          }
        }
      } else {
        toast.success("Recording restarted", {
          description: "New recording started"
        });
      }
    } catch (error) {
      console.error("Error in recordNewAnswer:", error);
      toast.error("Error", {
        description: "Failed to restart recording. Please try again."
      });
    } finally {
      setRecordAgainLoading(false);
    }
  };

  const saveUserAnswer = async () => {
    setLoading(true);

    if (!aiResult) {
      return;
    }

    const currentQuestion = question.question;
    try {


      const userAnswerQuery = query(
        collection(db, "userAnswers"),
        where("userId", "==", userId),
        where("question", "==", currentQuestion)
      );

      const querySnap = await getDocs(userAnswerQuery);


      if (!querySnap.empty) {
        console.log("Query Snap Size", querySnap.size);
        toast.info("Already Answered", {
          description: "You have already answered this question"
        });
        return;
      } else {


        await addDoc(collection(db, "userAnswers"), {
          mockIdRef: interviewId,
          question: question.question,
          correct_ans: question.answer,
          user_ans: userAnswer,
          feedback: aiResult.feedback,
          rating: aiResult.ratings,
          userId,
          createdAt: serverTimestamp(),
          toneAnalysis: aiResult.toneAnalysis,
          emotionAnalysis: aiResult.emotionAnalysis,
          gestureAnalysis: aiResult.gestureAnalysis,
          stressAnalysis: aiResult.stressAnalysis
        });

        toast("Saved", { description: "Your answer has been saved.." });
      }

      setUserAnswer("");
      stopSpeechToText();
    } catch (error) {
      toast("Error", {
        description: "An error occurred while generating feedback."
      });
      console.log(error);
    } finally {
      setLoading(false);
      setOpen(!open);
    }
  };

  useEffect(() => {

    const currentSessionResults = results.slice(resultsStartIndex);
    const combineTranscripts = currentSessionResults.
    filter((result): result is ResultType => typeof result !== "string").
    map((result) => result.transcript).
    join(" ");

    setUserAnswer(combineTranscripts);


    if (isAnalyzing && analysisManagerRef.current && combineTranscripts) {
      analysisManagerRef.current.updateSpeechText(combineTranscripts);
    }
  }, [results, isAnalyzing, resultsStartIndex]);


  useEffect(() => {
    return () => {

      if (analysisManagerRef.current) {
        analysisManagerRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-8 mt-4">
      {}
      <SaveModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={saveUserAnswer}
        loading={loading} />


      <div className="w-full h-[400px] md:w-96 flex flex-col items-center justify-center border p-4 bg-gray-50 rounded-md">
        {isWebCam ?
        <WebCam
          ref={webcamRef}
          onUserMedia={() => setIsWebCam(true)}
          onUserMediaError={() => setIsWebCam(false)}
          className="w-full h-full object-cover rounded-md" /> :


        <WebcamIcon className="min-w-24 min-h-24 text-muted-foreground" />
        }
      </div>

      <div className="flex itece justify-center gap-3">
        <TooltipButton
          content={isWebCam ? "Turn Off" : "Turn On"}
          icon={
          isWebCam ?
          <VideoOff className="min-w-5 min-h-5" /> :

          <Video className="min-w-5 min-h-5" />

          }
          onClick={() => setIsWebCam(!isWebCam)} />


        <TooltipButton
          content={isRecording ? "Stop Recording" : "Start Recording"}
          icon={
          isRecording ?
          <CircleStop className="min-w-5 min-h-5" /> :

          <Mic className="min-w-5 min-h-5" />

          }
          onClick={recordUserAnswer} />


        <TooltipButton
          content="Record Again"
          icon={
          recordAgainLoading ?
          <Loader className="min-w-5 min-h-5 animate-spin" /> :

          <RefreshCw className="min-w-5 min-h-5" />

          }
          onClick={recordNewAnswer}
          disbaled={recordAgainLoading}
          loading={recordAgainLoading} />


        <TooltipButton
          content="Save Result"
          icon={
          isAiGenerating ?
          <Loader className="min-w-5 min-h-5 animate-spin" /> :

          <Save className="min-w-5 min-h-5" />

          }
          onClick={() => setOpen(!open)}
          disbaled={!aiResult} />

      </div>

      {/* Stress Detection Component */}
      {isWebCam && (
        <StressDetection
          videoElement={webcamRef.current?.video || null}
          isRecording={isRecording}
          className="w-full max-w-md"
        />
      )}

      <div className="w-full mt-4 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-semibold">Your Answer:</h2>

        <p className="text-sm mt-2 text-gray-700 whitespace-normal">
          {userAnswer || "Start recording to see your ansewer here"}
        </p>

        {interimResult &&
        <p className="text-sm text-gray-500 mt-2">
            <strong>Current Speech:</strong>
            {interimResult}
          </p>
        }
      </div>
    </div>);

};