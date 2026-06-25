"use client";
import { useTranslation } from "@/lib/i18n";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  Video,
  Sparkles,
  Loader2,
  Coins,
  Copy,
  Check,
  Download,
  RefreshCw,
  Plus,
  MessageSquare,
  Menu,
  ChevronRight,
  Paperclip,
  X,
  File,
  Upload,
  Send,
  Wand2,
  Camera,
  Type,
  Film,
  FileSpreadsheet,
  FileOutput,
  MoreVertical,
  Maximize2,
  Minimize2,
  Zap,
  Image,
  Code,
  Terminal,
  Braces,
  FileCode,
  type LucideIcon,
  Bot,
  User,
  Trash2,
  Settings2,
  Palette,
  Layers,
  Cpu,
  Wand,
  PenTool,
  VideoIcon,
  Code2,
  FileTextIcon,
  Music,
} from "lucide-react";

import { useAppStore, Conversation, AVAILABLE_MODELS } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { notifyGenerationFailure, notifyConnectionFailure, notifyInsufficientCredits } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { LogoMark } from "@/components/ui/logo-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationSidebar } from "@/components/ui/conversation-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAB_CONFIG = [
  { key: "text" as const, label: "Musique", icon: Music, credits: 1, color: "blue" },
  { key: "image" as const, label: "Image", icon: ImageIcon, credits: 3, color: "purple" },
  { key: "video" as const, label: "Vidéo", icon: Video, credits: 5, color: "orange" },
  { key: "code" as const, label: "Code", icon: Code, credits: 2, color: "green" },
] as const;

const TEXT_SUBTABS = [
  { key: "text-generation", label: "Génération", icon: Music, credits: 1, description: "Génération de musique" },
  { key: "text-to-music", label: "Texte → Musique", icon: Music, credits: 2, description: "Créez une piste à partir d'un prompt textuel" },
  { key: "music-to-music", label: "Musique → Musique", icon: Sparkles, credits: 2, description: "Transformez une idée musicale existante" },
];

const IMAGE_SUBTABS = [
  { key: "text-to-image", label: "Texte → Image", icon: Wand2, credits: 3, description: "Créez des images depuis du texte" },
  { key: "image-to-image", label: "Image → Image", icon: Camera, credits: 3, description: "Transformez vos images" },
  { key: "image-to-text", label: "Image → Texte", icon: Type, credits: 2, description: "Extrayez du texte d'images" },
];

const VIDEO_SUBTABS = [
  { key: "text-to-video", label: "Texte → Vidéo", icon: Film, credits: 5, description: "Générez des vidéos depuis du texte" },
  { key: "video-to-video", label: "Vidéo → Vidéo", icon: Video, credits: 5, description: "Transformez vos vidéos" },
  { key: "video-to-text", label: "Vidéo → Texte", icon: FileText, credits: 4, description: "Transcription de vidéos" },
];

const CODE_SUBTABS = [
  { key: "code-generation", label: "Génération", icon: Code, credits: 2, description: "Générez du code dans n'importe quel langage" },
  { key: "code-refactor", label: "Refactoring", icon: Braces, credits: 2, description: "Optimisez et nettoyez votre code" },
  { key: "code-explain", label: "Explication", icon: FileCode, credits: 1, description: "Comprenez un code complexe" },
  { key: "code-debug", label: "Debug", icon: Terminal, credits: 2, description: "Trouvez et corrigez les bugs" },
];

const ALLOWED_FILE_TYPES: Record<"text" | "image" | "video" | "code", string[]> = {
  text: [".txt", ".doc", ".docx", ".pdf", ".md", ".mp3", ".wav", ".ogg", ".m4a"],
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
  video: [".mp4", ".avi", ".mov", ".wmv", ".webm"],
  code: [],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file: File;
}

type ResultMeta = {
  title: string;
  icon: LucideIcon;
  color: keyof typeof TAB_COLORS;
};

type ResultPayload = {
  type: "text" | "image" | "video" | "code" | "audio";
  subtype: string;
  result: string;
};

const PLACEHOLDERS: Record<string, string> = {
  text: "Décrivez la musique que vous souhaitez générer (genre, tempo, ambiance...)...",
  "text-to-music": "Donnez les paroles, l'ambiance ou le style pour créer votre musique...",
  "music-to-music": "Décrivez la transformation musicale souhaitée ou le style de la piste cible...",
  image: "Décrivez l'image que vous souhaitez créer en détail...",
  video: "Décrivez la vidéo que vous souhaitez produire...",
  code: "Décrivez le code que vous souhaitez générer...",
};

const API_ENDPOINTS: Record<string, string> = {
  text: "/api/generate/text",
  image: "/api/generate/image",
  video: "/api/generate/video",
  code: "/api/generate/code",
};

const SUBTAB_ENDPOINTS: Record<string, string> = {
  "text-generation": "/api/generate/audio",
  "text-to-music": "/api/generate/audio",
  "music-to-music": "/api/generate/audio",
  "text-to-image": "/api/generate/image",
  "image-to-image": "/api/generate/image",
  "image-to-text": "/api/generate/text",
  "text-to-video": "/api/generate/video",
  "video-to-video": "/api/generate/video",
  "video-to-text": "/api/generate/text",
  "code-generation": "/api/generate/code",
  "code-refactor": "/api/generate/code",
  "code-explain": "/api/generate/code",
  "code-debug": "/api/generate/code",
};

const TAB_HELP_TEXT: Record<string, string> = {
  text: "Génère de la musique à partir de votre prompt.",
  image: "Génère une nouvelle image ou transforme une image source.",
  video: "Génère une nouvelle vidéo ou transforme une vidéo source.",
  code: "Générez, expliquez ou déboguez du code dans n'importe quel langage.",
};

const RESULT_DISPLAY_CONFIG: Record<string, { title: string; icon: LucideIcon; color: keyof typeof TAB_COLORS }> = {
  "text-generation": { title: "Musique générée", icon: Music, color: "blue" },
  "text-to-music": { title: "Musique générée", icon: Music, color: "blue" },
  "music-to-music": { title: "Musique transformée", icon: Sparkles, color: "blue" },
  "text-to-image": { title: "Image générée", icon: ImageIcon, color: "purple" },
  "image-to-image": { title: "Image transformée", icon: Camera, color: "purple" },
  "image-to-text": { title: "Texte extrait", icon: Type, color: "purple" },
  "text-to-video": { title: "Vidéo générée", icon: Film, color: "orange" },
  "video-to-video": { title: "Vidéo transformée", icon: Video, color: "orange" },
  "video-to-text": { title: "Texte extrait", icon: FileText, color: "orange" },
  "code-generation": { title: "Code généré", icon: Code, color: "green" },
  "code-refactor": { title: "Code refactorisé", icon: Braces, color: "green" },
  "code-explain": { title: "Explication de code", icon: FileCode, color: "green" },
  "code-debug": { title: "Code debuggué", icon: Terminal, color: "green" },
};

const RESULT_TOAST_LABEL: Record<string, string> = {
  "text-generation": "musique",
  "text-to-music": "musique",
  "music-to-music": "musique",
  "text-to-image": "image",
  "image-to-image": "image",
  "image-to-text": "texte",
  "text-to-video": "vidéo",
  "video-to-video": "vidéo",
  "video-to-text": "texte",
  "code-generation": "code",
  "code-refactor": "code",
  "code-explain": "code",
  "code-debug": "code",
};

const MAX_CHARS = 2000;

const DEFAULT_RESULT_META: ResultMeta = {
  title: "Résultat généré",
  icon: Sparkles,
  color: "blue",
};

const getResultMeta = (subtype: string, tab: string): ResultMeta => {
  return (
    RESULT_DISPLAY_CONFIG[subtype] ||
    RESULT_DISPLAY_CONFIG[`${tab}-generation`] ||
    DEFAULT_RESULT_META
  );
};

function downloadHref(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

let watermarkImagePromise: Promise<HTMLImageElement> | null = null;

function loadWatermarkIcon() {
  if (!watermarkImagePromise) {
    watermarkImagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Impossible de charger le watermark."));
      img.src = "/watermark.png";
    });
  }
  return watermarkImagePromise;
}

