import fs from "fs";
import path from "path";
import { normalizePrompt, extractPromptIntent } from "./prompt";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {} as Record<string, string>;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const entries: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function ensureLocalEnvLoaded() {
  // Only skip loading in production/Vercel environments
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    console.log("[Env] Skipping local env load (production/vercel environment)");
    return;
  }

  try {
    const root = process.cwd();
    console.log("[Env] Loading environment from:", root);
    const envFiles = [".env.local", ".env"];
    for (const envFile of envFiles) {
      const envPath = path.join(root, envFile);
      const envData = loadEnvFile(envPath);
      console.log(`[Env] Loaded ${envFile}:`, Object.keys(envData).filter(k => k.includes('GEMINI') || k.includes('DEAPI') || k.includes('AI_PROVIDER')));
      for (const [key, value] of Object.entries(envData)) {
        // Always load from .env.local, only set if not already defined for .env
        if (envFile === ".env.local" || !process.env[key]) {
          if (value !== undefined) {
            process.env[key] = value;
            console.log(`[Env] Set ${key} from ${envFile}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Env] Error loading env files:", err);
  }
}

ensureLocalEnvLoaded();

const rawAiProvider = process.env.AI_PROVIDER?.trim().toUpperCase() ?? "DEAPI";
const AI_PROVIDER = rawAiProvider; // Keep "AUTO" so provider auto-selection works

function envOrDefault(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "" ? trimmed : fallback;
}

function normalizeDeapiApiBase(value: string | undefined) {
  const trimmed = envOrDefault(value?.trim(), "");
  // Default to the primary endpoint. The calling functions will append the correct paths.
  return trimmed || "https://api.deapi.ai";
}

const DEAPI_API_KEY = envOrDefault(process.env.DEAPI_API_KEY, "");
const DEAPI_API_BASE = normalizeDeapiApiBase(process.env.DEAPI_API_BASE);
const DEAPI_MODEL = envOrDefault(process.env.DEAPI_MODEL, "AceStep_1_5_Turbo");
const DEAPI_IMAGE_MODEL = envOrDefault(process.env.DEAPI_IMAGE_MODEL, "Flux1schnell");
const DEAPI_IMAGE_EDIT_MODEL = envOrDefault(process.env.DEAPI_IMAGE_EDIT_MODEL, "Flux1schnell");
const DEAPI_VIDEO_MODEL = envOrDefault(process.env.DEAPI_VIDEO_MODEL, "Ltx2_3_22B_Dist_INT8");
const DEAPI_VIDEO_EDIT_MODEL = envOrDefault(process.env.DEAPI_VIDEO_EDIT_MODEL, "Ltx2_19B_Dist_FP8");

// Groq API Configuration (OpenAI-compatible)
const Groq_API_KEY = envOrDefault(process.env.Groq_API_KEY, "");
const Groq_API_BASE = envOrDefault(process.env.Groq_API_BASE, "https://api.groq.com/openai/v1");
const Groq_MODEL = envOrDefault(process.env.Groq_MODEL, "llama-3.3-70b-versatile");

// Debug logging
console.log("[AI Config] Groq_API_BASE:", Groq_API_BASE);
console.log("[AI Config] Groq_MODEL:", Groq_MODEL);
console.log("[AI Config] DEAPI_API_BASE:", DEAPI_API_BASE);
console.log("[AI Config] AI_PROVIDER:", AI_PROVIDER);
 
// --- 1. Add Configuration for the New Provider ---
const OctoAI_API_KEY = envOrDefault(process.env.OCTOAI_API_KEY, "");
const OctoAI_API_BASE = envOrDefault(process.env.OCTOAI_API_BASE, "https://text.octoai.run/v1");
const OctoAI_MODEL = envOrDefault(process.env.OCTOAI_MODEL, "mixtral-8x7b-instruct");

const AVAILABLE_AI_PROVIDERS = ["DEAPI", "Groq", "OctoAI"] as const;
type AIProviderValue = (typeof AVAILABLE_AI_PROVIDERS)[number];
type AIProviderCapability = "text" | "code" | "image" | "video" | "audio";
// --- End of Step 1 ---
function isProviderConfigured(provider: AIProviderValue) {
  if (provider === "DEAPI") return Boolean(DEAPI_API_KEY);
  if (provider === "Groq") return Boolean(Groq_API_KEY);
  if (provider === "OctoAI") return Boolean(OctoAI_API_KEY);
  return false;
}

const FALLBACK_PROVIDER_ORDER: AIProviderValue[] = ["DEAPI", "Groq"];
const FALLBACK_PROVIDER_ORDER_BY_ACTION: Record<AIProviderCapability, AIProviderValue[]> = {
  // Prefer Groq for text/code but fall back to DEAPI if Groq is unavailable or fails
  text: ["Groq", "DEAPI"],
  // --- 2. Register the new provider in the fallback order ---
  code: ["Groq", "OctoAI", "DEAPI"],
  image: ["DEAPI"],
  video: ["DEAPI"],
  audio: ["DEAPI"],
};
// --- End of Step 2 ---
function providerSupportsAction(provider: AIProviderValue, action: AIProviderCapability) {
  if (provider === "DEAPI") return ["text", "code", "image", "video", "audio"].includes(action);
  if (provider === "Groq") return ["text", "code"].includes(action);
  if (provider === "OctoAI") return ["text", "code"].includes(action); // Assuming it supports text and code
  return false;
}

function getActiveProvidersForAction(action: AIProviderCapability) {
  const order = FALLBACK_PROVIDER_ORDER_BY_ACTION[action] ?? FALLBACK_PROVIDER_ORDER;
  return order.filter((provider) => isProviderConfigured(provider) && providerSupportsAction(provider, action)) as AIProviderValue[];
}

function getProvidersForAction(action: AIProviderCapability) {
  if (AI_PROVIDER === "AUTO") {
    const providers = getActiveProvidersForAction(action);
    if (providers.length === 0) {
      throw new Error(`No suitable AI provider configured for ${action}. Please set DEAPI_API_KEY or Gemini_API_KEY.`);
    }
    return providers;
  }

  if (!AVAILABLE_AI_PROVIDERS.includes(AI_PROVIDER as any)) {
    throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`);
  }

  const explicitProviders = [AI_PROVIDER as AIProviderValue].filter(
    (provider) => isProviderConfigured(provider) && providerSupportsAction(provider, action)
  );

  if (explicitProviders.length > 0) {
    return explicitProviders;
  }

  const fallbackProviders = getActiveProvidersForAction(action);
  if (fallbackProviders.length === 0) {
    throw new Error(
      "No AI provider is configured. Please set Groq_API_KEY or DEAPI_API_KEY in your environment variables."
    );
  }

  return fallbackProviders;
}

const DEAPI_HEADERS = {
  Authorization: `Bearer ${DEAPI_API_KEY}`,
  Accept: "application/json",
};

const OctoAI_HEADERS = {
  Authorization: `Bearer ${OctoAI_API_KEY}`,
  "Content-Type": "application/json",
};

function normalizeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function deapiFetch(path: string, body: unknown, maxRetries: number = 2) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${DEAPI_API_BASE}${path}`, {
        method: "POST",
        headers: {
          ...DEAPI_HEADERS,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const errorMsg = `deAPI.ai request failed (${response.status}): ${text}`;

        // Handle deprecated video route fallback when the provider still calls /api/v2/video.
        if (response.status === 404 && path === "/api/v2/video") {
          console.log("[AI] deAPI route /api/v2/video not found, retrying with /api/v2/videos/generations");
          return await deapiFetch("/api/v2/videos/generations", body, maxRetries);
        }

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(errorMsg);
        }

        lastError = new Error(errorMsg);
        if (attempt < maxRetries) {
          console.log(`[AI] DEAPI request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }
        throw lastError;
      }

      return await response.json();
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Don't retry on intentional aborts or non-retryable errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = new Error(`deAPI.ai request timed out after 30 seconds`);
          if (attempt < maxRetries) {
            console.log(`[AI] DEAPI request timeout (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          throw lastError;
        }
        
        // Retry on network errors
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
          lastError = error;
          if (attempt < maxRetries) {
            console.log(`[AI] DEAPI network error (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          throw new Error(`deAPI.ai network error after ${maxRetries + 1} attempts: ${error.message}`);
        }
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw lastError ?? new Error("deAPI.ai request failed after retries");
}

// --- 3. Create a fetch helper for the new provider ---
async function octoAiFetch(path: string, body: unknown) {
  const response = await fetch(`${OctoAI_API_BASE}${path}`, {
    method: "POST",
    headers: OctoAI_HEADERS,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    // This is a standard OpenAI-compatible API, so the error format is likely similar
    const errorJson = JSON.parse(text);
    throw new Error(`OctoAI request failed (${response.status}): ${errorJson?.error?.message ?? text}`);
  }

  return await response.json();
}

// Groq fetch function (OpenAI-compatible)
async function groqFetch(path: string, body: unknown) {
  const response = await fetch(`${Groq_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Groq_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const errorJson = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    })();
    throw new Error(`Groq request failed (${response.status}): ${errorJson?.error?.message ?? text}`);
  }

  return await response.json();
}

async function deapiFetchAndPoll(path: string, body: unknown) {
  const json = await deapiFetch(path, body);
  const requestId = json?.data?.request_id ?? json?.request_id;
  if (!requestId) {
    return json;
  }
  return await pollDeapiJobStatus(requestId);
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error("Invalid data URL for source audio.");
  const mimeType = match[1];
  const base64Data = match[2];
  const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  return new Blob([binary], { type: mimeType });
}

function getFileExtensionForMimeType(mimeType: string) {
  switch (mimeType.toLowerCase()) {
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "audio/flac":
      return "flac";
    case "audio/ogg":
      return "ogg";
    case "audio/x-m4a":
    case "audio/mp4":
      return "m4a";
    default:
      return "bin";
  }
}

async function pollDeapiJobStatus(requestId: string, maxAttempts: number = 60, interval: number = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${DEAPI_API_BASE}/api/v2/jobs/${requestId}`, {
      method: "GET",
      headers: DEAPI_HEADERS,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`deAPI.ai status request failed (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const data = payload?.data;

    if (!data) {
      throw new Error(`Invalid deAPI.ai job status response: ${JSON.stringify(payload)}`);
    }

    if (data.status === "done") {
      return data;
    }

    if (data.status === "error") {
      throw new Error(`deAPI.ai job failed: ${data.error_message ?? data.message ?? JSON.stringify(data)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error("deAPI.ai job polling timed out.");
}

async function deapiAudioFetch(body: Record<string, unknown>, sourceAudio?: string) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    formData.append(key, String(value));
  }

  if (sourceAudio) {
    const blob = dataUrlToBlob(sourceAudio);
    const extension = getFileExtensionForMimeType(blob.type);
    formData.append("reference_audio", blob, `source.${extension}`);
  }

  const response = await fetch(`${DEAPI_API_BASE}/api/v2/audio/music`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEAPI_API_KEY}`,
      Accept: "application/json",
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`deAPI.ai audio request failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const requestId = json?.data?.request_id ?? json?.request_id;
  if (!requestId) {
    return json;
  }

  return await pollDeapiJobStatus(requestId);
}

function parseTextResponse(data: any) {
  const content = data?.choices?.[0]?.message?.content ?? data?.output_text ?? data?.text ?? data?.data?.[0]?.text;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.join("");
  return typeof data === "string" ? data : JSON.stringify(data);
}

function parseImageResponse(data: any) {
  const image =
    data?.data?.[0]?.url ??
    data?.data?.result_url ??
    data?.images?.[0]?.url ??
    data?.result_url ??
    data?.output?.[0]?.url;
  if (typeof image === "string") return image;
  return typeof data === "string" ? data : JSON.stringify(data);
}

function parseVideoResponse(data: any) {
  const video =
    data?.data?.[0]?.url ??
    data?.data?.result_url ??
    data?.videos?.[0]?.url ??
    data?.result_url ??
    data?.output?.[0]?.url;
  if (typeof video === "string") return video;
  return typeof data === "string" ? data : null;
}

function parseAudioResponse(data: any) {
  const audio =
    data?.data?.[0]?.url ??
    data?.data?.result_url ??
    data?.result_url ??
    data?.audios?.[0]?.url ??
    data?.audio?.[0]?.url ??
    data?.audio?.url ??
    data?.output?.[0]?.url ??
    data?.url;

  if (typeof audio === "string" && (audio.startsWith("http") || audio.startsWith("data:audio/"))) {
    return audio;
  }

  throw new Error("Réponse audio invalide reçue du fournisseur IA.");
}

function formatToSize(format: string | undefined) {
  switch (format) {
    case "square":
      return { size: "1024x1024", width: 1024, height: 1024 };
    case "portrait":
      return { size: "1024x1536", width: 1024, height: 1536 };
    case "landscape":
      return { size: "1536x1024", width: 1536, height: 1024 };
    default:
      return { size: "1024x1024", width: 1024, height: 1024 };
  }
}

function clampSteps(steps: number | undefined) {
  if (steps === undefined || !Number.isFinite(steps)) return 10;
  return Math.max(1, Math.min(10, Math.floor(steps)));
}

function parseDuration(duration: string | undefined) {
  const value = Number(duration);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function getModelForProvider(provider: AIProviderValue, requestedModel?: string): string {
  if (!requestedModel) {
    if (provider === "DEAPI") return DEAPI_MODEL;
    if (provider === "Groq") return Groq_MODEL;
    if (provider === "OctoAI") return OctoAI_MODEL;
  }
  
  // For Groq, only accept models that look like Groq models (not gpt-*, not gemini-*)
  if (provider === "Groq" && typeof requestedModel === 'string') {
    const lower = requestedModel.toLowerCase();
    if (!lower.startsWith("gpt-") && !lower.startsWith("gemini-") && !lower.startsWith("claude-")) {
      return requestedModel;
    }
    // Invalid model for Groq, use default
    console.log(`[AI] Ignoring incompatible model ${requestedModel} for Groq, using ${Groq_MODEL}`);
    return Groq_MODEL;
  }
  
  // Basic validation for other providers
  if (provider === "OctoAI" && typeof requestedModel === 'string' && !requestedModel.toLowerCase().startsWith("gemini")) return requestedModel;
  if (provider === "DEAPI") return requestedModel ?? DEAPI_MODEL;
  
  return provider === "Groq" ? Groq_MODEL : provider === "OctoAI" ? OctoAI_MODEL : DEAPI_MODEL;
}

type TextRequestParams = {
  systemMessage: string;
  userMessage: string;
  model?: string;
  maxTokens: number;
};

async function handleOpenAICompatibleRequest(provider: "DEAPI" | "OctoAI", params: TextRequestParams) {
  const { systemMessage, userMessage, model, maxTokens } = params;
  const fetchFn = provider === "DEAPI" ? deapiFetch : octoAiFetch;
  const modelToUse = getModelForProvider(provider, model);

  const body = {
    model: modelToUse,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  };

  if (provider === "DEAPI") {
    const deapiPaths = ["/api/v1/chat/completions", "/v1/chat/completions", "/api/v2/chat/completions"];
    let data: any = null;
    let lastErr: unknown = null;
    for (const p of deapiPaths) {
      try {
        data = await fetchFn(p, body);
        break;
      } catch (err) {
        lastErr = err;
        const errMsg = (err as Error)?.message;
        if (typeof errMsg === "string" && !errMsg.includes("404")) break;
      }
    }
    if (!data) throw lastErr ?? new Error("deAPI.ai chat request failed");
    return parseTextResponse(data);
  } else {
    const data = await fetchFn("/chat/completions", body);
    return parseTextResponse(data);
  }
}

async function handleGroqRequest(params: TextRequestParams) {
  const { systemMessage, userMessage, model, maxTokens } = params;
  const modelToUse = getModelForProvider("Groq", model);

  const data = await groqFetch("/chat/completions", {
    model: modelToUse,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  });

  return parseTextResponse(data);
}

async function requestTextFromProvider(provider: AIProviderValue, systemMessage: string, userMessage: string, model?: string) {
  const params: TextRequestParams = { systemMessage, userMessage, model, maxTokens: 1200 };
  if (provider === "DEAPI" || provider === "OctoAI") {
    return handleOpenAICompatibleRequest(provider, params);
  }
  if (provider === "Groq") {
    return handleGroqRequest(params);
  }
  throw new Error(`Unsupported AI provider for text: ${provider}`);
}

async function requestCodeFromProvider(provider: AIProviderValue, prompt: string, options: { language?: string; framework?: string; complexity?: string }) {
  const systemMessage = "Tu es un assistant IA expert en génération et refactorisation de code.";
  const userMessage = `Génère ou modifie du code en ${options.language ?? "javascript"} ${options.framework && options.framework !== "aucun" ? `pour ${options.framework}` : ""} avec une complexité ${options.complexity ?? "intermédiaire"}. Voici le prompt :\n\n${prompt}`;
  
  const params: TextRequestParams = { systemMessage, userMessage, maxTokens: 1400 };
  if (provider === "DEAPI" || provider === "OctoAI") {
    return handleOpenAICompatibleRequest(provider, params);
  }
  if (provider === "Groq") {
    return handleGroqRequest(params);
  }
  throw new Error(`Unsupported AI provider for code: ${provider}`);
}

async function requestImageFromProvider(
  provider: AIProviderValue,
  prompt: string,
  options: { format?: string; quality?: string; sourceImage?: string; seed?: number; steps?: number }
) {
  if (provider === "DEAPI") {
    const { size, width, height } = formatToSize(options.format);
    const steps = clampSteps(options.steps);
    const seed = Number.isFinite(options.seed ?? NaN) ? options.seed : 0;

    // For image-to-image, include source image reference in the prompt
    // since DEAPI doesn't have a separate edit endpoint
    let enhancedPrompt = prompt;
    if (options.sourceImage) {
      enhancedPrompt = `[Image source fournie] Transforme cette image selon la description suivante : ${prompt}`;
    }

    const data = await deapiFetchAndPoll("/api/v2/images/generations", {
      model: DEAPI_IMAGE_MODEL,
      prompt: enhancedPrompt,
      size,
      width,
      height,
      seed,
      steps,
      quality: options.quality ?? "standard",
    });
    return parseImageResponse(data);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function requestAudioFromProvider(
  provider: AIProviderValue,
  prompt: string,
  options: { sourceAudio?: string }
) {
  if (provider === "DEAPI") {
    // deAPI.ai audio generation should receive the music prompt only.
    // Avoid passing `lyrics` or `caption` fields to prevent lyric-focused output.
    const body: Record<string, unknown> = {
      model: DEAPI_MODEL,
      prompt,
      // duration in seconds
      duration: 30,
      // Model-generation controls - deAPI minimum required values
      inference_steps: 8,
      guidance_scale: 1,
      // seed 0 indicates random seed
      seed: 0,
      // desired output format
      format: "mp3",
    };

    const data = await deapiAudioFetch(body, options.sourceAudio);
    return parseAudioResponse(data);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function requestVideoFromProvider(
  provider: AIProviderValue,
  prompt: string,
  options: { duration?: string; sourceVideo?: string }
) {
  if (provider === "DEAPI") {
    const duration = parseDuration(options.duration) || 5;
    const data = await deapiFetchAndPoll("/api/v2/videos/generations", {
      model: DEAPI_VIDEO_MODEL,
      prompt,
      width: 512,
      height: 512,
      steps: 4,
      guidance: 1,
      seed: -1,
      frames: 49,
      fps: 24,
      duration,
      source_video: options.sourceVideo,
    });
    return parseVideoResponse(data);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function streamTextFromProvider(
  provider: AIProviderValue,
  systemMessage: string,
  userMessage: string,
  onChunk: StreamingCallback
) {
  const text = await requestTextFromProvider(provider, systemMessage, userMessage);
  onChunk(text);
}

export async function generateTextAI(prompt: string, options: { style?: string; length?: string; tone?: string }, model?: string) {
  const normalizedPrompt = normalizePrompt(prompt);
  const intent = extractPromptIntent(prompt);
  const systemMessage = "Tu es un assistant IA professionnel qui génère du contenu clair, utile et élégant en français.";
  const userMessage = `Génère un texte ${options.style ?? "professionnel"} de longueur ${options.length ?? "moyenne"} au ton ${options.tone ?? "informatif"}. Voici le prompt (normalisé) :\n\n${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(intent)}`;
  const providers = getProvidersForAction("text");
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestTextFromProvider(provider, systemMessage, userMessage, model);
    } catch (error) {
      errors.push(`${provider}: ${normalizeErrorMessage(error)}`);
    }
  }
  throw new Error(`Text generation failed. Details: ${errors.join(" | ")}`);
}

export async function chatWithAI(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, model?: string) {
  const providers = getProvidersForAction("text");
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const normalizedMessages = messages.map((m) => ({ ...m, content: normalizePrompt(m.content) }));
      return await requestTextFromProvider(provider, "", normalizedMessages.map((message) => `${message.role}: ${message.content}`).join("\n"), model);
    } catch (error) {
      errors.push(`${provider}: ${normalizeErrorMessage(error)}`);
    }
  }
  throw new Error(`Chat failed. Details: ${errors.join(" | ")}`);
}

export async function generateCodeAI(prompt: string, options: { language?: string; framework?: string; complexity?: string }) {
  const providers = getProvidersForAction("code");
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestCodeFromProvider(provider, prompt, options);
    } catch (error) {
      errors.push(`${provider}: ${normalizeErrorMessage(error)}`);
    }
  }
  throw new Error(`Code generation failed. Details: ${errors.join(" | ")}`);
}

export async function generateImageAI(
  prompt: string,
  options: { format?: string; quality?: string; sourceImage?: string; seed?: number; steps?: number }
) {
  const providers = getProvidersForAction("image");
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestImageFromProvider(provider, prompt, options);
    } catch (error) {
      errors.push(`${provider}: ${normalizeErrorMessage(error)}`);
    }
  }
  throw new Error(`Image generation failed. Details: ${errors.join(" | ")}`);
}

export async function generateAudioAI(prompt: string, options: { sourceAudio?: string } = {}) {
  const providers = getProvidersForAction("audio");
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestAudioFromProvider(provider, prompt, options);
    } catch (error) {
      errors.push(`${provider}: ${normalizeErrorMessage(error)}`);
    }
  }
  throw new Error(`Audio generation failed. Details: ${errors.join(" | ")}`);
}

export async function generateVideoAI(prompt: string, options: { duration?: string; sourceVideo?: string }) {
  const providers = getProvidersForAction("video");
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestVideoFromProvider(provider, prompt, options);
    } catch (error) {
      errors.push(`${provider}: ${normalizeErrorMessage(error)}`);
    }
  }
  throw new Error(`Video generation failed. Details: ${errors.join(" | ")}`);
}

