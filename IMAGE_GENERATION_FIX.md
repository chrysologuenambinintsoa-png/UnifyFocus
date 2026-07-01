# Image Generation Error Fix

## Problem
The image generation endpoint (`POST /api/generate/image`) was failing with the error:
```
Image generation failed: Error: Image generation failed. Details: DEAPI: fetch failed
```

This was caused by network connectivity issues when the `deapiFetch` function tried to reach the DEAPI service at `https://api.deapi.ai`.

## Root Cause
The original `deapiFetch` function in `src/lib/ai.server.ts` had no:
- Timeout handling (requests could hang indefinitely)
- Retry logic (network errors would fail immediately)
- Proper error handling for network failures

## Solution
Enhanced the `deapiFetch` function with:

### 1. **Timeout Handling**
- Added 30-second timeout using `AbortController`
- Prevents requests from hanging indefinitely

### 2. **Retry Logic**
- Implements up to 3 attempts (configurable via `maxRetries` parameter)
- Exponential backoff between retries (1s, 2s, 3s)
- Smart retry decisions:
  - Retries on network errors: `fetch failed`, `ECONNREFUSED`, `ENOTFOUND`
  - Retries on timeouts
  - Retries on 5xx server errors and 429 rate limit errors
  - Does NOT retry on 4xx client errors (except 429)

### 3. **Better Error Messages**
- Clear error messages indicating number of retry attempts
- Distinguishes between timeout, network, and API errors
- Provides context for debugging

## Changes Made

**File**: `src/lib/ai.server.ts`

**Function**: `deapiFetch` (lines 182-280)

### Key Improvements:
```typescript
async function deapiFetch(path: string, body: unknown, maxRetries: number = 2) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      // 30-second timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${DEAPI_API_BASE}${path}`, {
        method: "POST",
        headers: { ...DEAPI_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP errors with smart retry logic
      if (!response.ok) {
        // Don't retry on client errors (4xx) except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(errorMsg);
        }
        
        // Retry on server errors
        lastError = new Error(errorMsg);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
      
      return await response.json();
    } catch (error) {
      // Handle timeouts and network errors with retry
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Retry on timeout
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        }
        
        // Retry on network errors
        if (error.message.includes('fetch failed') || 
            error.message.includes('ECONNREFUSED') || 
            error.message.includes('ENOTFOUND')) {
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        }
      }
      
      throw error;
    }
  }
  
  throw lastError ?? new Error("deAPI.ai request failed after retries");
}
```

## Benefits

1. **Resilience**: Automatically recovers from transient network issues
2. **Better UX**: Users experience fewer failures due to temporary network problems
3. **Debugging**: Clearer error messages help identify persistent issues
4. **Performance**: Timeout prevents resource exhaustion from hanging requests

## Testing

The fix can be tested by:
1. Making an image generation request when DEAPI is experiencing temporary network issues
2. Verifying that the request retries automatically instead of failing immediately
3. Checking console logs for retry attempts: `[AI] DEAPI network error (attempt 1/3), retrying...`

## Impact

- **Image Generation**: Now has 3 attempts to succeed
- **Video Generation**: Benefits from the same retry logic (uses `deapiFetchAndPoll`)
- **Text Generation**: Uses the same `deapiFetch` function for DEAPI provider
- **Audio Generation**: Uses separate `deapiAudioFetch` (could be enhanced similarly if needed)

## Notes

- The retry logic is conservative to avoid overwhelming the API
- Exponential backoff helps prevent rate limiting
- Timeout of 30 seconds is appropriate for image/video generation which can be slow
- Error messages clearly indicate when all retries are exhausted

</parameter>
<task_progress>
- [x] Investigate the image generation error
- [x] Identify the root cause of the DEAPI fetch failure
- [x] Implement a fix for the issue
- [x] Document the fix
</task_progress>
</write_to_file>