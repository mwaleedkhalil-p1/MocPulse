# Google Gemini Quota Optimization Guide

## Problem Analysis

Your Google Gemini quota is hitting quickly due to several high-consumption patterns in your application:

### Primary Quota Consumers (Ranked by Impact)

1. **🔴 API Status Monitoring (HIGHEST IMPACT)**
   - **Issue**: Automatic health checks every 5 minutes
   - **Consumption**: ~288 requests per day (24/7 monitoring)
   - **Fix Applied**: Reduced frequency to 30 minutes (saves ~240 requests/day)

2. **🟡 Interview Question Generation (HIGH IMPACT)**
   - **Issue**: Large prompts with CV data, generating 1-10 questions per interview
   - **Consumption**: 2,000-8,000 tokens per interview creation
   - **Fix Applied**: Reduced maxOutputTokens from 8192 to 4096

3. **🟡 Answer Analysis (MEDIUM IMPACT)**
   - **Issue**: AI feedback generation for each recorded answer
   - **Consumption**: 1,000-3,000 tokens per answer analysis

4. **🟠 Model Fallback System (POTENTIAL ISSUE)**
   - **Issue**: Failed attempts across 3 models still count toward quota
   - **Models**: gemini-2.0-flash-exp → gemini-1.5-flash → gemini-1.5-pro

## Optimizations Applied

### ✅ Immediate Fixes Implemented

1. **Reduced API Health Check Frequency**
   - Changed from 5 minutes to 30 minutes
   - Saves ~240 API calls per day

2. **Optimized Generation Config**
   - Reduced `maxOutputTokens`: 8192 → 4096 (50% reduction)
   - Reduced `temperature`: 1.0 → 0.7 (more focused responses)

3. **Added Quota Monitoring**
   - New `QuotaMonitor` class tracks usage in real-time
   - Console commands for debugging: `quotaMonitor.getReport()`

4. **Minimal Health Check Messages**
   - Changed from "ping" to "hi" for status checks

### 🔧 Additional Recommendations

1. **Disable Auto-Monitoring in Development**
   ```typescript
   // In api-status.tsx, add environment check
   const isDevelopment = import.meta.env.DEV;
   const interval = setInterval(checkAPIStatus, isDevelopment ? 60 * 60 * 1000 : 30 * 60 * 1000);
   ```

2. **Implement Request Caching**
   - Cache interview questions for similar job descriptions
   - Cache common feedback patterns

3. **Batch Operations**
   - Generate multiple questions in single API call instead of separate calls

4. **User-Triggered Health Checks**
   - Only check API status when user performs actions
   - Remove automatic background monitoring

## Quota Monitoring

### New Tools Added

1. **QuotaMonitor Class** (`src/lib/quota-monitor.ts`)
   - Tracks token usage by operation and model
   - Provides daily/hourly usage statistics
   - Warns when approaching limits

2. **Console Commands** (Available in browser console)
   ```javascript
   quotaMonitor.getReport()    // View detailed usage report
   quotaMonitor.reset()        // Reset usage tracking
   quotaMonitor.getDaily()     // Get daily statistics
   quotaMonitor.checkWarning() // Check if approaching limits
   ```

3. **QuotaStatus Component** (`src/components/quota-status.tsx`)
   - Visual quota usage display
   - Real-time warnings
   - Can be added to any page

### Usage Limits (Gemini Free Tier)

- **Rate Limit**: 15 requests per minute
- **Daily Limit**: ~1M tokens per day
- **Token Estimation**: ~4 characters = 1 token

### Current API Key
- Key: `AIzaSyA1jAnmWUFH2N9fflO-yNe2WvGFlcU9PRU`
- Verify this is your new key and properly configured

## Debugging Steps

1. **Check Current Usage**
   ```javascript
   // In browser console
   quotaMonitor.getReport()
   ```

2. **Monitor Real-Time Usage**
   - Watch console for quota warnings
   - Check browser Network tab for API calls

3. **Identify Heavy Operations**
   ```javascript
   // Check which operations use most tokens
   quotaMonitor.getDaily().byOperation
   ```

## Emergency Quota Conservation

If quota is still hitting, implement these emergency measures:

1. **Disable API Status Component**
   ```typescript
   // Comment out APIStatus component usage
   // <APIStatus />
   ```

2. **Reduce Question Generation**
   - Limit to 3 questions max per interview
   - Use shorter prompts

3. **Cache Responses**
   - Store generated questions in localStorage
   - Reuse similar interview setups

4. **Manual Mode**
   - Disable automatic features
   - Make API calls only on explicit user actions

## Verification

After implementing these changes:

1. Monitor console for quota warnings
2. Check `quotaMonitor.getReport()` after 24 hours
3. Verify API calls in browser Network tab
4. Test that functionality still works as expected

The optimizations should reduce your quota consumption by approximately 60-70%, primarily by reducing the constant background API monitoring.