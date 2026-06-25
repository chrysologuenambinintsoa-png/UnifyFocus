import fs from "fs";
import path from "path";
import { normalizePrompt, extractPromptIntent } from "./prompt";
import { GoogleGenAI } from "@google/genai";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {} as Record<string, string>;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const entries: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function ensureLocalEnvLoaded() {
  if (process.env.HF_API_KEY && process.env.HF_API_BASE) {
    return;
  }

  const root = process.cwd();
  const envFiles = [".env.local", ".env"];

  for (const envFile of envFiles) {
    const envPath = path.join(/* turbopackIgnore: true */ root, envFile);
    const envData = loadEnvFile(envPath);

    for (const [key, value] of Object.entries(envData)) {
      if (!process.env[key] && value !== undefined) {
        process.env[key] = value;
      }
    }
  }
}

ensureLocalEnvLoaded();

const rawAiProvider = process.env.AI_PROVIDER?.trim().toUpperCase() ?? "AUTO";
const AI_PROVIDER = rawAiProvider;

function envOrDefault(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "" ? trimmed : fallback;
}

function envArray(...values: Array<string | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

const SILICONFLOW_API_KEY = envOrDefault(process.env.SILICONFLOW_API_KEY, "");
const SILICONFLOW_API_BASE = envOrDefault(process.env.SILICONFLOW_API_BASE?.replace(/\/+$/, ""), "https://api.siliconflow.com/v1");
const SILICONFLOW_API_BASES = Array.from(
  new Set([
    SILICONFLOW_API_BASE,
    "https://api.siliconflow.com/v1",
  ].filter(Boolean))
);
const SILICONFLOW_MODEL = envOrDefault(process.env.SILICONFLOW_MODEL, "zai-org/GLM-5.2");
const SILICONFLOW_MODEL_ALTS = envArray(
  process.env.SILICONFLOW_MODEL_ALT_1,
  process.env.SILICONFLOW_MODEL_ALT_2,
  process.env.SILICONFLOW_MODEL_ALT_3,
  process.env.SILICONFLOW_MODEL_ALT_4,
  process.env.SILICONFLOW_MODEL_ALT_5,
);

const SILICONFLOW_IMAGE_MODEL = envOrDefault(process.env.SILICONFLOW_IMAGE_MODEL, "Tongyi-MAI/Z-Image-Turbo");
const SILICONFLOW_IMAGE_MODEL_ALTS = envArray(
  process.env.SILICONFLOW_IMAGE_MODEL_ALT_1,
  process.env.SILICONFLOW_IMAGE_MODEL_ALT_2,
  process.env.SILICONFLOW_IMAGE_MODEL_ALT_3,
  process.env.SILICONFLOW_IMAGE_MODEL_ALT_4,
  process.env.SILICONFLOW_IMAGE_MODEL_ALT_5,
);
const SILICONFLOW_IMAGE_EDIT_MODEL = envOrDefault(process.env.SILICONFLOW_IMAGE_EDIT_MODEL, "Qwen/Qwen-Image-Edit");
const SILICONFLOW_IMAGE_EDIT_MODEL_ALTS = envArray(
  process.env.SILICONFLOW_IMAGE_EDIT_MODEL_ALT_1,
  process.env.SILICONFLOW_IMAGE_EDIT_MODEL_ALT_2,
);

const SILICONFLOW_VIDEO_MODEL = envOrDefault(process.env.SILICONFLOW_VIDEO_MODEL, "Wan-AI/Wan2.2-T2V-A14B");
const SILICONFLOW_VIDEO_MODEL_ALTS = envArray(process.env.SILICONFLOW_VIDEO_MODEL_ALT_1);
const SILICONFLOW_VIDEO_EDIT_MODEL = envOrDefault(process.env.SILICONFLOW_VIDEO_EDIT_MODEL, "Wan-AI/Wan2.2-I2V-A14B");
const SILICONFLOW_VIDEO_EDIT_MODEL_ALTS = envArray(process.env.SILICONFLOW_VIDEO_EDIT_MODEL_ALT_1);

const GROQ_API_KEY = envOrDefault(process.env.GROQ_API_KEY, "");
const GROQ_API_BASE = envOrDefault(process.env.GROQ_API_BASE?.replace(/\/+$|\?$|\s+$/g, ""), "https://api.groq.com/openai/v1");
const GROQ_MODEL = envOrDefault(process.env.GROQ_MODEL, "gpt-4o");

const GITHUB_MODEL_API_KEY = envOrDefault(process.env.GITHUB_MODEL_API_KEY, "");
const GITHUB_MODEL_API_BASE = envOrDefault(process.env.GITHUB_MODEL_API_BASE?.replace(/\/+$|\?$|\s+$/g, ""), "https://api.github.com");
const GITHUB_MODEL_MODEL = envOrDefault(process.env.GITHUB_MODEL_MODEL, "gpt-4o");

const GEMINI_API_KEY = envOrDefault(process.env.GEMINI_API_KEY, "");
const GEMINI_API_BASE = envOrDefault(process.env.GEMINI_API_BASE?.replace(/\/+$/, ""), "https://api.ai.google.com");
const GEMINI_MODEL = envOrDefault(process.env.GEMINI_MODEL, "gemini-1.5-pro");
const GEMINI_VIDEO_MODEL = envOrDefault(process.env.GEMINI_VIDEO_MODEL, "veo-2.0-generate-001");

const HF_API_KEY = envOrDefault(process.env.HF_API_KEY, "");
const HF_API_BASE = envOrDefault(process.env.HF_API_BASE?.replace(/\/+$/, ""), "https://api-inference.huggingface.co");
const HF_VIDEO_MODEL = envOrDefault(process.env.HF_VIDEO_MODEL, "damo-vilab/text-to-video-ms-1.7b");

const AIMUSIC_API_KEY = envOrDefault(process.env.AIMUSIC_API_KEY, "");
const AIMUSIC_API_BASE = envOrDefault(process.env.AIMUSIC_API_BASE?.replace(/\/+$/, ""), "https://api.ai-music.com/v1");
const AIMUSIC_MODEL = envOrDefault(process.env.AIMUSIC_MODEL, "audiomix-1");

const AVAILABLE_AI_PROVIDERS = ["AIMUSIC", "HUGGINGFACE", "GEMINI", "GROQ", "SILICONFLOW", "GITHUB_MODEL"] as const;
type AIProviderValue = (typeof AVAILABLE_AI_PROVIDERS)[number];

type AIProviderCapability = "text" | "code" | "image" | "video" | "audio";

function isProviderConfigured(provider: AIProviderValue) {
  switch (provider) {
    case "SILICONFLOW":
      return !!SILICONFLOW_API_KEY;
    case "GROQ":
      return !!GROQ_API_KEY;
    case "GITHUB_MODEL":
      return !!GITHUB_MODEL_API_KEY;
    case "GEMINI":
      return !!GEMINI_API_KEY;
    case "HUGGINGFACE":
      return !!HF_API_KEY;
    case "AIMUSIC":
      return !!AIMUSIC_API_KEY;
  }
}

const FALLBACK_PROVIDER_ORDER: AIProviderValue[] = [
  "SILICONFLOW",
  "HUGGINGFACE",
  "GEMINI",
  "GROQ",
  "GITHUB_MODEL",
  "AIMUSIC",
];

const FALLBACK_PROVIDER_ORDER_BY_ACTION: Record<AIProviderCapability, AIProviderValue[]> = {
  text: ["GROQ", "SILICONFLOW", "GEMINI", "GITHUB_MODEL"],
  code: ["GITHUB_MODEL", "GROQ", "SILICONFLOW", "GEMINI"],
  image: ["SILICONFLOW"],
  video: ["SILICONFLOW", "GEMINI", "HUGGINGFACE"],
  audio: ["AIMUSIC"],
};

const ACTIVE_AI_PROVIDERS = FALLBACK_PROVIDER_ORDER.filter(isProviderConfigured);

// Note: We don't throw here during build time to allow the app to build.
// The error will be thrown at runtime when AI features are actually used.
// This is important because environment variables may not be fully loaded during build.

if (AI_PROVIDER !== "AUTO" && !AVAILABLE_AI_PROVIDERS.includes(AI_PROVIDER as AIProviderValue)) {
  throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`);
}

if (AI_PROVIDER !== "AUTO" && !isProviderConfigured(AI_PROVIDER as AIProviderValue)) {
  throw new Error(`Missing API key or configuration for provider ${AI_PROVIDER}`);
}

const SILICONFLOW_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
};

const GROQ_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${GROQ_API_KEY}`,
};

const GITHUB_MODEL_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${GITHUB_MODEL_API_KEY}`,
};

const AIMUSIC_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${AIMUSIC_API_KEY}`,
};

