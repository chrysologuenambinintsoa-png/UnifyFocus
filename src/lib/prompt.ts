// Utility to normalize user prompts and extract a lightweight intent/metadata
export function normalizePrompt(raw: string | undefined) {
  const src = String(raw ?? "").trim();
  if (!src) return "";

  // Collapse multiple spaces and newlines, normalize punctuation spacing
  let p = src.replace(/\s+/g, " ").replace(/\s+([,.!?;:])/g, "$1");

  // Normalize smart quotes to straight quotes
  p = p.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // Ensure sentence spacing after punctuation
  p = p.replace(/([.!?])([A-Za-zÀ-ÿ0-9])/g, "$1 $2");

  return p.trim();
}

export type PromptIntent = {
  intent: string; // short intent label
  type: "text" | "image" | "video" | "code" | "unknown";
  language: string; // guessed language code (fr/en)
  entities: Record<string, string>;
};

export function extractPromptIntent(raw: string | undefined): PromptIntent {
  const text = String(raw ?? "").toLowerCase();
  const has = (r: RegExp) => r.test(text);

  // Heuristic type detection
  let type: PromptIntent['type'] = "unknown";
  if (has(/\b(image|photo|picture|illustration|dessin|image)\b/)) type = "image";
  else if (has(/\b(video|vidéo|clip|film)\b/)) type = "video";
  else if (has(/\b(code|refactor|refactoriser|débogu|debug|explain|implémenter|implémentation)\b/)) type = "code";
  else type = "text";

  // Simple language guess: french if common french words or accents present
  const isFrench = has(/\b(le|la|et|de|des|un|une|pour|bonjour|salut)\b/) || /[àâçéèêëîïôûùüÿñæœ]/i.test(text);
  const language = isFrench ? "fr" : "en";

  // Extract simple entities like length, tone, style, language hints
  const entities: Record<string, string> = {};
  const lengthMatch = text.match(/\b(short|medium|long|court|moyen|long)\b/);
  if (lengthMatch) entities.length = lengthMatch[0];
  const toneMatch = text.match(/\b(informative|persuasive|narrative|technical|informatif|persuasif|narratif|technique)\b/);
  if (toneMatch) entities.tone = toneMatch[0];

  // Short intent label
  const intent = (() => {
    if (type === "image") return "create_image";
    if (type === "video") return "create_video";
    if (type === "code") return "code_task";
    return "write_text";
  })();

  return { intent, type, language, entities };
}
