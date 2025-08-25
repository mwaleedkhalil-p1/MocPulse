# API Error Handling Guide

## Overview

This document explains how to handle Google Gemini API errors, particularly the "model is overloaded" error (503 Service Unavailable).

## Enhanced Error Handling Features

### 1. Automatic Retry Logic
- **Exponential Backoff**: Automatically retries failed requests with increasing delays
- **Smart Error Detection**: Only retries on temporary/retryable errors
- **Configurable Limits**: Maximum of 3 retries with up to 10-second delays

### 2. Model Fallback System
- **Primary Model**: `gemini-2.0-flash-exp` (latest experimental model)
- **Fallback Models**: 
  - `gemini-1.5-flash` (faster, more stable)
  - `gemini-1.5-pro` (most reliable)
- **Automatic Switching**: Falls back to next model if current one fails
- **Auto-Recovery**: Returns to primary model when service recovers

### 3. User-Friendly Error Messages
- **Context-Aware**: Different messages for different error types
- **Actionable**: Provides clear next steps for users
- **Non-Technical**: Avoids exposing technical error details

## Common Error Scenarios

### 503 Service Unavailable (Model Overloaded)
**Cause**: Google's servers are experiencing high load
**Solution**: 
- Automatic retry with exponential backoff
- Fallback to alternative models
- User notification with retry option

### 429 Rate Limit Exceeded
**Cause**: Too many requests in a short time
**Solution**:
- Automatic retry with longer delays
- User notification about rate limits

### 401/403 Authentication Errors
**Cause**: Invalid or expired API key
**Solution**:
- Immediate failure (no retry)
- User notification to check API configuration

## Implementation Details

### Enhanced Chat Session
```typescript
// Located in: src/scripts/index.ts
export const chatSession = new EnhancedChatSession();
```

Features:
- Automatic retry logic
- Model fallback system
- Error categorization
- Recovery mechanisms

### API Utilities
```typescript
// Located in: src/lib/api-utils.ts
import { handleAPIError, getErrorMessage } from "@/lib/api-utils";
```

Functions:
- `handleAPIError()`: Shows appropriate toast notifications
- `getErrorMessage()`: Returns user-friendly error messages
- `parseAPIError()`: Categorizes errors as retryable/non-retryable

### API Status Component
```typescript
// Located in: src/components/api-status.tsx
import { APIStatus } from "@/components/api-status";
```

Features:
- Real-time API health monitoring
- Current model display
- Manual retry option
- Automatic periodic checks

## Usage Examples

### Basic Error Handling
```typescript
try {
  const result = await chatSession.sendMessage(prompt);
  // Handle success
} catch (error) {
  handleAPIError(error, "Custom context");
  // Handle failure
}
```

### Custom Error Messages
```typescript
try {
  const result = await chatSession.sendMessage(prompt);
  return result;
} catch (error) {
  const userMessage = getErrorMessage(error);
  return { error: userMessage };
}
```

## Configuration

### Retry Settings
```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};
```

### Model Priority
```typescript
const modelConfigs = [
  { model: "gemini-2.0-flash-exp", priority: 1 },
  { model: "gemini-1.5-flash", priority: 2 },
  { model: "gemini-1.5-pro", priority: 3 },
];
```

## Troubleshooting

### If You Still Get Errors

1. **Check API Key**: Ensure `VITE_GEMINI_API_KEY` is valid
2. **Check Quota**: Verify you haven't exceeded API quotas
3. **Wait and Retry**: For 503 errors, wait 5-10 minutes
4. **Check Status**: Use the API Status component to monitor health
5. **Manual Reset**: Call `chatSession.resetToPrimaryModel()` if needed

### Monitoring

- Use the `APIStatus` component in your UI
- Check browser console for detailed error logs
- Monitor toast notifications for user-facing errors

## Best Practices

1. **Always Use Error Handling**: Wrap API calls in try-catch blocks
2. **Provide User Feedback**: Use toast notifications for errors
3. **Don't Retry Non-Retryable Errors**: Authentication errors shouldn't be retried
4. **Log Errors**: Keep detailed logs for debugging
5. **Graceful Degradation**: Provide fallback content when AI fails

## Testing Error Handling

To test the error handling system:

1. **Simulate Overload**: Temporarily use an invalid model name
2. **Test Rate Limits**: Make rapid successive requests
3. **Test Auth Errors**: Use an invalid API key
4. **Monitor Recovery**: Watch automatic fallback and recovery

## Support

If you continue experiencing issues:
- Check Google Cloud Console for API status
- Review API quotas and billing
- Consider upgrading to a higher tier plan
- Contact Google Cloud Support for persistent issues