const HUGGINGFACE_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${HF_API_KEY}`,
};

const PROVIDER_CAPABILITIES: Record<AIProviderValue, AIProviderCapability[]> = {
  AIMUSIC: ["text", "audio"],
  HUGGINGFACE: ["video"],
  GEMINI: ["text", "code", "image", "video"],
  GROQ: ["text"],
  SILICONFLOW: ["text", "code", "image", "video"],
  GITHUB_MODEL: ["text", "code"],
};

function providerSupportsAction(
  provider: AIProviderValue,
  action: AIProviderCapability
) {
  return PROVIDER_CAPABILITIES[provider]?.includes(action);
}

function getActiveProvidersForAction(action: AIProviderCapability) {
  const order = FALLBACK_PROVIDER_ORDER_BY_ACTION[action] ?? FALLBACK_PROVIDER_ORDER;
  return order.filter(
    (provider) => isProviderConfigured(provider) && providerSupportsAction(provider, action)
  ) as AIProviderValue[];
}

function getProvidersForAction(action: AIProviderCapability) {
  if (AI_PROVIDER === "AUTO") {
    const providers = getActiveProvidersForAction(action);
    return providers;
  }

  const provider = AI_PROVIDER as AIProviderValue;
  if (!AVAILABLE_AI_PROVIDERS.includes(provider)) {
    throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`);
  }
  if (!isProviderConfigured(provider)) {
    throw new Error(`AI provider ${provider} is not configured for use.`);
  }
  if (!providerSupportsAction(provider, action)) {
    throw new Error(`AI provider ${provider} does not support ${action} generation.`);
  }

  return [provider];
}

