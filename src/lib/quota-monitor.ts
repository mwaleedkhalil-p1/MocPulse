/**
 * Quota monitoring utility to track Gemini API usage
 */

interface QuotaUsage {
  timestamp: number;
  operation: string;
  tokensUsed: number;
  model: string;
}

class QuotaMonitor {
  private usage: QuotaUsage[] = [];
  private readonly STORAGE_KEY = 'gemini_quota_usage';
  private readonly MAX_HISTORY_DAYS = 7;

  constructor() {
    this.loadUsageFromStorage();
    this.cleanOldEntries();
  }

  /**
   * Record API usage
   */
  recordUsage(operation: string, tokensUsed: number, model: string) {
    const entry: QuotaUsage = {
      timestamp: Date.now(),
      operation,
      tokensUsed,
      model
    };

    this.usage.push(entry);
    this.saveUsageToStorage();
    
    console.log(`[Quota Monitor] ${operation}: ${tokensUsed} tokens (${model})`);
  }

  /**
   * Get usage statistics for the last 24 hours
   */
  getDailyUsage(): {
    totalTokens: number;
    operationCount: number;
    byOperation: Record<string, number>;
    byModel: Record<string, number>;
  } {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentUsage = this.usage.filter(entry => entry.timestamp > oneDayAgo);

    const byOperation: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalTokens = 0;

    recentUsage.forEach(entry => {
      totalTokens += entry.tokensUsed;
      byOperation[entry.operation] = (byOperation[entry.operation] || 0) + entry.tokensUsed;
      byModel[entry.model] = (byModel[entry.model] || 0) + entry.tokensUsed;
    });

    return {
      totalTokens,
      operationCount: recentUsage.length,
      byOperation,
      byModel
    };
  }

  /**
   * Get usage for the last hour (to detect rapid consumption)
   */
  getHourlyUsage(): number {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.usage
      .filter(entry => entry.timestamp > oneHourAgo)
      .reduce((total, entry) => total + entry.tokensUsed, 0);
  }

  /**
   * Check if usage is approaching limits
   */
  checkQuotaWarning(): {
    warning: boolean;
    message: string;
    dailyUsage: number;
    hourlyUsage: number;
  } {
    const dailyUsage = this.getDailyUsage().totalTokens;
    const hourlyUsage = this.getHourlyUsage();

    // Gemini free tier: ~15,000 tokens per minute, ~1M tokens per day
    const DAILY_WARNING_THRESHOLD = 800000; // 80% of 1M
    const HOURLY_WARNING_THRESHOLD = 50000;  // Conservative hourly limit

    let warning = false;
    let message = '';

    if (dailyUsage > DAILY_WARNING_THRESHOLD) {
      warning = true;
      message = `High daily usage: ${dailyUsage} tokens (approaching daily limit)`;
    } else if (hourlyUsage > HOURLY_WARNING_THRESHOLD) {
      warning = true;
      message = `High hourly usage: ${hourlyUsage} tokens (may hit rate limits)`;
    }

    return {
      warning,
      message,
      dailyUsage,
      hourlyUsage
    };
  }

  /**
   * Get detailed usage report
   */
  getUsageReport(): string {
    const daily = this.getDailyUsage();
    const hourly = this.getHourlyUsage();
    const warning = this.checkQuotaWarning();

    return `
=== Gemini API Usage Report ===
Daily Usage: ${daily.totalTokens} tokens (${daily.operationCount} requests)
Hourly Usage: ${hourly} tokens

Operations (24h):
${Object.entries(daily.byOperation)
  .map(([op, tokens]) => `  ${op}: ${tokens} tokens`)
  .join('\n')}

Models (24h):
${Object.entries(daily.byModel)
  .map(([model, tokens]) => `  ${model}: ${tokens} tokens`)
  .join('\n')}

${warning.warning ? `⚠️  WARNING: ${warning.message}` : '✅ Usage within normal limits'}
    `.trim();
  }

  /**
   * Reset usage tracking (for testing or new billing period)
   */
  resetUsage() {
    this.usage = [];
    this.saveUsageToStorage();
    console.log('[Quota Monitor] Usage history reset');
  }

  private loadUsageFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.usage = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[Quota Monitor] Failed to load usage from storage:', error);
      this.usage = [];
    }
  }

  private saveUsageToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.usage));
    } catch (error) {
      console.warn('[Quota Monitor] Failed to save usage to storage:', error);
    }
  }

  private cleanOldEntries() {
    const cutoff = Date.now() - (this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
    this.usage = this.usage.filter(entry => entry.timestamp > cutoff);
    this.saveUsageToStorage();
  }
}

export const quotaMonitor = new QuotaMonitor();

// Console commands for debugging
if (typeof window !== 'undefined') {
  (window as any).quotaMonitor = {
    getReport: () => console.log(quotaMonitor.getUsageReport()),
    reset: () => quotaMonitor.resetUsage(),
    getDaily: () => quotaMonitor.getDailyUsage(),
    checkWarning: () => quotaMonitor.checkQuotaWarning()
  };
}