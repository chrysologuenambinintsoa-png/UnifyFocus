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
  if (process.env.DEAPI_API_KEY) return;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") return;

  try {
    const root = process.cwd();
    const envFiles = [".env.local", ".env"];
    for (const envFile of envFiles) {
      const envPath = path.join(root, envFile);
      const envData = loadEnvFile(envPath);
      for (const [key, value] of Object.entries(envData)) {
        if (!process.env[key] && value !== undefined) process.env[key] = value;
      }
    }
  } catch {
    // ignore
  }
}

ensureLocalEnvLoaded();

const rawAiProvider = process.env.AI_PROVIDER?.trim().toUpperCase() ?? "DEAPI";
const AI_PROVIDER = rawAiProvider === "AUTO" ? "DEAPI" : rawAiProvider;

function envOrDefault(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "" ? trimmed : fallback;
}

function normalizeDeapiApiBase(value: string | undefined) {
  const trimmed = envOrDefault(value?.trim(), "");
  if (!trimmed) return "https://api.deapi.ai";
  if (/api\.ai-music\.com/i.test(trimmed)) return "https://api.deapi.ai";
  if (/oai\.deapi\.ai/i.test(trimmed)) return "https://api.deapi.ai";
  if (/api\.deapi\.ai/i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  return trimmed.replace(/\/+$/, "");
}

const DEAPI_API_KEY = envOrDefault(process.env.DEAPI_API_KEY, "");
const DEAPI_API_BASE = normalizeDeapiApiBase(process.env.DEAPI_API_BASE);
const DEAPI_MODEL = envOrDefault(process.env.DEAPI_MODEL, "AceStep_1_5_Turbo");
const DEAPI_IMAGE_MODEL = envOrDefault(process.env.DEAPI_IMAGE_MODEL, "Flux1schnell");
const DEAPI_IMAGE_EDIT_MODEL = envOrDefault(process.env.DEAPI_IMAGE_EDIT_MODEL, "Flux1schnell");
const DEAPI_VIDEO_MODEL = envOrDefault(process.env.DEAPI_VIDEO_MODEL, "Ltx2_3_22B_Dist_INT8");
const DEAPI_VIDEO_EDIT_MODEL = envOrDefault(process.env.DEAPI_VIDEO_EDIT_MODEL, "Ltx2_19B_Dist_FP8");

const AVAILABLE_AI_PROVIDERS = ["DEAPI"] as const;
type AIProviderValue = (typeof AVAILABLE_AI_PROVIDERS)[number];
type AIProviderCapability = "text" | "code" | "image" | "video" | "audio";

function isProviderConfigured(provider: AIProviderValue) {
  if (provider === "DEAPI") return Boolean(DEAPI_API_KEY);
  return false;
}

const FALLBACK_PROVIDER_ORDER: AIProviderValue[] = ["DEAPI"];
const FALLBACK_PROVIDER_ORDER_BY_ACTION: Record<AIProviderCapability, AIProviderValue[]> = {
  text: ["DEAPI"],
  code: ["DEAPI"],
  image: ["DEAPI"],
  video: ["DEAPI"],
  audio: ["DEAPI"],
};

function providerSupportsAction(provider: AIProviderValue, action: AIProviderCapability) {
  if (provider === "DEAPI") return ["text", "code", "image", "video", "audio"].includes(action);
  return false;
}

function getActiveProvidersForAction(action: AIProviderCapability) {
  const order = FALLBACK_PROVIDER_ORDER_BY_ACTION[action] ?? FALLBACK_PROVIDER_ORDER;
  return order.filter((provider) => isProviderConfigured(provider) && providerSupportsAction(provider, action)) as AIProviderValue[];
}

function getProvidersForAction(action: AIProviderCapability) {
  if (action === "audio") {
    const providers = getActiveProvidersForAction("audio");
    if (providers.length === 0) {
      throw new Error("No deAPI.ai provider is configured. Please set DEAPI_API_KEY in your environment variables.");
    }
    return providers;
  }

  if (AI_PROVIDER !== "DEAPI") {
    throw new Error(`Unsupported AI_PROVIDER: ${AI_PROVIDER}`);
  }

  const providers = [AI_PROVIDER as AIProviderValue].filter(
    (provider) => isProviderConfigured(provider) && providerSupportsAction(provider, action)
  );

  if (providers.length === 0) {
    throw new Error("No deAPI.ai provider is configured. Please set DEAPI_API_KEY in your environment variables.");
  }

  return providers;
}

const DEAPI_HEADERS = {
  Authorization: `Bearer ${DEAPI_API_KEY}`,
  Accept: "application/json",
};

function normalizeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function deapiFetch(path: string, body: unknown) {
  const response = await fetch(`${DEAPI_API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...DEAPI_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`deAPI.ai request failed (${response.status}): ${text}`);
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

  if (typeof audio === "string") return audio;
  return typeof data === "string" ? data : JSON.stringify(data);
}

function formatToSize(format: string | undefined) {
  switch (format) {
    case "square":
      return "1024x1024";
    case "portrait":
      return "1024x1536";
    case "landscape":
      return "1536x1024";
    default:
      return "1024x1024";
  }
}

function parseDuration(duration: string | undefined) {
  const value = Number(duration);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

async function requestTextFromProvider(provider: AIProviderValue, systemMessage: string, userMessage: string, model?: string) {
  if (provider === "DEAPI") {
    const data = await deapiFetch("/api/v2/chat/completions", {
      model: model ?? DEAPI_MODEL,
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

async function requestCodeFromProvider(provider: AIProviderValue, prompt: string, options: { language?: string; framework?: string; complexity?: string }) {
  const systemMessage = "Tu es un assistant IA expert en génération et refactorisation de code.";
  const userMessage = `Génère ou modifie du code en ${options.language ?? "javascript"} ${options.framework && options.framework !== "aucun" ? `pour ${options.framework}` : ""} avec une complexité ${options.complexity ?? "intermédiaire"}. Voici le prompt :\n\n${prompt}`;

  if (provider === "DEAPI") {
    const data = await deapiFetch("/api/v2/chat/completions", {
      model: DEAPI_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1400,
    });
    return parseTextResponse(data);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function requestImageFromProvider(provider: AIProviderValue, prompt: string, options: { format?: string; quality?: string; sourceImage?: string }) {
  if (provider === "DEAPI") {
    const isEditMode = Boolean(options.sourceImage);
    if (isEditMode) {
      throw new Error("deAPI image editing is not supported by this provider configuration.");
    }
    const body: Record<string, unknown> = {
      model: DEAPI_IMAGE_MODEL,
      prompt,
      width: 1024,
      height: 1024,
      guidance: 1,
      steps: 4,
      seed: -1,
    };
    if (options.quality === "hd") {
      body.width = 1024;
      body.height = 1024;
    } else if (options.quality === "ultra-hd") {
      body.width = 2048;
      body.height = 2048;
    }
    const data = await deapiFetchAndPoll("/api/v2/images/generations", body);
    return parseImageResponse(data);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function requestVideoFromProvider(provider: AIProviderValue, prompt: string, options: { duration?: string; sourceVideo?: string }) {
  if (provider === "DEAPI") {
    const isEditMode = Boolean(options.sourceVideo);
    if (isEditMode) {
      throw new Error("deAPI video editing is not supported by this provider configuration.");
    }
    const duration = parseDuration(options.duration);
    const body: Record<string, unknown> = {
      model: DEAPI_VIDEO_MODEL,
      prompt,
      width: 768,
      height: 768,
      guidance: 1,
      steps: 4,
      frames: duration ? Math.max(1, Math.min(120, Math.round(duration * 8))) : 16,
      fps: 8,
      seed: -1,
    };
    const data = await deapiFetchAndPoll("/api/v2/videos/generations", body);
    return parseVideoResponse(data) || parseTextResponse(data);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function requestAudioFromProvider(provider: AIProviderValue, prompt: string, options: { sourceAudio?: string; seed?: number } = {}) {
  if (provider === "DEAPI") {
    const seed = typeof options.seed === "number" ? options.seed : Math.floor(Math.random() * 1e9);
    const body: any = {
      model: DEAPI_MODEL,
      caption: prompt,
      lyrics: "[Instrumental]",
      duration: 30,
      inference_steps: 8,
      guidance_scale: 1,
      format: "mp3",
      seed,
    };
    const data = await deapiAudioFetch(body, options.sourceAudio);
    return parseAudioResponse(data);
  }

  throw new Error(`Audio generation is not supported for provider ${provider}. Please configure DEAPI_API_KEY for audio generation.`);
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

export async function generateImageAI(prompt: string, options: { format?: string; quality?: string; sourceImage?: string }) {
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

async function streamTextFromProvider(provider: AIProviderValue, systemMessage: string, userMessage: string, onChunk: StreamingCallback) {
  if (provider === "DEAPI") {
    const data = await deapiFetch("/api/v2/chat/completions", {
      model: DEAPI_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.75,
      max_tokens: 2000,
    });
    const text = parseTextResponse(data);
    onChunk(text);
    return;
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
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

// ============================================================================
// Web Search Capability
// ============================================================================

const SEARCH_CREDENTIALS = {
  apiKey: envOrDefault(process.env.SEARCH_API_KEY, ""),
  searchEngineId: envOrDefault(process.env.SEARCH_ENGINE_ID, ""),
};

interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

// Fallback: Use DuckDuckGo HTML scraping if no API key
async function searchWithDuckDuckGo(query: string, numResults: number = 5): Promise<SearchResultItem[]> {
  try {
    // Using a simple fetch approach - in production, use a proper API
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_redirect=1&no_html=1&skip_disambig=1`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const results: SearchResultItem[] = [];
    
    // Extract from AbstractText and RelatedTopics
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

// Google Custom Search API
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

/**
 * Perform a web search and return results
 */
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

/**
 * Chat with AI with web search capability
 * This function will detect if the user wants to search the web and include search results in the context
 */
export async function chatWithAIWithSearch(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model?: string,
  enableSearch: boolean = false
): Promise<{ response: string; searchResults?: SearchResponse; usedSearch: boolean }> {
  // Check if search is enabled and if the message seems to need web search
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
        // Add search context to the system message
        const searchContext = `\n\n[Contexte de recherche web - ${new Date().toLocaleDateString('fr-FR')}]\nVoici quelques résultats pertinents pour aider à répondre:\n${searchResults.results.map((r, i) => `${i + 1}. ${r.title}: ${r.snippet} (Source: ${r.url})`).join('\n')}\n\nUtilisez ces informations pour fournir une réponse précise et citez les sources quand c'est pertinent.`;
        
        enhancedMessages = [
          { ...messages[0], content: messages[0].content + searchContext },
          ...messages.slice(1),
        ];
      }
    } catch (error) {
      console.error('Web search failed:', error);
      // Continue without search results
    }
  }
  
  // Call the regular chat function with potentially enhanced messages
  const response = await chatWithAI(enhancedMessages, model);
  
  return {
    response,
    searchResults: usedSearch ? searchResults : undefined,
    usedSearch,
  };
}

/**
 * Extract image URLs from AI response text
 */
export function extractImagesFromResponse(text: string): string[] {
  const imageRegex = /https?:\/\/[^\s"<>]+\.(?:jpe?g|png|gif|webp|svg|bmp)(?:\?[^\s"<>]*)?/gi;
  const matches = text.match(imageRegex);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extract code blocks from AI response with language detection
 */
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