function getApiErrorMessage(data: unknown, defaultMessage: string) {
  if (data && typeof data === "object") {
    if ("error" in data) {
      const errorPayload = (data as any).error;
      if (typeof errorPayload === "string") {
        return errorPayload;
      }
      if (errorPayload && typeof errorPayload === "object") {
        return (
          (errorPayload as { message?: string }).message ??
          JSON.stringify(errorPayload)
        );
      }
    }

    if ("message" in data && typeof (data as any).message === "string") {
      return (data as any).message;
    }
  }

  return defaultMessage;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause = (error as any).cause;
    const causeMessage =
      cause instanceof Error && cause.message ? ` (${cause.message})` : "";
    return `${error.message}${causeMessage}`;
  }

  return typeof error === "string" ? error : JSON.stringify(error);
}

async function siliconflowFetch(path: string, body: unknown) {
  let lastError: unknown = null;
  for (const base of SILICONFLOW_API_BASES) {
    console.log(`[ai] siliconflowFetch trying base: ${base}${path}`);
    try {
      const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: SILICONFLOW_HEADERS,
        body: JSON.stringify(body),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorMessage = getApiErrorMessage(data, response.statusText);
        throw new Error(`SiliconFlow request failed: ${errorMessage}`);
      }

      return data as any;
    } catch (fetchError) {
      lastError = fetchError;
      // try next base
    }
  }

  throw new Error(`SiliconFlow fetch failed: ${normalizeErrorMessage(lastError)}`);
}

async function groqFetch(path: string, body: unknown) {
  const url = `${GROQ_API_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: GROQ_HEADERS,
    body: JSON.stringify(body),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = getApiErrorMessage(data, response.statusText);
    throw new Error(`Groq request failed: ${errorMessage}`);
  }

  return data as any;
}

async function githubModelFetch(path: string, body: unknown) {
  const url = `${GITHUB_MODEL_API_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: GITHUB_MODEL_HEADERS,
    body: JSON.stringify(body),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = getApiErrorMessage(data, response.statusText);
    throw new Error(`GitHub model request failed: ${errorMessage}`);
  }

  return data as any;
}