interface StreamingCallback {
  (chunk: string): void;
}

export async function generateTextAIStreaming(prompt: string, options: { style?: string; length?: string; tone?: string }, onChunk: StreamingCallback, model?: string) {
  const systemMessage = "Tu es un assistant IA professionnel qui génère du contenu clair, utile et élégant en français.";
  const userMessage = `Génère un texte ${options.style ?? "professionnel"} de longueur ${options.length ?? "moyenne"} au ton ${options.tone ?? "informatif"}. Donne un résultat cohérent et structuré pour le prompt suivant :\n\n${prompt}`;
  const providers = getProvidersForAction("text");
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      await streamTextFromProvider(provider, systemMessage, userMessage, onChunk);
      return;
    } catch (error) {
      errors.push(`${provider}: ${normalizeErrorMessage(error)}`);
    }
  }
  throw new Error(`Text streaming failed. Details: ${errors.join(" | ")}`);
}

export async function requestCodeAIStreaming(prompt: string, options: { language?: string; framework?: string; complexity?: string }, onChunk: StreamingCallback, model?: string) {
  const systemMessage = "Tu es un assistant IA expert en génération et refactorisation de code. Réponds en français et fournis du code propre, documenté et prêt à utiliser.";
  const userMessage = `Génère ou modifie du code en ${options.language ?? "javascript"} ${options.framework && options.framework !== "aucun" ? `pour ${options.framework}` : ""} avec une complexité ${options.complexity ?? "intermédiaire"}. Voici le prompt :\n\n${prompt}`;
  const providers = getProvidersForAction("code");
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      await streamTextFromProvider(provider, systemMessage, userMessage, onChunk);
      return;
    } catch (error) {
      errors.push(`${provider}: ${normalizeErrorMessage(error)}`);
    }
  }
  throw new Error(`Code streaming failed. Details: ${errors.join(" | ")}`);
}