async function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const padding = Math.max(16, Math.round(width * 0.03));
  const iconSize = Math.min(100, Math.round(width * 0.14));
  const iconX = width - iconSize - padding;
  const iconY = height - iconSize - padding;

  try {
    const watermarkIcon = await loadWatermarkIcon();
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.drawImage(watermarkIcon, iconX, iconY, iconSize, iconSize);
    ctx.restore();
  } catch {
    // fallback to text-only watermark
  }

  const fontSize = Math.max(18, Math.round(width * 0.04));
  const textY = iconY + iconSize / 2;
  const textPadding = Math.round(padding * 0.5);
  const unify = "Unify";
  const focus = "Focus";

  ctx.font = `800 ${fontSize}px Inter, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;

  const unifyWidth = ctx.measureText(unify).width;
  const focusWidth = ctx.measureText(focus).width;
  const totalTextWidth = unifyWidth + focusWidth + textPadding;
  const textX = iconX - totalTextWidth - padding;

  const unifyGradient = ctx.createLinearGradient(textX, 0, textX + unifyWidth, 0);
  unifyGradient.addColorStop(0, "#94a3b8");
  unifyGradient.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = unifyGradient;
  ctx.fillText(unify, textX, textY);

  const focusGradient = ctx.createLinearGradient(textX + unifyWidth + textPadding, 0, textX + unifyWidth + textPadding + focusWidth, 0);
  focusGradient.addColorStop(0, "#38bdf8");
  focusGradient.addColorStop(1, "#7c3aed");
  ctx.fillStyle = focusGradient;
  ctx.fillText(focus, textX + unifyWidth + textPadding, textY);
}

function isExternalUrl(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getProxyUrl(src: string) {
  return `/api/proxy?url=${encodeURIComponent(src)}`;
}

async function createWatermarkedImageDataUrl(src: string): Promise<string> {
  const imageSrc = isExternalUrl(src) ? getProxyUrl(src) : src;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image."));
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de créer le canvas");

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawWatermark(ctx, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

async function createWatermarkedVideoBlob(src: string): Promise<Blob> {
  const videoSrc = isExternalUrl(src) ? getProxyUrl(src) : src;
  const video = document.createElement("video");
  video.src = videoSrc;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.top = "-9999px";
  document.body.appendChild(video);

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = () => reject(new Error("Impossible de charger la vidéo."));
      video.addEventListener("error", onError, { once: true });
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    });

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Impossible de créer le canvas vidéo.");

    const captureStream = canvas.captureStream(30);
    const stream = (video as unknown as { captureStream?: () => MediaStream }).captureStream?.();
    if (!stream) {
      throw new Error("captureStream non supporté par votre navigateur.");
    }

    const outputStream = new MediaStream([
      ...captureStream.getVideoTracks(),
      ...stream.getAudioTracks(),
    ]);
    const recordedChunks: BlobPart[] = [];
    const recorder = new MediaRecorder(outputStream, { mimeType: "video/webm; codecs=vp9" });

    recorder.ondataavailable = (event) => {
      if (event.data.size) recordedChunks.push(event.data);
    };

    const recorderPromise = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error("Erreur lors de l'encodage vidéo."));
    });

    const drawFrame = () => {
      if (video.ended || video.paused) return;
      ctx.drawImage(video, 0, 0, width, height);
      drawWatermark(ctx, width, height);
      requestAnimationFrame(drawFrame);
    };

    recorder.start();
    await video.play();
    requestAnimationFrame(drawFrame);

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });

    if (recorder.state === "recording") {
      recorder.stop();
    }
    await recorderPromise;

    return new Blob(recordedChunks, { type: "video/webm" });
  } finally {
    document.body.removeChild(video);
  }
}

// Modern UnifyFocus color palette with enhanced gradients
const TAB_COLORS = {
  blue: {
    bg: "bg-blue-500/10",
    bgActive: "bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600",
    text: "text-blue-400",
    textActive: "text-white",
    border: "border-blue-500/20",
    borderActive: "border-blue-500/50",
    glow: "shadow-blue-500/30",
    gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
  },
  purple: {
    bg: "bg-purple-500/10",
    bgActive: "bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600",
    text: "text-purple-400",
    textActive: "text-white",
    border: "border-purple-500/20",
    borderActive: "border-purple-500/50",
    glow: "shadow-purple-500/30",
    gradient: "from-purple-500/20 via-violet-500/10 to-transparent",
  },
  orange: {
    bg: "bg-orange-500/10",
    bgActive: "bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600",
    text: "text-orange-400",
    textActive: "text-white",
    border: "border-orange-500/20",
    borderActive: "border-orange-500/50",
    glow: "shadow-orange-500/30",
    gradient: "from-orange-500/20 via-amber-500/10 to-transparent",
  },
  green: {
    bg: "bg-emerald-500/10",
    bgActive: "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600",
    text: "text-emerald-400",
    textActive: "text-white",
    border: "border-emerald-500/20",
    borderActive: "border-emerald-500/50",
    glow: "shadow-emerald-500/30",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
};

// ---------------------------------------------------------------------------
// Animated Background Component
// ---------------------------------------------------------------------------

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />
      
      {/* Animated orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 60, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modern Glassmorphic Components
// ---------------------------------------------------------------------------

function GlassCard({
  children,
  className = "",
  variant = "default",
  hover = false,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "input" | "output" | "elevated" | "accent";
  hover?: boolean;
  style?: React.CSSProperties;
}) {
  const variants = {
    default: "bg-card/40 backdrop-blur-xl border border-white/10",
    input: "bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent backdrop-blur-xl border border-white/15",
    output: "bg-card/60 backdrop-blur-xl border border-white/10",
    elevated: "bg-card/50 backdrop-blur-2xl border border-white/20 shadow-2xl",
    accent: "bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent backdrop-blur-xl border border-violet-500/20",
  };

  return (
    <motion.div
      style={style}
      className={`
        relative overflow-hidden rounded-2xl
        ${variants[variant]}
        ${hover ? "transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1" : ""}
        ${className}
      `}
      whileHover={hover ? { scale: 1.01 } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
}

function ModernTabChip({
  active,
  onClick,
  children,
  color = "blue",
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: keyof typeof TAB_COLORS;
  icon: LucideIcon;
}) {
  const colors = TAB_COLORS[color];
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative px-5 py-3 rounded-xl font-medium transition-all duration-300
        flex items-center gap-2.5 text-sm
        ${
          active
            ? `${colors.bgActive} ${colors.textActive} shadow-lg ${colors.glow} shadow-xl`
            : `bg-white/5 ${colors.text} hover:bg-white/10 border border-white/10`
        }
      `}
    >
      {active && (
        <motion.div
          layoutId="activeTabGlow"
          className={`absolute inset-0 rounded-xl ${colors.bgActive} opacity-20 blur-md`}
        />
      )}
      <Icon className={`w-4 h-4 relative z-10 ${active ? "" : "opacity-70"}`} />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