async function aiMusicFetch(path: string, body: unknown) {
  const url = `${AIMUSIC_API_BASE}${path}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: AIMUSIC_HEADERS,
      body: JSON.stringify(body),
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMessage = getApiErrorMessage(data, response.statusText);
      throw new Error(`AI Music API request failed: ${errorMessage}`);
    }

    return data as any;
  } catch (fetchError) {
    if (fetchError instanceof Error) {
      const messageLower = fetchError.message.toLowerCase();
      if (messageLower.includes("getaddrinfo") || messageLower.includes("enotfound") || messageLower.includes("network")) {
        throw new Error(
          `AI Music API network error while requesting ${url}: ${fetchError.message}. ` +
            `Check AIMUSIC_API_BASE and DNS/connectivity to ${AIMUSIC_API_BASE}.`
        );
      }
    }
    throw fetchError;
  }
}

async function aiMusicAudioFetch(body: unknown) {
  const endpoints = [
    "/audio/generations",
    "/audios/generations",
    "/audio",
    "/audios",
  ];

  let lastError: unknown = null;
  for (const path of endpoints) {
    try {
      return await aiMusicFetch(path, body);
    } catch (error) {
      lastError = error;
      if (typeof error === "object" && error !== null) {
        const message = normalizeErrorMessage(error).toLowerCase();
        if (message.includes("not found") || message.includes("404")) {
          continue;
        }
      }
      break;
    }
  }

  throw new Error(
    `AI Music audio request failed: ${normalizeErrorMessage(lastError)}`
  );
}

async function siliconflowImageFetch(body: unknown) {
  let lastError: unknown = null;
  for (const base of SILICONFLOW_API_BASES) {
    try {
      const response = await fetch(`${base}/images/generations`, {
        method: "POST",
        headers: SILICONFLOW_HEADERS,
        body: JSON.stringify(body),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorMessage = getApiErrorMessage(data, response.statusText);
        throw new Error(`SiliconFlow image request failed: ${errorMessage}`);
      }

      return data as any;
    } catch (fetchError) {
      lastError = fetchError;
      // try next base
    }
  }

  throw new Error(`SiliconFlow image fetch failed: ${normalizeErrorMessage(lastError)}`);
}

async function siliconflowVideoFetch(body: unknown) {
  let lastError: unknown = null;
  for (const base of SILICONFLOW_API_BASES) {
    try {
      const response = await fetch(`${base}/videos/generations`, {
        method: "POST",
        headers: SILICONFLOW_HEADERS,
        body: JSON.stringify(body),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorMessage = getApiErrorMessage(data, response.statusText);
        throw new Error(`SiliconFlow video request failed: ${errorMessage}`);
      }

      return data as any;
    } catch (fetchError) {
      lastError = fetchError;
      // try next base
    }
  }

  throw new Error(`SiliconFlow video fetch failed: ${normalizeErrorMessage(lastError)}`);
}

async function huggingFaceVideoFetch(body: unknown) {
  const url = HF_API_BASE.includes("/models/")
    ? HF_API_BASE
    : `${HF_API_BASE}/models/${HF_VIDEO_MODEL}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: HUGGINGFACE_HEADERS,
      body: JSON.stringify(body),
    });
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
    throw new Error(`HuggingFace video fetch failed for ${url}: ${message}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = getApiErrorMessage(data, response.statusText);
    throw new Error(`HuggingFace video request failed: ${errorMessage}`);
  }

  if (data === null) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.startsWith("video/") || contentType === "application/octet-stream") {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = Buffer.from(bytes).toString("base64");
      return { data: [{ b64_json: base64 }] };
    }
  }

  return data as any;
}

function parseTextResponse(response: any) {
  return (
    response?.choices?.[0]?.message?.content?.trim?.() ||
    response?.output?.[0]?.content?.[0]?.text?.trim?.() ||
    response?.output?.[0]?.text?.trim?.() ||
    response?.outputs?.[0]?.content?.[0]?.text?.trim?.() ||
    response?.outputs?.[0]?.text?.trim?.() ||
    response?.response?.trim?.() ||
    response?.output_text?.trim?.() ||
    response?.text?.trim?.() ||
    "Désolé, l'IA n'a pas pu générer de texte pour cette requête."
  );
}

function parseImageResponse(response: any) {
  if (response?.data?.[0]?.url) {
    return response.data[0].url.trim();
  }

  if (response?.data?.[0]?.b64_json) {
    return `data:image/png;base64,${response.data[0].b64_json.trim()}`;
  }

  return (
    response?.output?.[0]?.content?.[0]?.image?.url?.trim?.() ||
    response?.output?.[0]?.image?.url?.trim?.() ||
    response?.output?.[0]?.image?.data ||
    response?.image?.url?.trim?.() ||
    response?.url?.trim?.() ||
    ""
  );
}

function parseVideoResponse(response: any) {
  if (response?.data?.[0]?.url) {
    return response.data[0].url.trim();
  }

  if (response?.data?.[0]?.b64_json) {
    return `data:video/mp4;base64,${response.data[0].b64_json.trim()}`;
  }

  return (
    response?.output?.[0]?.content?.[0]?.video?.url?.trim?.() ||
    response?.output?.[0]?.video?.url?.trim?.() ||
    response?.video?.url?.trim?.() ||
    response?.url?.trim?.() ||
    response?.response?.trim?.() ||
    ""
  );
}

function parseAudioResponse(response: any) {
  if (response?.data?.[0]?.url) {
    return response.data[0].url.trim();
  }

  if (response?.data?.[0]?.b64_json) {
    return `data:audio/mpeg;base64,${response.data[0].b64_json.trim()}`;
  }

  if (response?.data?.[0]?.b64_audio) {
    return `data:audio/mpeg;base64,${response.data[0].b64_audio.trim()}`;
  }

  if (response?.audio?.[0]?.url) {
    return response.audio[0].url.trim();
  }

  if (response?.audio?.url) {
    return response.audio.url.trim();
  }

  if (response?.output?.[0]?.content?.[0]?.audio?.url) {
    return response.output[0].content[0].audio.url.trim();
  }

  if (response?.output?.[0]?.audio?.url) {
    return response.output[0].audio.url.trim();
  }

  if (response?.url?.trim) {
    return response.url.trim();
  }

  throw new Error("AI Music API did not return a valid audio URL or base64 payload.");
}

// Helper to summarize provider responses without logging large base64 payloads
function summarizeResponse(resp: any) {
  try {
    if (!resp || typeof resp !== "object") return String(resp);
    const summary: Record<string, any> = {};
    for (const k of Object.keys(resp)) {
      const v = resp[k];
      if (typeof v === "string") {
        // avoid printing large base64 strings
        if (/^(data:|\s*\/{0,1}data:|[A-Za-z0-9+/=]{200,})/.test(v)) {
          summary[k] = `string(length=${v.length})`;
        } else {
          summary[k] = v;
        }
      } else if (Array.isArray(v)) {
        summary[k] = `array(len=${v.length})`;
      } else if (v && typeof v === "object") {
        summary[k] = `object(keys=${Object.keys(v).length})`;
      } else {
        summary[k] = typeof v;
      }
    }
    return summary;
  } catch (e) {
    return String(resp);
  }
}

function formatToSize(format?: string) {
  switch (format) {
    case "16:9":
      return "1280x720";
    case "9:16":
      return "720x1280";
    case "1:1":
    default:
      return "1024x1024";
  }
}

function parseDuration(duration?: string) {
  if (!duration) return 5;
  const parsed = Number(duration.replace(/[^0-9]/g, ""));
  return Number.isNaN(parsed) ? 5 : parsed;
}

interface ImageGenerationOptions {
  style?: string;
  format?: string;
  quality?: string;
  sourceImage?: string;
}

interface VideoGenerationOptions {
  duration?: string;
  style?: string;
  format?: string;
  sourceVideo?: string;
}

interface CodeGenerationOptions {
  language?: string;
  framework?: string;
  complexity?: string;
}

const GEMINI_CLIENT = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: GEMINI_API_BASE ? { baseUrl: GEMINI_API_BASE } : undefined,
    })
  : null;

function getActiveTextProviders(): AIProviderValue[] {
  return getActiveProvidersForAction("text");
}

function getActiveImageProviders(): AIProviderValue[] {
  return getActiveProvidersForAction("image");
}

function getActiveVideoProviders(): AIProviderValue[] {
  return getActiveProvidersForAction("video");
}

function getActiveAudioProviders(): AIProviderValue[] {
  return getActiveProvidersForAction("audio");
}

function getActiveCodeProviders(): AIProviderValue[] {
  return getActiveProvidersForAction("code");
}

function normalizeGroqModel(model?: string) {
  const effectiveModel = model?.trim() || GROQ_MODEL;
  const normalized = effectiveModel.toLowerCase();

  if (normalized === "gpt-4o-mini") {
    return "gpt-4o";
  }

  return effectiveModel;
}

function isGroqModelAccessError(message: string) {
  return /model.*does not exist|do not have access|not found|permission/i.test(
    message
  );
}

function getGroqModelCandidates(model?: string) {
  const candidates = new Set<string>();
  candidates.add(normalizeGroqModel(model));
  candidates.add(GROQ_MODEL);
  candidates.add("gpt-3.5-turbo");
  return Array.from(candidates);
}

async function requestTextFromProvider(
  provider: AIProviderValue,
  systemMessage: string,
  userMessage: string,
  model?: string
) {
  if (provider === "GEMINI") {
    if (!GEMINI_CLIENT) {
      throw new Error("Gemini provider is not configured.");
    }

    const data = await GEMINI_CLIENT.models.generateContent({
      model: model?.trim() || GEMINI_MODEL,
      contents: [systemMessage, userMessage],
      config: {
        temperature: 0.75,
        maxOutputTokens: 700,
      },
    });

    return parseTextResponse(data);
  }

  if (provider === "GROQ") {
    const candidates = getGroqModelCandidates(model);
    let lastError: unknown;

    for (const candidate of candidates) {
      try {
        const data = await groqFetch("/chat/completions", {
          model: candidate,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
          ],
          temperature: 0.75,
          max_tokens: 700,
        });

        return parseTextResponse(data);
      } catch (error) {
        lastError = error;
        const message = normalizeErrorMessage(error).toLowerCase();
        const isAccessError = isGroqModelAccessError(message);

        if (!isAccessError || candidate === candidates[candidates.length - 1]) {
          throw error;
        }

        // Try next fallback model.
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Groq request failed for all model candidates.");
  }

  if (provider === "SILICONFLOW") {
    const data = await siliconflowFetch("/chat/completions", {
      model: SILICONFLOW_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.75,
      max_tokens: 700,
    });

    return parseTextResponse(data);
  }

  if (provider === "AIMUSIC") {
    const data = await aiMusicFetch("/chat/completions", {
      model: AIMUSIC_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.75,
      max_tokens: 700,
    });

    return parseTextResponse(data);
  }

  if (provider === "GITHUB_MODEL") {
    const data = await githubModelFetch("/chat/completions", {
      model: GITHUB_MODEL_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.75,
      max_tokens: 700,
    });

    return parseTextResponse(data);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function requestCodeFromProvider(
  provider: AIProviderValue,
  prompt: string,
  options: CodeGenerationOptions
) {
  const systemMessage = `Tu es un assistant IA expert en génération et refactorisation de code. Réponds en français et fournis du code propre, documenté et prêt à utiliser.`;
  const userMessage = `Génère ou modifie du code en ${options.language ?? "javascript"} ${
    options.framework && options.framework !== "aucun"
      ? `pour ${options.framework}`
      : ""
  } avec une complexité ${options.complexity ?? "intermédiaire"}. Voici le prompt :\n\n${prompt}`;

  if (provider === "GITHUB_MODEL") {
    const data = await githubModelFetch("/chat/completions", {
      model: GITHUB_MODEL_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    return parseTextResponse(data);
  }

  if (provider === "GEMINI") {
    if (!GEMINI_CLIENT) {
      throw new Error("Gemini provider is not configured.");
    }
    const data = await GEMINI_CLIENT.models.generateContent({
      model: GEMINI_MODEL,
      contents: [systemMessage, userMessage],
      config: {
        temperature: 0.7,
        maxOutputTokens: 1200,
      },
    });
    return parseTextResponse(data);
  }

  if (provider === "SILICONFLOW") {
    const data = await siliconflowFetch("/chat/completions", {
      model: SILICONFLOW_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    return parseTextResponse(data);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

export async function generateTextAI(
  prompt: string,
  options: { style?: string; length?: string; tone?: string },
  model?: string
) {
  const normalizedPrompt = normalizePrompt(prompt);
  const intent = extractPromptIntent(prompt);

  const systemMessage = `Tu es un assistant IA professionnel qui génère du contenu clair, utile et élégant en français.`;
  // Provide the normalized prompt and lightweight metadata to the model to improve understanding.
  const userMessage = `Génère un texte ${options.style ?? "professionnel"} de longueur ${options.length ?? "moyenne"} au ton ${options.tone ?? "informatif"}. Voici le prompt (normalisé) :\n\n${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(intent)}`;

  const providers = getProvidersForAction("text");

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestTextFromProvider(provider, systemMessage, userMessage, model);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Text generation failed for all available providers. Details: ${errors.join(" | ")}`
  );
}