export async function webSearch(query: string, numResults: number = 5): Promise<SearchResponse> {
  const startTime = Date.now();
  let results: SearchResult[] = [];
  
  if (SEARCH_CREDENTIALS.apiKey && SEARCH_CREDENTIALS.searchEngineId) {
    results = await searchWithGoogle(query, numResults);
  } else {
    results = await searchWithDuckDuckGo(query, numResults);
  }
  
  return {
    query,
    results,
    searchTime: Date.now() - startTime,
    hasMoreResults: results.length === numResults,
  };
}

type SearchResultItem = {
  title: string;
  url: string;
  snippet: string;
};

const SEARCH_CREDENTIALS = {
  apiKey: envOrDefault(process.env.SEARCH_API_KEY, ""),
  searchEngineId: envOrDefault(process.env.SEARCH_ENGINE_ID, ""),
};

async function searchWithDuckDuckGo(query: string, numResults: number = 5): Promise<SearchResultItem[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_redirect=1&no_html=1&skip_disambig=1`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const results: SearchResultItem[] = [];
    
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || "",
        snippet: data.AbstractText,
      });
    }
    
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, numResults)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(" - ")[0] || query,
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }
    
    return results.slice(0, numResults);
  } catch {
    return [];
  }
}

async function searchWithGoogle(query: string, numResults: number = 5): Promise<SearchResultItem[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${SEARCH_CREDENTIALS.apiKey}&cx=${SEARCH_CREDENTIALS.searchEngineId}&q=${encodedQuery}&num=${numResults}`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!data.items) return [];
    
    return data.items.map((item: any): SearchResultItem => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
    })).slice(0, numResults);
  } catch {
    return [];
  }
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  searchTime: number;
  hasMoreResults: boolean;
}

