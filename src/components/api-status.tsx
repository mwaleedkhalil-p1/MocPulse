import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { chatSession } from "@/scripts";
import { parseAPIError } from "@/lib/api-utils";

interface APIStatusProps {
  className?: string;
}

type StatusType = 'checking' | 'healthy' | 'degraded' | 'down';

export const APIStatus = ({ className = "" }: APIStatusProps) => {
  const [status, setStatus] = useState<StatusType>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('');

  const checkAPIStatus = async () => {
    setStatus('checking');

    try {
      // Use a minimal message to reduce quota consumption
      await chatSession.sendMessage('hi');
      setStatus('healthy');

      const modelInfo = chatSession.getCurrentModelInfo();
      setCurrentModel(modelInfo.model);

    } catch (error) {
      const apiError = parseAPIError(error);

      if (apiError.isRetryable) {
        setStatus('degraded');
      } else {
        setStatus('down');
      }

      console.warn('API status check failed:', error);
    } finally {
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkAPIStatus();

    // Reduced frequency from 5 minutes to 30 minutes to conserve quota
    const interval = setInterval(checkAPIStatus, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'down':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking API status...';
      case 'healthy':
        return `AI Service Online (${currentModel})`;
      case 'degraded':
        return 'AI Service Degraded - May experience delays';
      case 'down':
        return 'AI Service Unavailable';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'text-gray-500';
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'down':
        return 'text-red-600';
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {getStatusIcon()}
      <span className={getStatusColor()}>
        {getStatusText()}
      </span>
      {lastChecked &&
      <span className="text-xs text-gray-400">
          (Last checked: {lastChecked.toLocaleTimeString()})
        </span>
      }
      {status !== 'healthy' &&
      <button
        onClick={checkAPIStatus}
        className="text-xs text-blue-500 hover:text-blue-700 underline ml-2">

          Retry
        </button>
      }
    </div>);

};