export async function chatWithAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model?: string
) {
  const providers = getProvidersForAction("text");

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      if (provider === "GROQ") {
        const normalizedModel = model?.trim() || GROQ_MODEL;
        // normalize any user message content before sending
        const normalizedMessages = messages.map((m) => ({ ...m, content: normalizePrompt(m.content) }));
        const data = await groqFetch("/chat/completions", {
          model: normalizedModel,
          messages: normalizedMessages,
          temperature: 0.75,
          max_tokens: 2000,
        });
        return parseTextResponse(data);
      }

      if (provider === "SILICONFLOW") {
        const normalizedMessages = messages.map((m) => ({ ...m, content: normalizePrompt(m.content) }));
        const data = await siliconflowFetch("/chat/completions", {
          model: SILICONFLOW_MODEL,
          messages: normalizedMessages,
          temperature: 0.75,
          max_tokens: 2000,
        });
        return parseTextResponse(data);
      }

      if (provider === "GITHUB_MODEL") {
        const normalizedMessages = messages.map((m) => ({ ...m, content: normalizePrompt(m.content) }));
        const data = await githubModelFetch("/chat/completions", {
          model: GITHUB_MODEL_MODEL,
          messages: normalizedMessages,
          temperature: 0.75,
          max_tokens: 2000,
        });
        return parseTextResponse(data);
      }
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Chat failed for all available providers. Details: ${errors.join(" | ")}`
  );
}

export async function generateCodeAI(
  prompt: string,
  options: CodeGenerationOptions
) {
  const providers = getProvidersForAction("code");

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestCodeFromProvider(provider, prompt, options);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Code generation failed for all available providers. Details: ${errors.join(" | ")}`
  );
}

