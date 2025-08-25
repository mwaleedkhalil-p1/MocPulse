import { toast } from "sonner";


export interface APIError {
  status?: number;
  code?: string;
  message: string;
  isRetryable: boolean;
}


export const parseAPIError = (error: any): APIError => {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorStatus = error?.status || error?.code;


  const isRetryable =
  errorStatus === 503 ||
  errorStatus === 429 ||
  errorStatus === 500 ||
  errorMessage.includes('overloaded') ||
  errorMessage.includes('rate limit') ||
  errorMessage.includes('quota') ||
  errorMessage.includes('temporarily unavailable') ||
  errorMessage.includes('service unavailable');


  return {
    status: errorStatus,
    message: error?.message || 'Unknown error occurred',
    isRetryable
  };
};


export const handleAPIError = (error: any, context: string = 'API request') => {
  const apiError = parseAPIError(error);

  console.error(`${context} failed:`, error);

  if (apiError.isRetryable) {
    toast.error('Service Temporarily Unavailable', {
      description: 'The AI service is currently overloaded. Please try again in a few moments.',
      duration: 5000
    });
  } else if (apiError.status === 401 || apiError.status === 403) {
    toast.error('Authentication Error', {
      description: 'Please check your API key configuration.',
      duration: 5000
    });
  } else if (apiError.status === 400) {
    toast.error('Invalid Request', {
      description: 'The request format is invalid. Please try again.',
      duration: 5000
    });
  } else {
    toast.error('Request Failed', {
      description: `An error occurred: ${apiError.message}`,
      duration: 5000
    });
  }

  return apiError;
};


export const retryWithBackoff = async <T,>(
fn: () => Promise<T>,
maxRetries: number = 3,
baseDelay: number = 1000,
maxDelay: number = 10000,
backoffMultiplier: number = 2)
: Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const apiError = parseAPIError(error);
      if (!apiError.isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};


export const checkAPIHealth = async (): Promise<boolean> => {
  try {

    const { chatSession } = await import('@/scripts');
    await chatSession.sendMessage('Hello');
    return true;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
};


export const getErrorMessage = (error: any): string => {
  const apiError = parseAPIError(error);

  if (apiError.isRetryable) {
    return 'The AI service is temporarily unavailable. Please try again in a few moments.';
  }

  switch (apiError.status) {
    case 401:
    case 403:
      return 'Authentication failed. Please check your API configuration.';
    case 400:
      return 'Invalid request format. Please try again.';
    case 404:
      return 'The requested service was not found.';
    default:
      return `An error occurred: ${apiError.message}`;
  }
};