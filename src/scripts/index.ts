import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel,
  ChatSession } from
"@google/generative-ai";
import { quotaMonitor } from "@/lib/quota-monitor";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);


const modelConfigs = [
{ model: "gemini-2.0-flash-exp", priority: 1 },
{ model: "gemini-1.5-flash", priority: 2 },
{ model: "gemini-1.5-pro", priority: 3 }];


const generationConfig = {
  temperature: 0.7,  // Reduced from 1 to get more focused responses
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 4096,  // Reduced from 8192 to conserve quota
  responseMimeType: "text/plain"
};

const safetySettings = [
{
  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
},
{
  category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
},
{
  category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
},
{
  category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
}];



const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};


const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


const isRetryableError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorStatus = error?.status || error?.code;

  return (
    errorStatus === 503 ||
    errorStatus === 429 ||
    errorStatus === 500 ||
    errorMessage.includes('overloaded') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('temporarily unavailable') ||
    errorMessage.includes('service unavailable'));

};


const getModelWithFallback = (modelName: string): GenerativeModel => {
  try {
    return genAI.getGenerativeModel({ model: modelName });
  } catch (error) {
    console.warn(`Failed to initialize model ${modelName}:`, error);
    throw error;
  }
};


class EnhancedChatSession {
  private currentModel: GenerativeModel;
  private currentSession: ChatSession;
  private currentModelIndex: number = 0;

  constructor() {
    this.currentModel = getModelWithFallback(modelConfigs[0].model);
    this.currentSession = this.currentModel.startChat({
      generationConfig,
      safetySettings
    });
  }

  private async switchToNextModel(): Promise<boolean> {
    if (this.currentModelIndex < modelConfigs.length - 1) {
      this.currentModelIndex++;
      const nextModelConfig = modelConfigs[this.currentModelIndex];

      try {
        console.log(`Switching to fallback model: ${nextModelConfig.model}`);
        this.currentModel = getModelWithFallback(nextModelConfig.model);
        this.currentSession = this.currentModel.startChat({
          generationConfig,
          safetySettings
        });
        return true;
      } catch (error) {
        console.warn(`Failed to switch to model ${nextModelConfig.model}:`, error);
        return false;
      }
    }
    return false;
  }

  async sendMessage(message: string): Promise<any> {
    let lastError: any;


    for (let modelAttempt = 0; modelAttempt <= modelConfigs.length - 1; modelAttempt++) {

      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
          const result = await this.currentSession.sendMessage(message);

          // Track quota usage
          const responseText = result.response.text();
          const estimatedTokens = Math.ceil((message.length + responseText.length) / 4); // Rough estimate
          quotaMonitor.recordUsage(
            'sendMessage', 
            estimatedTokens, 
            modelConfigs[this.currentModelIndex].model
          );

          // Check for quota warnings
          const warning = quotaMonitor.checkQuotaWarning();
          if (warning.warning) {
            console.warn(`[Quota Warning] ${warning.message}`);
          }

          if (this.currentModelIndex > 0) {
            console.log('Resetting to primary model after successful request');
            this.currentModelIndex = 0;
            this.currentModel = getModelWithFallback(modelConfigs[0].model);
            this.currentSession = this.currentModel.startChat({
              generationConfig,
              safetySettings
            });
          }

          return result;
        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt + 1} failed with model ${modelConfigs[this.currentModelIndex].model}:`, error);

          if (!isRetryableError(error)) {

            break;
          }

          if (attempt < RETRY_CONFIG.maxRetries) {
            const delay = Math.min(
              RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
              RETRY_CONFIG.maxDelay
            );
            console.log(`Retrying in ${delay}ms...`);
            await sleep(delay);
          }
        }
      }


      if (modelAttempt < modelConfigs.length - 1) {
        const switched = await this.switchToNextModel();
        if (!switched) {
          break;
        }
      }
    }


    throw new Error(`All models failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }


  resetToPrimaryModel(): void {
    try {
      this.currentModelIndex = 0;
      this.currentModel = getModelWithFallback(modelConfigs[0].model);
      this.currentSession = this.currentModel.startChat({
        generationConfig,
        safetySettings
      });
      console.log('Reset to primary model');
    } catch (error) {
      console.warn('Failed to reset to primary model:', error);
    }
  }


  getCurrentModelInfo(): {model: string;index: number;} {
    return {
      model: modelConfigs[this.currentModelIndex].model,
      index: this.currentModelIndex
    };
  }
}

export const chatSession = new EnhancedChatSession();