async function requestImageFromProvider(
  provider: AIProviderValue,
  prompt: string,
  options: ImageGenerationOptions
) {
  if (provider === "SILICONFLOW") {
    const isEditMode = !!options.sourceImage;
    let body: any = {
      model: isEditMode ? SILICONFLOW_IMAGE_EDIT_MODEL : SILICONFLOW_IMAGE_MODEL,
      prompt,
      size: formatToSize(options.format),
    };

    if (isEditMode) {
      body.prompt = `Transforme l'image source selon le prompt suivant : ${prompt}`;
      
      // Add image in proper format - only use image field for SiliconFlow
      const src = String(options.sourceImage);
      if (src.startsWith("data:")) {
        // Extract base64 from data URL
        const parts = src.split(",");
        if (parts.length === 2) {
          body.image = parts[1]; // Send just the base64 part
        } else {
          body.image = src; // Fallback to full data URL
        }
      } else {
        body.image = src;
      }
    }

    // Adjust size for quality settings
    if (options.quality === "hd") {
      body.size = "1024x1024";
    } else if (options.quality === "ultra-hd") {
      body.size = "2048x2048";
    }

    try {
      console.log(`[ai] siliconflow image request: model=${body.model}, size=${body.size}, edit=${isEditMode}`);
      const data = await siliconflowImageFetch(body);
      try {
        console.log(`[ai] siliconflow image response summary:`, summarizeResponse(data));
      } catch {}
      return parseImageResponse(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[ai] image request failed with ${body.model}: ${msg}`);
      
      // Retry with alternate models
      const altModels = [
        ...SILICONFLOW_IMAGE_MODEL_ALTS,
        ...(isEditMode ? SILICONFLOW_IMAGE_EDIT_MODEL_ALTS : []),
      ].filter((m) => m && m !== body.model);
      
      for (const altModel of altModels) {
        const altBody = { ...body, model: altModel };
        console.log(`[ai] retrying image with alternate model: ${altModel}`);
        try {
          const data2 = await siliconflowImageFetch(altBody);
          try {
            console.log(`[ai] siliconflow image response summary (retry):`, summarizeResponse(data2));
          } catch {}
          return parseImageResponse(data2);
        } catch (retryErr) {
          console.log(`[ai] alternate model ${altModel} failed: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`);
        }
      }
      throw err;
    }
  }

  throw new Error(
    `Image generation is not supported for provider ${provider}. Available image providers are SILICONFLOW.`
  );
}

export async function generateImageAI(
  prompt: string,
  options: ImageGenerationOptions
) {
  const providers = getProvidersForAction("image");

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestImageFromProvider(provider, prompt, options);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Image generation failed for all available providers. Details: ${errors.join(" | ")}`
  );
}

async function requestVideoFromProvider(
  provider: AIProviderValue,
  prompt: string,
  options: VideoGenerationOptions
) {
  if (provider === "SILICONFLOW") {
    const isEditMode = !!options.sourceVideo;
    let body: any = {
      model: isEditMode ? SILICONFLOW_VIDEO_EDIT_MODEL : SILICONFLOW_VIDEO_MODEL,
      prompt,
    };
    
    // Only add optional parameters if they're relevant for SiliconFlow
    const duration = parseDuration(options.duration);
    if (duration && duration > 0) {
      body.duration = duration;
    }

    if (isEditMode) {
      body.prompt = `Transforme la vidéo source selon le prompt suivant : ${prompt}`;
      
      // Add video in proper format - only use video field for SiliconFlow
      const src = String(options.sourceVideo);
      if (src.startsWith("data:")) {
        // Extract base64 from data URL
        const parts = src.split(",");
        if (parts.length === 2) {
          body.video = parts[1]; // Send just the base64 part
        } else {
          body.video = src; // Fallback to full data URL
        }
      } else {
        body.video = src;
      }
    }

    try {
      console.log(`[ai] siliconflow video request: model=${body.model}, duration=${body.duration}, edit=${isEditMode}`);
      const data = await siliconflowVideoFetch(body);
      try {
        console.log(`[ai] siliconflow video response summary:`, summarizeResponse(data));
      } catch {}
      const result = parseVideoResponse(data);
      return result || parseTextResponse(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[ai] video request failed with ${body.model}: ${msg}`);
      
      // Retry with alternate models
      const altModels = [
        ...SILICONFLOW_VIDEO_MODEL_ALTS,
        ...(isEditMode ? SILICONFLOW_VIDEO_EDIT_MODEL_ALTS : []),
      ].filter((m) => m && m !== body.model);
      
      for (const altModel of altModels) {
        const altBody = { ...body, model: altModel };
        console.log(`[ai] retrying video with alternate model: ${altModel}`);
        try {
          const data2 = await siliconflowVideoFetch(altBody);
          try {
            console.log(`[ai] siliconflow video response summary (retry):`, summarizeResponse(data2));
          } catch {}
          const result2 = parseVideoResponse(data2);
          return result2 || parseTextResponse(data2);
        } catch (retryErr) {
          console.log(`[ai] alternate model ${altModel} failed: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`);
        }
      }
      throw err;
    }
  }

  if (provider === "GEMINI") {
    if (!GEMINI_CLIENT) {
      throw new Error("Gemini provider is not configured.");
    }

    const params: any = {
      model: GEMINI_VIDEO_MODEL,
      prompt,
      config: {
        // Gemini auto-selects the best video generation approach based on prompt.
        // A shorter poll interval is used because Gemini operations may complete quickly.
        responseMimeType: "video/mp4",
      },
    };

    if (options.sourceVideo) {
      const src = String(options.sourceVideo);
      const match = src.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        params.video = {
          data: match[2],
          mimeType: match[1],
        };
      } else {
        params.video = {
          uri: src,
        };
      }

      params.prompt = `Recompose ou transforme la vidéo source selon le prompt suivant : ${prompt}`;
    }

    let operation = await GEMINI_CLIENT.models.generateVideos(params);
    const start = Date.now();
    while (!operation.done && Date.now() - start < 120000) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      operation = await GEMINI_CLIENT.operations.getVideosOperation({ operation });
    }

    const videoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (videoAsset?.uri) {
      return videoAsset.uri.trim();
    }

    if (videoAsset?.videoBytes) {
      return `data:${videoAsset.mimeType ?? "video/mp4"};base64,${videoAsset.videoBytes}`.trim();
    }

    if (operation.response) {
      return parseVideoResponse(operation.response) || parseTextResponse(operation.response);
    }

    throw new Error("Gemini video generation did not return a valid video.");
  }

  if (provider === "HUGGINGFACE") {
    const body: any = {
      inputs: prompt,
      options: {
        wait_for_model: true,
      },
    };

    if (options.sourceVideo) {
      body.inputs = `Transforme la vidéo source selon le prompt suivant : ${prompt}`;
      body.video = options.sourceVideo;
    }

    const data = await huggingFaceVideoFetch(body);
    const maybeUrl = parseVideoResponse(data);
    if (maybeUrl) {
      return maybeUrl;
    }

    throw new Error("HuggingFace video API did not return a valid video URL or base64 payload.");
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function requestAudioFromProvider(
  provider: AIProviderValue,
  prompt: string,
  options: { sourceAudio?: string }
) {
  if (provider === "AIMUSIC") {
    const body: any = {
      model: AIMUSIC_MODEL,
      prompt,
      response_format: "url",
    };

    if (options.sourceAudio) {
      body.audio = options.sourceAudio;
      body.prompt = `Transforme l'audio source selon le prompt suivant : ${prompt}`;
    }

    const data = await aiMusicAudioFetch(body);
    return parseAudioResponse(data);
  }

  throw new Error(
    `Audio generation is not supported for provider ${provider}. Available audio providers are AIMUSIC.`
  );
}

export async function generateAudioAI(
  prompt: string,
  options: { sourceAudio?: string }
) {
  const providers = getProvidersForAction("audio");

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestAudioFromProvider(provider, prompt, options);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Audio generation failed for all available providers. Details: ${errors.join(" | ")}`
  );
}

export async function generateVideoAI(
  prompt: string,
  options: VideoGenerationOptions
) {
  const providers = getProvidersForAction("video");

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await requestVideoFromProvider(provider, prompt, options);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Video generation failed for all available providers. Details: ${errors.join(" | ")}`
  );
}

// ============================================================================
// Streaming Functions for Real-time Text/Code Generation
// ============================================================================

interface StreamingCallback {
  (chunk: string): void;
}

async function streamTextFromProvider(
  provider: AIProviderValue,
  systemMessage: string,
  userMessage: string,
  onChunk: StreamingCallback
) {
  if (provider === "GROQ") {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: GROQ_HEADERS,
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.75,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    return;
  }

  if (provider === "SILICONFLOW") {
    const response = await fetch(`${SILICONFLOW_API_BASE}/chat/completions`, {
      method: "POST",
      headers: SILICONFLOW_HEADERS,
      body: JSON.stringify({
        model: SILICONFLOW_MODEL,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.75,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`SiliconFlow request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    return;
  }

  if (provider === "GITHUB_MODEL") {
    const response = await fetch(`${GITHUB_MODEL_API_BASE}/chat/completions`, {
      method: "POST",
      headers: GITHUB_MODEL_HEADERS,
      body: JSON.stringify({
        model: GITHUB_MODEL_MODEL,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.75,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub Model request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    return;
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

export async function generateTextAIStreaming(
  prompt: string,
  options: { style?: string; length?: string; tone?: string },
  onChunk: StreamingCallback,
  model?: string
) {
  const systemMessage = `Tu es un assistant IA professionnel qui génère du contenu clair, utile et élégant en français.`;
  const userMessage = `Génère un texte ${options.style ?? "professionnel"} de longueur ${options.length ?? "moyenne"} au ton ${options.tone ?? "informatif"}. Donne un résultat cohérent et structuré pour le prompt suivant :\n\n${prompt}`;

  const providers = getProvidersForAction("text");

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      await streamTextFromProvider(provider, systemMessage, userMessage, onChunk);
      return;
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Text generation failed for all available providers. Details: ${errors.join(" | ")}`
  );
}

export async function requestCodeAIStreaming(
  prompt: string,
  options: CodeGenerationOptions,
  onChunk: StreamingCallback,
  model?: string
) {
  const systemMessage = `Tu es un assistant IA expert en génération et refactorisation de code. Réponds en français et fournis du code propre, documenté et prêt à utiliser. Fournis uniquement le code, sans explications textuelles autour.`;
  const userMessage = `Génère ou modifie du code en ${options.language ?? "javascript"} ${
    options.framework && options.framework !== "aucun"
      ? `pour ${options.framework}`
      : ""
  } avec une complexité ${options.complexity ?? "intermédiaire"}. Voici le prompt :\n\n${prompt}`;

  const providers = getProvidersForAction("code");

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      await streamTextFromProvider(provider, systemMessage, userMessage, onChunk);
      return;
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Code generation failed for all available providers. Details: ${errors.join(" | ")}`
  );
}