function SubTabButton({
  active,
  onClick,
  icon: Icon,
  label,
  credits,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  credits: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-300
        ${
          active
            ? "bg-white/15 text-white shadow-lg backdrop-blur-md border border-white/20"
            : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-transparent"
        }
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-white/10"}`}>
        {credits}cr
      </span>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Options Components
// ---------------------------------------------------------------------------

function TextOptions({
  style,
  setStyle,
  length,
  setLength,
  tone,
  setTone,
}: {
  style: string;
  setStyle: (v: string) => void;
  length: string;
  setLength: (v: string) => void;
  tone: string;
  setTone: (v: string) => void;
}) {
  const options = [
    {
      label: "Style",
      value: style,
      onChange: setStyle,
      choices: [
        { label: "Professionnel", value: "professionnel" },
        { label: "Créatif", value: "creatif" },
        { label: "Académique", value: "academique" },
        { label: "Casual", value: "casual" },
        { label: "Marketing", value: "marketing" },
      ],
    },
    {
      label: "Longueur",
      value: length,
      onChange: setLength,
      choices: [
        { label: "Court", value: "court" },
        { label: "Moyen", value: "moyen" },
        { label: "Long", value: "long" },
      ],
    },
    {
      label: "Ton",
      value: tone,
      onChange: setTone,
      choices: [
        { label: "Informatif", value: "informatif" },
        { label: "Persuasif", value: "persuasif" },
        { label: "Narratif", value: "narratif" },
        { label: "Technique", value: "technique" },
      ],
    },
  ];

  return (
    <GlassCard variant="accent" className="p-4">
      <div className="space-y-4">
        {options.map((opt) => (
          <div key={opt.label} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {opt.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {opt.choices.map((choice) => {
                const isActive = opt.value === choice.value;
                return (
                  <motion.button
                    key={choice.value}
                    onClick={() => opt.onChange(choice.value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                      ${
                        isActive
                          ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10"
                      }
                    `}
                  >
                    {choice.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function ImageOptions({
  style,
  setStyle,
  format,
  setFormat,
  quality,
  setQuality,
}: {
  style: string;
  setStyle: (v: string) => void;
  format: string;
  setFormat: (v: string) => void;
  quality: string;
  setQuality: (v: string) => void;
}) {
  const options = [
    {
      label: "Style",
      value: style,
      onChange: setStyle,
      choices: [
        { label: "Photoréaliste", value: "photorealiste" },
        { label: "Illustration", value: "illustration" },
        { label: "Art Numérique", value: "art-numerique" },
        { label: "Aquarelle", value: "aquarelle" },
        { label: "3D", value: "3d" },
      ],
    },
    {
      label: "Format",
      value: format,
      onChange: setFormat,
      choices: [
        { label: "Carré (1:1)", value: "1:1" },
        { label: "Paysage (16:9)", value: "16:9" },
        { label: "Portrait (9:16)", value: "9:16" },
      ],
    },
    {
      label: "Qualité",
      value: quality,
      onChange: setQuality,
      choices: [
        { label: "Standard", value: "standard" },
        { label: "HD", value: "hd" },
        { label: "Ultra HD", value: "ultra-hd" },
      ],
    },
  ];

  return (
    <GlassCard variant="accent" className="p-4">
      <div className="space-y-4">
        {options.map((opt) => (
          <div key={opt.label} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {opt.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {opt.choices.map((choice) => {
                const isActive = opt.value === choice.value;
                return (
                  <motion.button
                    key={choice.value}
                    onClick={() => opt.onChange(choice.value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                      ${
                        isActive
                          ? "bg-purple-500 text-white shadow-md shadow-purple-500/25"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10"
                      }
                    `}
                  >
                    {choice.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function VideoOptions({
  duration,
  setDuration,
  style,
  setStyle,
  format,
  setFormat,
}: {
  duration: string;
  setDuration: (v: string) => void;
  style: string;
  setStyle: (v: string) => void;
  format: string;
  setFormat: (v: string) => void;
}) {
  const options = [
    {
      label: "Durée",
      value: duration,
      onChange: setDuration,
      choices: [
        { label: "5 secondes", value: "5" },
        { label: "10 secondes", value: "10" },
        { label: "15 secondes", value: "15" },
      ],
    },
    {
      label: "Style",
      value: style,
      onChange: setStyle,
      choices: [
        { label: "Cinématique", value: "cinematique" },
        { label: "Animation", value: "animation" },
        { label: "Documentaire", value: "documentaire" },
        { label: "Expérimental", value: "experimental" },
      ],
    },
    {
      label: "Format",
      value: format,
      onChange: setFormat,
      choices: [
        { label: "16:9", value: "16:9" },
        { label: "9:16", value: "9:16" },
        { label: "1:1", value: "1:1" },
      ],
    },
  ];

  return (
    <GlassCard variant="accent" className="p-4">
      <div className="space-y-4">
        {options.map((opt) => (
          <div key={opt.label} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {opt.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {opt.choices.map((choice) => {
                const isActive = opt.value === choice.value;
                return (
                  <motion.button
                    key={choice.value}
                    onClick={() => opt.onChange(choice.value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                      ${
                        isActive
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10"
                      }
                    `}
                  >
                    {choice.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function CodeOptions({
  language,
  setLanguage,
  framework,
  setFramework,
  complexity,
  setComplexity,
}: {
  language: string;
  setLanguage: (v: string) => void;
  framework: string;
  setFramework: (v: string) => void;
  complexity: string;
  setComplexity: (v: string) => void;
}) {
  const options = [
    {
      label: "Langage",
      value: language,
      onChange: setLanguage,
      choices: [
        { label: "JavaScript", value: "javascript" },
        { label: "TypeScript", value: "typescript" },
        { label: "Python", value: "python" },
        { label: "Java", value: "java" },
        { label: "C#", value: "csharp" },
        { label: "Go", value: "go" },
        { label: "Rust", value: "rust" },
        { label: "PHP", value: "php" },
      ],
    },
    {
      label: "Framework",
      value: framework,
      onChange: setFramework,
      choices: [
        { label: "Aucun", value: "aucun" },
        { label: "React", value: "react" },
        { label: "Vue", value: "vue" },
        { label: "Angular", value: "angular" },
        { label: "Next.js", value: "nextjs" },
        { label: "Node.js", value: "nodejs" },
        { label: "Django", value: "django" },
        { label: "Spring", value: "spring" },
      ],
    },
    {
      label: "Complexité",
      value: complexity,
      onChange: setComplexity,
      choices: [
        { label: "Simple", value: "simple" },
        { label: "Intermédiaire", value: "intermediaire" },
        { label: "Avancé", value: "avance" },
        { label: "Expert", value: "expert" },
      ],
    },
  ];

  return (
    <GlassCard variant="accent" className="p-4">
      <div className="space-y-4">
        {options.map((opt) => (
          <div key={opt.label} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {opt.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {opt.choices.map((choice) => {
                const isActive = opt.value === choice.value;
                return (
                  <motion.button
                    key={choice.value}
                    onClick={() => opt.onChange(choice.value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                      ${
                        isActive
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10"
                      }
                    `}
                  >
                    {choice.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ tab }: { tab: string }) {
  const { t } = useTranslation();
  const tabConfig = TAB_CONFIG.find((t) => t.key === tab);
  const Icon = tabConfig?.icon || Sparkles;
  const color = tabConfig?.color || "blue";
  const colors = TAB_COLORS[color as keyof typeof TAB_COLORS];

  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [0, 8, -8, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`
          relative w-32 h-32 rounded-3xl flex items-center justify-center mb-8
          ${colors.bg}
        `}
      >
        <div className={`absolute inset-0 rounded-3xl ${colors.bgActive} opacity-20 blur-xl`} />
        <Icon className={`w-14 h-14 ${colors.text}`} />
      </motion.div>
      
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-foreground mb-3"
      >
        Prêt à créer
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-center max-w-md"
      >
        Décrivez ce que vous souhaitez générer et laissez l'IA faire le reste.
      </motion.p>

      {/* Feature hints */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex gap-4 mt-8"
      >
        {[
          { icon: Zap, label: "Rapide" },
          { icon: Cpu, label: "IA Puissante" },
          { icon: Palette, label: "Qualité" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10"
          >
            <item.icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Professional Generation Animation
// ---------------------------------------------------------------------------

function ProfessionalGeneratingAnimation({ tab, subtype, streamingContent }: { tab: string; subtype?: string; streamingContent?: string }) {
  const tabConfig = TAB_CONFIG.find((t) => t.key === tab);
  const color = tabConfig?.color || "blue";
  const colors = TAB_COLORS[color as keyof typeof TAB_COLORS];
  const scrollRef = useRef<HTMLDivElement>(null);

  const actionLabelMap: Record<string, string> = {
    text: "texte",
    image: "image",
    video: "vidéo",
    code: "code",
  };

  const actionLabel = actionLabelMap[tab] || "contenu";
  
  const statusMessages = [
    "Analyse de votre demande...",
    `Génération du ${actionLabel} en cours...`,
    "Optimisation des résultats...",
    "Finalisation...",
  ];
  
  const [currentStatus, setCurrentStatus] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatus((prev) => (prev + 1) % statusMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (streamingContent && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingContent]);

  const showStreamingContent = (tab === "text" || tab === "code") && streamingContent;

  const highlightCode = (code: string) => {
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof'];
    const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
    
    let highlighted = code
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');
    
    highlighted = highlighted.replace(strings, '<span class="text-emerald-400">$&</span>');
    highlighted = highlighted.replace(comments, '<span class="text-gray-500 italic">$&</span>');
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      highlighted = highlighted.replace(regex, '<span class="text-purple-400 font-medium">$1</span>');
    });
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>');
    
    return highlighted;
  };

  return (
    <motion.div
      key="generating-professional"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Header with streaming indicator */}
      <div className="flex items-center gap-4 mb-6">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`relative w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center`}
        >
          <div className={`absolute inset-0 rounded-2xl ${colors.bgActive} opacity-30 blur-lg`} />
          <Loader2 className={`w-6 h-6 ${colors.text} animate-spin`} />
        </motion.div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-base font-semibold text-foreground"
            >
              Génération en cours
            </motion.p>
            {showStreamingContent && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Streaming</span>
              </motion.div>
            )}
          </div>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-muted-foreground"
          >
            {statusMessages[currentStatus]}
          </motion.p>
        </div>
      </div>

      {/* Main card with streaming content display */}
      <GlassCard variant="output" className="p-0 overflow-hidden">
        {/* Gradient accent line */}
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${colors.bgActive} opacity-80`} />
        
        <div className="p-5 pt-6">
          {showStreamingContent ? (
            <div className="relative overflow-hidden rounded-xl bg-slate-950/50 border border-white/5">
              <div 
                ref={scrollRef}
                className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-white/10"
              >
                {tab === "code" ? (
                  <pre className="p-4 font-mono text-sm leading-relaxed overflow-x-auto">
                    <code
                      dangerouslySetInnerHTML={{ __html: highlightCode(streamingContent) }}
                    />
                    <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1 align-middle" />
                  </pre>
                ) : (
                  <div className="p-4">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {streamingContent}
                      <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-1 align-middle" />
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl">
              <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl overflow-hidden min-h-[250px]">
                {/* Shimmer effect */}
                <motion.div
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                />
                
                {/* Pulsing glow */}
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`absolute inset-0 bg-gradient-to-r ${colors.gradient}`}
                />

                {/* Central animated orb */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Outer rings */}
                    <motion.div
                      animate={{
                        scale: [0.6, 1.8],
                        opacity: [0.6, 0],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                      className={`absolute inset-0 rounded-full border-2 ${colors.text.replace('text-', 'border-')}/20`}
                    />
                    <motion.div
                      animate={{
                        scale: [0.6, 1.8],
                        opacity: [0.6, 0],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.8,
                      }}
                      className={`absolute inset-0 rounded-full border-2 ${colors.text.replace('text-', 'border-')}/15`}
                    />
                    
                    {/* Main orb */}
                    <motion.div
                      animate={{
                        scale: [1, 1.15, 1],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="relative w-28 h-28 rounded-full flex items-center justify-center"
                    >
                      <div className="w-20 h-20">
                        <img src="/logo.svg" alt="UnifyFocus" className="w-full h-full" />
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Status text */}
                <div className="absolute bottom-6 left-6 right-6">
                  <motion.p
                    key={currentStatus}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-muted-foreground text-center mb-4"
                  >
                    {statusMessages[currentStatus]}
                  </motion.p>
                  
                  {/* Progress bar */}
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className={`h-full w-1/2 rounded-full ${colors.bgActive}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Result Components
// ---------------------------------------------------------------------------

function TextResult({
  result,
  meta,
  onRegenerate,
  onNew,
}: {
  result: string;
  meta: ResultMeta;
  onRegenerate: () => void;
  onNew: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentIndex = 0;
    const words = result.split(" ");
    setDisplayedText("");
    setIsStreaming(true);

    const streamInterval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText((prev) => 
          prev ? prev + " " + words[currentIndex] : words[currentIndex]
        );
        currentIndex++;
        
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      } else {
        clearInterval(streamInterval);
        setIsStreaming(false);
      }
    }, 30);

    return () => clearInterval(streamInterval);
  }, [result]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast({ title: "Copié !", description: "Musique copiée dans le presse-papiers." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier la musique.",
        variant: "destructive",
      });
    }
  }, [result, toast]);

  return (
    <motion.div
      key="result-text"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full"
    >
      {/* Professional result header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`relative w-12 h-12 rounded-xl ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center shadow-lg`}
          >
            <div className={`absolute inset-0 rounded-xl ${TAB_COLORS[meta.color].bgActive} opacity-40 blur-md`} />
            <meta.icon className="w-5 h-5 text-white relative z-10" />
          </motion.div>
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base font-semibold text-foreground"
            >
              {meta.title}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-muted-foreground flex items-center gap-1"
            >
              <Bot className="w-3 h-3" />
              Généré par UnifyFocus AI
            </motion.p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </motion.div>
      </div>

      {/* Professional result card */}
      <GlassCard variant="output" className="overflow-hidden" style={{ maxHeight: '700px', display: 'flex', flexDirection: 'column' }}>
        <div className={`absolute top-0 left-0 right-0 h-1 ${TAB_COLORS[meta.color].bgActive} opacity-80`} />
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-white/10"
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words text-base">
              {displayedText}
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-violet-500 animate-pulse ml-1 align-middle rounded-full" />
              )}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-3 mt-5"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <RefreshCw className="w-4 h-4" />
          Régénérer
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function MediaViewer({
  src,
  type,
  isOpen,
  onClose,
  title,
}: {
  src: string;
  type: "image" | "video";
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
      
      <motion.button
        onClick={onClose}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-6 right-6 z-50 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-300 shadow-lg shadow-red-500/40 hover:shadow-red-500/60"
        style={{ boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
      >
        <X className="w-7 h-7 text-white" strokeWidth={3} />
      </motion.button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-40 max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "image" ? (
          <img
            src={src}
            alt={title}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        )}
      </motion.div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm border border-white/10">
          {title}
        </div>
      </div>
    </motion.div>
  );
}

function ImageResult({
  result,
  meta,
  onRegenerate,
  onNew,
}: {
  result: string;
  meta: ResultMeta;
  onRegenerate: () => void;
  onNew: () => void;
}) {
  const { toast } = useToast();
  const userPlan = useAppStore((state) => state.user?.plan);
  const showWatermark = userPlan === "free";
  const [isRevealed, setIsRevealed] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const imageSrcIsValid = useMemo(() => {
    if (!result) return false;
    const trimmed = result.trim();
    if (trimmed.startsWith("data:image/")) return true;
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }, [result]);

  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!imageSrcIsValid) {
      toast({
        title: "Erreur",
        description: "Aucune image valide à télécharger.",
        variant: "destructive",
      });
      return;
    }

    if (!showWatermark) {
      try {
        downloadHref(result, `unifyfocus-image-${Date.now()}.png`);
        toast({ title: "Téléchargé !", description: "Image téléchargée avec succès." });
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de télécharger l'image.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsDownloading(true);
    try {
      const watermarkedDataUrl = await createWatermarkedImageDataUrl(result);
      downloadHref(watermarkedDataUrl, `unifyfocus-image-${Date.now()}.png`);
      toast({ title: "Téléchargé !", description: "Image brandée téléchargée avec succès." });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de générer l'image watermarkée.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [result, toast, imageSrcIsValid, showWatermark, setIsDownloading]);

  return (
    <motion.div
      key="result-image"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`relative w-12 h-12 rounded-xl ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center shadow-lg`}
        >
          <div className={`absolute inset-0 rounded-xl ${TAB_COLORS[meta.color].bgActive} opacity-40 blur-md`} />
          <meta.icon className="w-5 h-5 text-white relative z-10" />
        </motion.div>
        <div className="flex-1">
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base font-semibold text-foreground"
          >
            {meta.title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            <Bot className="w-3 h-3" />
            Généré par UnifyFocus AI
          </motion.p>
        </div>
        {imageSrcIsValid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-colors"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Result card */}
      <GlassCard variant="output" className="overflow-hidden max-w-xl mx-auto">
        <div className={`absolute top-0 left-0 right-0 h-1 ${TAB_COLORS[meta.color].bgActive} opacity-80`} />
        
        <div className="p-5">
          {imageSrcIsValid ? (
            <motion.div 
              className="relative overflow-hidden rounded-xl cursor-pointer group"
              onClick={() => setIsViewerOpen(true)}
              whileHover={{ scale: 1.01 }}
            >
              <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 rounded-xl backdrop-blur-sm">
                <div className="px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-sm flex items-center gap-2 border border-white/30">
                  <Maximize2 className="w-4 h-4" />
                  <span>Agrandir</span>
                </div>
              </div>
              <motion.img
                initial={{ scale: 1.05, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                src={result}
                alt="Image générée par IA"
                className="w-full max-h-[480px] rounded-xl object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm text-destructive text-center">
                Erreur : l'image n'a pas pu être générée.
              </p>
              <p className="text-xs text-muted-foreground mt-2 break-all text-center">{result}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-3 mt-5"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <RefreshCw className="w-4 h-4" />
          Régénérer
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isViewerOpen && imageSrcIsValid && (
          <MediaViewer
            src={result}
            type="image"
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            title={meta.title}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function VideoResult({
  result,
  meta,
  onRegenerate,
  onNew,
}: {
  result: string;
  meta: ResultMeta;
  onRegenerate: () => void;
  onNew: () => void;
}) {
  const { toast } = useToast();
  const userPlan = useAppStore((state) => state.user?.plan);
  const showWatermark = userPlan === "free";
  const [isRevealed, setIsRevealed] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const videoSrcIsValid = useMemo(() => {
    if (!result) return false;
    const trimmed = result.trim();
    if (trimmed.startsWith("data:video/")) return true;
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }, [result]);

  const handleDownload = useCallback(async () => {
    if (!videoSrcIsValid) return;

    if (!showWatermark) {
      try {
        downloadHref(result, `unifyfocus-video-${Date.now()}.mp4`);
        toast({ title: "Téléchargé !", description: "Vidéo téléchargée avec succès." });
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de télécharger la vidéo.",
          variant: "destructive",
        });
      }
      return;
    }

    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      toast({
        title: "Limitation du navigateur",
        description: "Votre navigateur ne supporte pas l'export vidéo watermarkée.",
        variant: "destructive",
      });
      return;
    }

    setIsRecording(true);
    try {
      const blob = await createWatermarkedVideoBlob(result);
      const url = URL.createObjectURL(blob);
      downloadHref(url, `unifyfocus-video-${Date.now()}.webm`);
      URL.revokeObjectURL(url);
      toast({ title: "Téléchargé !", description: "Vidéo watermarkée téléchargée avec succès." });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de générer la vidéo watermarkée.",
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  }, [result, videoSrcIsValid, showWatermark, toast, setIsRecording]);

  return (
    <motion.div
      key="result-video"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`relative w-12 h-12 rounded-xl ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center shadow-lg`}
        >
          <div className={`absolute inset-0 rounded-xl ${TAB_COLORS[meta.color].bgActive} opacity-40 blur-md`} />
          <meta.icon className="w-5 h-5 text-white relative z-10" />
        </motion.div>
        <div className="flex-1">
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base font-semibold text-foreground"
          >
            {meta.title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            <Bot className="w-3 h-3" />
            Généré par UnifyFocus AI
          </motion.p>
        </div>
        {videoSrcIsValid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={isRecording}
              className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-colors"
            >
              {isRecording ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Result card */}
      <GlassCard variant="output" className="overflow-hidden max-w-xl mx-auto">
        <div className={`absolute top-0 left-0 right-0 h-1 ${TAB_COLORS[meta.color].bgActive} opacity-80`} />
        
        <div className="p-5">
          {videoSrcIsValid ? (
            <motion.div 
              className="relative overflow-hidden rounded-xl bg-black cursor-pointer group"
              onClick={() => setIsViewerOpen(true)}
              whileHover={{ scale: 1.01 }}
            >
              <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 rounded-xl backdrop-blur-sm">
                <div className="px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-sm flex items-center gap-2 border border-white/30">
                  <Maximize2 className="w-4 h-4" />
                  <span>Agrandir</span>
                </div>
              </div>
              <motion.video
                initial={{ scale: 1.05, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                controls
                src={result}
                className="w-full max-h-[480px] rounded-xl object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {result}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-3 mt-5"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <RefreshCw className="w-4 h-4" />
          Régénérer
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isViewerOpen && videoSrcIsValid && (
          <MediaViewer
            src={result}
            type="video"
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            title={meta.title}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AudioResult({
  result,
  meta,
  onRegenerate,
  onNew,
}: {
  result: string;
  meta: ResultMeta;
  onRegenerate: () => void;
  onNew: () => void;
}) {
  const { toast } = useToast();
  const [audioSrcIsValid, setAudioSrcIsValid] = useState(false);

  useEffect(() => {
    if (!result) {
      setAudioSrcIsValid(false);
      return;
    }
    const trimmed = result.trim();
    const isDataAudio = trimmed.startsWith("data:audio/");
    if (isDataAudio) {
      setAudioSrcIsValid(true);
      return;
    }
    try {
      new URL(trimmed);
      setAudioSrcIsValid(true);
    } catch {
      setAudioSrcIsValid(false);
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!audioSrcIsValid) {
      toast({
        title: "Erreur",
        description: "Aucun fichier audio valide à télécharger.",
        variant: "destructive",
      });
      return;
    }

    downloadHref(result, `unifyfocus-audio-${Date.now()}.mp3`);
    toast({ title: "Téléchargement lancé", description: "Audio téléchargé avec succès." });
  }, [audioSrcIsValid, result, toast]);

  return (
    <motion.div
      key="result-audio"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`relative w-12 h-12 rounded-xl ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center shadow-lg`}
          >
            <div className={`absolute inset-0 rounded-xl ${TAB_COLORS[meta.color].bgActive} opacity-40 blur-md`} />
            <meta.icon className="w-5 h-5 text-white relative z-10" />
          </motion.div>
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base font-semibold text-foreground"
            >
              {meta.title}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-muted-foreground flex items-center gap-1"
            >
              <Bot className="w-3 h-3" />
              Généré par UnifyFocus AI
            </motion.p>
          </div>
        </div>
        {audioSrcIsValid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-colors"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
            </Button>
          </motion.div>
        )}
      </div>

      <GlassCard variant="output" className="overflow-hidden max-w-3xl mx-auto">
        <div className={`absolute top-0 left-0 right-0 h-1 ${TAB_COLORS[meta.color].bgActive} opacity-80`} />
        <div className="p-5">
          {audioSrcIsValid ? (
            <div className="rounded-xl bg-slate-950/70 p-6 border border-white/10">
              <audio controls src={result} className="w-full" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <Music className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                L'audio n'a pas pu être généré correctement.
              </p>
              <p className="text-xs text-muted-foreground mt-2 break-all text-center">{result}</p>
            </div>
          )}
        </div>
      </GlassCard>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-3 mt-5"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md"
        >
          <RefreshCw className="w-4 h-4" />
          Régénérer
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function CodeResult({
  result,
  meta,
  onRegenerate,
  onNew,
}: {
  result: string;
  meta: ResultMeta;
  onRegenerate: () => void;
  onNew: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast({ title: "Copié !", description: "Code copié dans le presse-papiers." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code.",
        variant: "destructive",
      });
    }
  }, [result, toast]);

  // Improved syntax highlighting with proper HTML escaping
  const highlightCode = (code: string) => {
    // First, escape HTML entities to prevent XSS and rendering issues
    const escapeHtml = (text: string) => {
      const map: Record<string, string> = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    // Escape the code first
    let escaped = escapeHtml(code);

    // Syntax highlighting patterns (applied after escaping)
    // Comments (single-line and multi-line)
    escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="text-slate-500 italic">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500 italic">$1</span>');
    
    // Strings (single, double, and template literals)
    escaped = escaped.replace(/(&#039;[^&#]*?&#039;)/g, '<span class="text-emerald-400">$1</span>');
    escaped = escaped.replace(/("[^&]*?")/g, '<span class="text-emerald-400">$1</span>');
    escaped = escaped.replace(/(`[^`]*?`)/g, '<span class="text-emerald-400">$1</span>');
    
    // Keywords
    const keywords = [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 
      'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 
      'throw', 'new', 'this', 'typeof', 'instanceof', 'switch', 'case', 'break',
      'continue', 'default', 'do', 'in', 'of', 'yield', 'delete', 'void',
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'
    ];
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      escaped = escaped.replace(regex, '<span class="text-violet-400 font-medium">$1</span>');
    });

    // Numbers
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>');

    // Function calls
    escaped = escaped.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="text-blue-400">$1</span>');

    return escaped;
  };

  const getLanguageFromCode = (code: string): string => {
    if (code.includes('import React') || code.includes('import { useState') || code.includes('import { useEffect')) return 'JSX/React';
    if (code.includes('def ') || code.includes('import ') || code.includes('print(')) return 'Python';
    if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('console.log')) return 'JavaScript';
    if (code.includes('public class') || code.includes('public static') || code.includes('System.out')) return 'Java';
    if (code.includes('fn ') || code.includes('let mut') || code.includes('println!')) return 'Rust';
    if (code.includes('package ') || code.includes('import (') || code.includes('fmt.Println')) return 'Go';
    if (code.includes('<?php') || code.includes('echo ') || code.includes('$')) return 'PHP';
    if (code.includes('public ') && code.includes('static ') && code.includes('void Main')) return 'C#';
    if (code.includes('#include') || code.includes('int main') || code.includes('std::')) return 'C++';
    if (code.includes('<') && code.includes('>') && code.includes('</') && !code.includes('import')) return 'HTML';
    if (code.includes('{') && code.includes(':') && code.includes('}')) return 'JSON';
    return 'Code';
  };

  const language = getLanguageFromCode(result);

  // Count lines for line numbers
  const lines = result.split('\n');

  return (
    <motion.div
      key="result-code"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`relative w-12 h-12 rounded-xl ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center shadow-lg`}
        >
          <div className={`absolute inset-0 rounded-xl ${TAB_COLORS[meta.color].bgActive} opacity-40 blur-md`} />
          <meta.icon className="w-5 h-5 text-white relative z-10" />
        </motion.div>
        <div className="flex-1">
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base font-semibold text-foreground"
          >
            {meta.title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            <Bot className="w-3 h-3" />
            Généré par UnifyFocus AI
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2"
        >
          <Badge variant="outline" className="rounded-lg text-xs bg-white/5 border-white/10 uppercase">
            {language}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-colors"
            title={isExpanded ? "Réduire" : "Agrandir"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-colors"
            title="Copier le code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </motion.div>
      </div>

      {/* Result card with professional code editor styling */}
      <GlassCard variant="output" className="overflow-hidden" style={{ maxHeight: isExpanded ? 'none' : '600px', display: 'flex', flexDirection: 'column' }}>
        <div className={`absolute top-0 left-0 right-0 h-1 ${TAB_COLORS[meta.color].bgActive} opacity-80`} />
        
        {/* Code editor container */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-white/10">
          <div className="relative">
            {/* Line numbers */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-900/50 border-r border-white/5 flex flex-col items-end py-4 pr-3 select-none">
              {lines.map((_, i) => (
                <span key={i} className="text-xs text-slate-600 font-mono leading-6 h-6">
                  {i + 1}
                </span>
              ))}
            </div>
            
            {/* Code content */}
            <pre className="pl-14 pr-5 py-4 font-mono text-sm leading-6 overflow-x-auto">
              <code
                className="text-slate-200"
                dangerouslySetInnerHTML={{ __html: highlightCode(result) }}
              />
            </pre>
          </div>
        </div>
        
        {/* Footer with line count */}
        <div className="border-t border-white/5 px-4 py-2 bg-slate-900/30">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>{lines.length} ligne{lines.length > 1 ? 's' : ''}</span>
            <span>{result.length} caractère{result.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </GlassCard>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-3 mt-5"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <RefreshCw className="w-4 h-4" />
          Régénérer
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium
            bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-white/20
            transition-all duration-300 backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// File Attachments
// ---------------------------------------------------------------------------

function FileAttachments({ files, onRemove, maxFiles }: FileAttachmentProps) {
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.startsWith("video/")) return Video;
    return File;
  };

  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {files.map((file) => {
        const Icon = getFileIcon(file.type);
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-3 px-3 py-2.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 max-w-[320px] hover:border-white/20 transition-colors"
          >
            <div className="w-14 h-14 rounded-lg bg-white/5 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
              {isImage ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : isVideo ? (
                <video
                  src={file.url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Icon className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-medium truncate text-foreground">{file.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 rounded-lg hover:bg-white/10"
              onClick={() => onRemove(file.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}

interface FileAttachmentProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
  maxFiles: number;
}

// ---------------------------------------------------------------------------
// Drop Zone
// ---------------------------------------------------------------------------

function DropZone({ onFilesSelected, accept, disabled }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
        className={`
          relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer
          transition-all duration-300 backdrop-blur-md
          ${
            isDragging
              ? "border-violet-500/50 bg-violet-500/5"
              : "border-white/10 hover:border-white/20 hover:bg-white/5"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={`
              w-14 h-14 rounded-xl flex items-center justify-center
              ${isDragging ? "bg-violet-500/20" : "bg-white/5"}
            `}
          >
            <Upload
              className={`w-6 h-6 ${isDragging ? "text-violet-400" : "text-muted-foreground"}`}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Glissez-déposez vos fichiers ici
            </p>
            <p className="text-xs text-muted-foreground">
              ou cliquez pour parcourir (max {MAX_FILES} fichiers)
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}

interface DropZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  accept: string;
  disabled: boolean;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AiEditorView() {
  const {
    user,
    editorTab,
    setEditorTab,
    isGenerating,
    setIsGenerating,
    addGeneration,
    generations,
    setGenerations,
    clearGenerations,
    setAuth,
    setCurrentView,
    selectedModel,
    setSelectedModel,
    currentConversation,
    setCurrentConversation,
    addConversation,
    conversations,
    setConversations,
    editorOptions,
    setEditorOptions,
    selectedSubtool,
    setSelectedSubtool,
  } = useAppStore();

  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedFeature');
      if (saved) {
        setSelectedSubtool(saved);
      }
    }
  }, [setSelectedSubtool]);

  const currentSubTabs = useMemo(() => {
    switch (editorTab) {
      case 'text': return TEXT_SUBTABS;
      case 'image': return IMAGE_SUBTABS;
      case 'video': return VIDEO_SUBTABS;
      case 'code': return CODE_SUBTABS;
      default: return [];
    }
  }, [editorTab]);

  const activeSubTabConfig = useMemo(() => {
    return currentSubTabs.find(st => st.key === selectedSubtool) || currentSubTabs[0];
  }, [currentSubTabs, selectedSubtool]);

  useEffect(() => {
    if (!currentSubTabs.some((tab) => tab.key === selectedSubtool)) {
      setSelectedSubtool(currentSubTabs[0]?.key || "text-generation");
    }
  }, [currentSubTabs, selectedSubtool, setSelectedSubtool]);

  const getPlaceholder = useCallback(() => {
    const placeholders: Record<string, string> = {
      'text-generation': 'Décrivez la musique que vous souhaitez générer...',
      'text-to-image': 'Décrivez l\'image que vous souhaitez créer en détail...',
      'image-to-image': 'Joignez une image et décrivez les transformations souhaitées...',
      'image-to-text': 'Joignez une image pour en extraire le texte...',
      'text-to-video': 'Décrivez la vidéo que vous souhaitez produire...',
      'video-to-video': 'Joignez une vidéo et décrivez les transformations souhaitées...',
      'video-to-text': 'Joignez une vidéo pour la transcrire en texte...',
    };
    return placeholders[selectedSubtool] || PLACEHOLDERS[editorTab];
  }, [selectedSubtool, editorTab]);

  const [prompt, setPrompt] = useState("");
  const [lastResult, setLastResult] = useState<ResultPayload | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const activeTabConfig = useMemo(
    () => TAB_CONFIG.find((t) => t.key === editorTab)!,
    [editorTab]
  );

  const currentCredits = activeSubTabConfig?.credits || activeTabConfig.credits;

  const hasSourceFile = useMemo(() => {
    if (attachedFiles.length === 0) return false;
    const sourceFile = attachedFiles[0];
    return (
      (editorTab === "image" && sourceFile.type.startsWith("image/")) ||
      (editorTab === "video" && sourceFile.type.startsWith("video/"))
    );
  }, [editorTab, attachedFiles]);

  const requiresSourceFile = useMemo(
    () =>
      [
          "image-to-image",
          "image-to-text",
          "video-to-video",
          "video-to-text",
        ].includes(selectedSubtool),
      [selectedSubtool]
  );

  const canGenerate = useMemo(
    () =>
      prompt.trim().length > 0 &&
      !isGenerating &&
      (user?.role === "admin" || (user?.credits ?? 0) >= currentCredits) &&
      (!requiresSourceFile || hasSourceFile),
    [prompt, isGenerating, user, currentCredits, requiresSourceFile, hasSourceFile]
  );

  const generateButtonLabel = useMemo(() => {
    switch (selectedSubtool) {
      case "text-generation":
        return "Générer la musique";
      case "text-to-music":
        return "Générer la musique";
      case "music-to-music":
        return "Transformer la musique";
      case "text-to-image":
        return "Générer l'image";
      case "image-to-image":
        return "Transformer l'image";
      case "image-to-text":
        return "Extraire le texte";
      case "text-to-video":
        return "Générer la vidéo";
      case "video-to-video":
        return "Transformer la vidéo";
      case "video-to-text":
        return "Transcrire la vidéo";
      case "code-generation":
        return "Générer le code";
      case "code-refactor":
        return "Refactoriser le code";
      case "code-explain":
        return "Expliquer le code";
      case "code-debug":
        return "Déboguer le code";
      default:
        return "Générer";
    }
  }, [selectedSubtool]);

  const currentOptions = useMemo(() => {
    switch (editorTab) {
      case "text":
        return {
          style: editorOptions.textStyle,
          length: editorOptions.textLength,
          tone: editorOptions.textTone,
        };
      case "image":
        return {
          style: editorOptions.imageStyle,
          format: editorOptions.imageFormat,
          quality: editorOptions.imageQuality,
        };
      case "video":
        return {
          duration: editorOptions.videoDuration,
          style: editorOptions.videoStyle,
          format: editorOptions.videoFormat,
        };
      case "code":
        return {
          language: editorOptions.codeLanguage,
          framework: editorOptions.codeFramework,
          complexity: editorOptions.codeComplexity,
        };
      default:
        return {};
    }
  }, [editorTab, editorOptions]);

  const readFileAsDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Impossible de lire le fichier source."));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("Erreur de lecture du fichier."));
      reader.readAsDataURL(file);
    });
  }, []);

  const clearAttachedFiles = useCallback(() => {
    setAttachedFiles((prev) => {
      prev.forEach((file) => URL.revokeObjectURL(file.url));
      return [];
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!user || !canGenerate) return;

    setIsGenerating(true);
    setLastResult(null);
    setStreamingContent("");

    try {
      const endpoint = SUBTAB_ENDPOINTS[selectedSubtool] || API_ENDPOINTS[editorTab];
      const options = { ...currentOptions } as any;

      if (attachedFiles.length > 0) {
        const sourceFile = attachedFiles[0];
        if (sourceFile.type.startsWith("image/")) {
          options.sourceImage = await readFileAsDataUrl(sourceFile.file);
        } else if (sourceFile.type.startsWith("video/")) {
          options.sourceVideo = await readFileAsDataUrl(sourceFile.file);
        } else if (sourceFile.type.startsWith("audio/")) {
          options.sourceAudio = await readFileAsDataUrl(sourceFile.file);
        } else {
          options.sourceDocument = await readFileAsDataUrl(sourceFile.file);
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          prompt: prompt.trim(),
          options,
          model: selectedModel,
          subtype: selectedSubtool,
          conversationId: currentConversation?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Insufficient credits
        if (res.status === 402) {
          notifyInsufficientCredits();
          setIsGenerating(false);
          return;
        }

        // Connection / provider errors (bad gateway, service unavailable, gateway timeout)
        if ([502, 503, 504].includes(res.status)) {
          notifyConnectionFailure(undefined, data.error || res.statusText);
          setIsGenerating(false);
          return;
        }

        // Generic generation failure
        notifyGenerationFailure(data.error || "Erreur de génération");
        setIsGenerating(false);
        return;
      }

      const trimmedPrompt = prompt.trim();

      addGeneration(data.generation);
      setAuth({ ...user, credits: data.credits });

      setLastResult({
        type: data.generation.type,
        subtype: selectedSubtool,
        result: data.generation.result,
      });

      setPrompt("");
      clearAttachedFiles();

      if (
        currentConversation &&
        editorTab === "text" &&
        !["text-generation", "text-to-music", "music-to-music"].includes(selectedSubtool)
      ) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: trimmedPrompt },
          { role: "assistant", content: data.generation.result },
        ]);
      }

      const resultType = RESULT_TOAST_LABEL[selectedSubtool] ??
        (editorTab === "text" ? "texte" : editorTab === "image" ? "image" : editorTab === "video" ? "vidéo" : "code");
      toast({
        title: "Génération terminée !",
        description: `Votre ${resultType} a été généré avec succès.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur inattendue lors de la génération";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setStreamingContent("");
    }
  }, [user, canGenerate, editorTab, prompt, currentOptions, selectedModel, currentConversation, setIsGenerating, addGeneration, setAuth, toast]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleNew = useCallback(() => {
    setPrompt("");
    setLastResult(null);
    setMessages([]);
    setStreamingContent("");
  }, []);

  const handleClearHistory = useCallback(() => {
    if (generations.length === 0) {
      toast({
        title: "Aucun historique",
        description: "Il n'y a rien à supprimer.",
        variant: "destructive",
      });
      return;
    }
    clearGenerations();
    setLastResult(null);
    toast({
      title: "Historique supprimé",
      description: `${generations.length} génération(s) ont été supprimées.`,
    });
  }, [generations.length, clearGenerations, toast]);

  const handleNewConversation = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: `Nouvelle conversation ${new Date().toLocaleDateString("fr-FR")}`,
          model: selectedModel,
          type: editorTab,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        addConversation(data.conversation);
        setCurrentConversation(data.conversation);
        setMessages([]);
        setPrompt("");
        setLastResult(null);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }, [user, selectedModel, editorTab, addConversation, setCurrentConversation]);

  const handleSelectConversation = useCallback(async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setSelectedModel(conversation.model);

    try {
      const res = await fetch(`/api/conversations/${conversation.id}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.conversation.messages || []);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  }, [setCurrentConversation, setSelectedModel]);

  useEffect(() => {
    setAttachedFiles([]);
  }, [editorTab]);

  const getModelName = (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    return model?.name || modelId;
  };

  const handleFormatInsert = useCallback(
    (text: string) => {
      if (!text) return;
      const textarea = document.querySelector("textarea");
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newPrompt = prompt.substring(0, start) + text + prompt.substring(end);
      setPrompt(newPrompt);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    },
    [prompt]
  );

  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const allowedTypes = ALLOWED_FILE_TYPES[editorTab];
      const newFiles: AttachedFile[] = [];
      const remainingSlots = MAX_FILES - attachedFiles.length;

      if (remainingSlots <= 0) {
        toast({
          title: "Limite atteinte",
          description: `Vous ne pouvez pas ajouter plus de ${MAX_FILES} fichiers.`,
          variant: "destructive",
        });
        return;
      }

      for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
        const candidate = files[i];
        const isFileLike =
          candidate &&
          typeof (candidate as any).name === "string" &&
          typeof (candidate as any).size === "number";
        if (!isFileLike) continue;

        const file = candidate as File;
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!allowedTypes.includes(ext) && !allowedTypes.includes(file.type)) {
          toast({
            title: "Type de fichier non supporté",
            description: `Le fichier "${file.name}" n'est pas autorisé.`,
            variant: "destructive",
          });
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "Fichier trop volumineux",
            description: `Le fichier "${file.name}" dépasse ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
            variant: "destructive",
          });
          continue;
        }

        newFiles.push({
          id: `${Date.now()}-${i}-${file.name}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          file: file,
        });
      }

      if (newFiles.length > 0) {
        setAttachedFiles((prev) => [...prev, ...newFiles]);
        toast({
          title: "Fichiers ajoutés",
          description: `${newFiles.length} fichier(s) ajouté(s) avec succès.`,
        });
      }
    },
    [editorTab, attachedFiles.length, toast]
  );

  const handleRemoveFile = useCallback((id: string) => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const getAcceptString = useMemo(() => {
    const types = ALLOWED_FILE_TYPES[editorTab] ?? [];
    return types.join(",");
  }, [editorTab]);

  useEffect(() => {
    if (
      isGenerating &&
      (editorTab === "code" ||
        (editorTab === "text" &&
          !["text-generation", "text-to-music", "music-to-music"].includes(selectedSubtool)))
    ) {
      setStreamingContent("");
      
      const startStreaming = async () => {
        try {
          const response = await fetch("/api/generate/text-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: prompt.trim(),
              options: currentOptions,
              type: editorTab,
              model: selectedModel,
            }),
          });

          if (!response.ok) {
            throw new Error("Erreur de génération");
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
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.done) {
                    break;
                  }
                  if (parsed.buffer) {
                    setStreamingContent(parsed.buffer);
                  }
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          const msg = error instanceof Error ? error.message : String(error);
          // Use professional toast
          notifyGenerationFailure(msg);
          setStreamingContent("Erreur lors de la génération...");
        }
      };

      startStreaming();
    }
  }, [isGenerating, editorTab, prompt, currentOptions, selectedModel]);

  const renderOutput = () => {
    if (isGenerating) {
      return <ProfessionalGeneratingAnimation tab={editorTab} subtype={selectedSubtool} streamingContent={streamingContent} />;
    }

    if (lastResult && lastResult.type === "text" && lastResult.result) {
      return (
        <TextResult
          result={lastResult.result}
          meta={getResultMeta(lastResult.subtype, editorTab)}
          onRegenerate={handleRegenerate}
          onNew={handleNew}
        />
      );
    }

    if (lastResult && lastResult.type === "image" && lastResult.result) {
      return (
        <ImageResult
          result={lastResult.result}
          meta={getResultMeta(lastResult.subtype, editorTab)}
          onRegenerate={handleRegenerate}
          onNew={handleNew}
        />
      );
    }

    if (lastResult && lastResult.type === "video" && lastResult.result) {
      return (
        <VideoResult
          result={lastResult.result}
          meta={getResultMeta(lastResult.subtype, editorTab)}
          onRegenerate={handleRegenerate}
          onNew={handleNew}
        />
      );
    }

    if (lastResult && lastResult.type === "audio" && lastResult.result) {
      return (
        <AudioResult
          result={lastResult.result}
          meta={getResultMeta(lastResult.subtype, editorTab)}
          onRegenerate={handleRegenerate}
          onNew={handleNew}
        />
      );
    }

    if (lastResult && lastResult.type === "code" && lastResult.result) {
      return (
        <CodeResult
          result={lastResult.result}
          meta={getResultMeta(lastResult.subtype, editorTab)}
          onRegenerate={handleRegenerate}
          onNew={handleNew}
        />
      );
    }

    return <EmptyState tab={editorTab} />;
  };

  const tabConfig = TAB_CONFIG.find((t) => t.key === editorTab);
  const tabColor = tabConfig?.color || "blue";
  const colors = TAB_COLORS[tabColor as keyof typeof TAB_COLORS];

  return (
    <div className="flex flex-col h-full min-h-0 bg-background relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Conversation Sidebar */}
      <ConversationSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            className={`rounded-xl ${sidebarOpen ? "bg-white/10" : ""}`}
          >
            {sidebarOpen ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView("dashboard")}
            aria-label="Retour au tableau de bord"
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {currentConversation && (
            <Badge variant="outline" className="rounded-xl text-xs px-3 py-1.5 bg-white/5 border-white/10">
              <MessageSquare className="w-3 h-3 mr-1" />
              {currentConversation.title}
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl max-w-[180px] bg-white/5 border-white/10">
                <Sparkles className="w-4 h-4 text-gold" />
                <span className="truncate">{getModelName(selectedModel)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px] rounded-xl bg-card/90 backdrop-blur-xl border-white/10">
              {AVAILABLE_MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={selectedModel === model.id ? "bg-white/10 rounded-lg" : ""}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Coins className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium">{user?.credits ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex items-center justify-center gap-3 py-4 flex-wrap">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = editorTab === tab.key;
              return (
                <ModernTabChip
                  key={tab.key}
                  active={isActive}
                  onClick={() => {
                    setEditorTab(tab.key);
                    setLastResult(null);
                  }}
                  color={tab.color as keyof typeof TAB_COLORS}
                  icon={Icon}
                >
                  {tab.label}
                </ModernTabChip>
              );
            })}
          </div>

          {/* Sub-tabs */}
          {currentSubTabs.length > 0 && (
            <div className="flex items-center justify-center flex-wrap gap-2 pb-4">
              {currentSubTabs.map((subTab) => {
                const SubIcon = subTab.icon;
                const isActive = selectedSubtool === subTab.key;
                return (
                  <SubTabButton
                    key={subTab.key}
                    active={isActive}
                    onClick={() => {
                      setSelectedSubtool(subTab.key);
                      localStorage.setItem('selectedFeature', subTab.key);
                    }}
                    icon={SubIcon}
                    label={subTab.label}
                    credits={subTab.credits}
                  />
                );
              })}
            </div>
          )}

          {/* Help Text Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard variant="accent" className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                  <Sparkles className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    {activeSubTabConfig?.description || TAB_HELP_TEXT[editorTab]}
                  </p>
                  {(editorTab === "image" || editorTab === "video") && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {hasSourceFile
                        ? `Source détectée : ${editorTab === "image" ? "image → image" : "vidéo → vidéo"}.`
                        : `Ajoutez un fichier source pour transformer un contenu existant.`}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <div className="space-y-6">
            {/* Result Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <div>
                <AnimatePresence mode="wait">{renderOutput()}</AnimatePresence>
              </div>

              {/* Input Area */}
              <GlassCard variant="input" className="p-0 overflow-hidden">
                {attachedFiles.length > 0 && (
                  <div className="p-4 border-b border-white/10">
                    <FileAttachments
                      files={attachedFiles}
                      onRemove={handleRemoveFile}
                      maxFiles={MAX_FILES}
                    />
                  </div>
                )}

                <div className="p-4">
                  <Textarea
                    value={prompt}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_CHARS) {
                        setPrompt(e.target.value);
                      }
                    }}
                    placeholder={getPlaceholder()}
                    className="min-h-[140px] bg-transparent border-0 resize-none focus:ring-0 text-foreground text-base p-0 placeholder:text-muted-foreground/50"
                    disabled={isGenerating}
                  />
                </div>

                <div className="flex items-center justify-between px-4 pb-4">
                  <div className="flex items-center gap-2">
                    {attachedFiles.length < MAX_FILES && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept={getAcceptString}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleFilesSelected(e.target.files);
                            }
                          }}
                          className="hidden"
                          disabled={isGenerating}
                        />
                        <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10">
                          <Paperclip className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </label>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {prompt.length} / {MAX_CHARS}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={`
                      flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold
                      shadow-lg transition-all duration-300
                      ${
                        canGenerate
                          ? `${colors.bgActive} ${colors.textActive} ${colors.glow} shadow-xl hover:shadow-2xl`
                          : 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/10'
                      }
                    `}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Génération...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>{generateButtonLabel}</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {user?.role !== "admin" && (user?.credits ?? 0) < currentCredits && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <Coins className="w-3 h-3" />
                      <span>Crédits insuffisants pour cette action</span>
                    </div>
                  </div>
                )}
                {requiresSourceFile && !hasSourceFile && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 text-xs text-amber-600">
                      <Paperclip className="w-3 h-3" />
                      <span>Ajoutez un fichier source valide pour cette action.</span>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiEditorView;