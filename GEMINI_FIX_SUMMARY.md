# Gemini API 404 Error Fix

## Problem
The application was receiving 404 errors when trying to use the Gemini API:
```
models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent
```

## Root Causes
1. **Broken fallback logic**: The code was attempting to fallback to a non-existent `:generateText` endpoint
2. **Model availability**: The `gemini-1.5-flash` model might not be available in all regions or with all API keys

## Changes Made

### 1. Fixed `src/lib/ai.server.ts`
- **Removed broken fallback logic** (lines 209-228): Deleted the code that tried to retry with `:generateText` endpoint, which doesn't exist in the Gemini v1 API
- **Updated default model** (line 88): Changed from `gemini-1.5-flash` to `gemini-1.5-flash-latest` for better reliability
- **Improved error logging**: Added clearer error message when a 404 is encountered

### 2. Updated `.env`
- Changed `Gemini_MODEL` from `gemini-1.5-flash` to `gemini-1.5-flash-latest`

## How It Works Now

### API Endpoint
- Uses: `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent`
- This is the correct v1 API endpoint that supports the `generateContent` method

### Fallback Behavior
With `AI_PROVIDER=AUTO`, the system will:
1. Try Gemini first for text/code generation
2. If Gemini fails (including 404 errors), automatically fall back to DEAPI
3. This ensures the application remains functional even if one provider has issues

### Model Options
If you continue to experience 404 errors with `gemini-1.5-flash-latest`, you can try these alternatives:
- `gemini-1.5-pro-latest` (more capable, slightly slower)
- `gemini-1.0-pro` (older but widely available)
- `gemini-pro` (generic stable version)

## Testing
To test the fix:
1. Restart your development server
2. Try generating text or code
3. Check the console logs for `[Gemini]` messages
4. If Gemini fails, the system should automatically fall back to DEAPI

## Environment Variables
```env
Gemini_API_KEY="your-api-key"
Gemini_API_BASE="https://generativelanguage.googleapis.com/v1"
Gemini_MODEL="gemini-1.5-flash-latest"
```

## Notes
- The Gemini API key format `AQ.xxx` appears to be a valid Google API key format
- The v1 API is more stable than v1beta for newer models
- The fallback to DEAPI ensures business continuity even with Gemini issues