export async function chatWithAIWithSearch(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model?: string,
  enableSearch: boolean = false
): Promise<{ response: string; searchResults?: SearchResponse; usedSearch: boolean }> {
  const lastUserMessage = messages.length > 0 ? messages[messages.length - 1].content : "";
  const shouldSearch = enableSearch && /recherche|search|chercher|trouver|actualité|news|dernier|recent|maintenant|aujourd'hui/i.test(lastUserMessage);
  
  let searchResults: SearchResponse | undefined;
  let usedSearch = false;
  let enhancedMessages = [...messages];
  
  if (shouldSearch) {
    try {
      searchResults = await webSearch(lastUserMessage, 3);
      usedSearch = searchResults.results.length > 0;
      
      if (usedSearch && searchResults.results.length > 0) {
        const searchContext = `\n\n[Contexte de recherche web - ${new Date().toLocaleDateString('fr-FR')}]
Voici quelques résultats pertinents pour aider à répondre:
${searchResults.results.map((r, i) => `${i + 1}. ${r.title}: ${r.snippet} (Source: ${r.url})`).join('\n')}\n\nUtilisez ces informations pour fournir une réponse précise et citez les sources quand c'est pertinent.`;
        
        enhancedMessages = [
          { ...messages[0], content: messages[0].content + searchContext },
          ...messages.slice(1),
        ];
      }
    } catch (error) {
      console.error('Web search failed:', error);
    }
  }
  
  const response = await chatWithAI(enhancedMessages, model);
  
  return {
    response,
    searchResults: usedSearch ? searchResults : undefined,
    usedSearch,
  };
}

export function extractImagesFromResponse(text: string): string[] {
  const imageRegex = /https?:\/\/[^"]+\.(?:jpe?g|png|gif|webp|svg|bmp)(?:\?[^\s"<>]*)?/gi;
  const matches = text.match(imageRegex);
  return matches ? [...new Set(matches)] : [];
}

export function extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2],
    });
  }
  
  return blocks;
}
