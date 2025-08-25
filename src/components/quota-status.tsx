import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Info } from "lucide-react";
import { quotaMonitor } from "@/lib/quota-monitor";

interface QuotaStatusProps {
  className?: string;
}

export const QuotaStatus = ({ className = "" }: QuotaStatusProps) => {
  const [usage, setUsage] = useState({
    dailyUsage: 0,
    hourlyUsage: 0,
    warning: false,
    message: ''
  });

  const updateUsage = () => {
    const daily = quotaMonitor.getDailyUsage();
    const hourly = quotaMonitor.getHourlyUsage();
    const warning = quotaMonitor.checkQuotaWarning();

    setUsage({
      dailyUsage: daily.totalTokens,
      hourlyUsage: hourly,
      warning: warning.warning,
      message: warning.message
    });
  };

  useEffect(() => {
    updateUsage();
    
    // Update every 5 minutes
    const interval = setInterval(updateUsage, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getUsageColor = () => {
    if (usage.warning) return 'text-red-600';
    if (usage.dailyUsage > 500000) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageIcon = () => {
    if (usage.warning) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <BarChart3 className="w-4 h-4 text-blue-500" />;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens > 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens > 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {getUsageIcon()}
      <div className="flex flex-col">
        <span className={getUsageColor()}>
          Daily: {formatTokens(usage.dailyUsage)} tokens
        </span>
        {usage.hourlyUsage > 0 && (
          <span className="text-xs text-gray-500">
            Last hour: {formatTokens(usage.hourlyUsage)}
          </span>
        )}
      </div>
      
      {usage.warning && (
        <div className="flex items-center gap-1 text-red-600">
          <Info className="w-3 h-3" />
          <span className="text-xs">Quota Warning</span>
        </div>
      )}
      
      <button
        onClick={updateUsage}
        className="text-xs text-blue-500 hover:text-blue-700 underline ml-2"
        title="Refresh quota usage"
      >
        Refresh
      </button>
    </div>
  );
};