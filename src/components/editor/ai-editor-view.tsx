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
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
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
  LayoutDashboard,
  Sparkles as SparklesIcon,
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
  { key: "text" as const, label: "Musique", icon: Music, credits: 1, color: "blue", description: "Générez de la musique à partir de descriptions textuelles" },
  { key: "image" as const, label: "Image", icon: ImageIcon, credits: 3, color: "purple", description: "Créez et transformez des images avec l'IA" },
  { key: "video" as const, label: "Vidéo", icon: Video, credits: 5, color: "orange", description: "Générez et éditez des vidéos automatiquement" },
  { key: "code" as const, label: "Code", icon: Code, credits: 2, color: "green", description: "Générez, expliquez et déboguez du code" },
] as const;

const TEXT_SUBTABS = [
  { key: "text-generation", label: "Générer", icon: Music, credits: 1, description: "Composez une musique unique - choisissez genre, ambiance et durée" },
  { key: "text-to-music", label: "Texte → Musique", icon: Music, credits: 2, description: "Transformez vos paroles ou descriptions en compositions musicales" },
  { key: "music-to-music", label: "Transformer", icon: Sparkles, credits: 2, description: "Réinventez un morceau en changeant son style ou son ambiance" },
];

const IMAGE_SUBTABS = [
  { key: "text-to-image", label: "Générer", icon: Wand2, credits: 3, description: "Créez des images depuis du texte" },
  { key: "image-to-image", label: "Transformer", icon: Camera, credits: 3, description: "Transformez vos images" },
  { key: "image-to-text", label: "Extraire", icon: Type, credits: 2, description: "Extrayez du texte d'images" },
];

const VIDEO_SUBTABS = [
  { key: "text-to-video", label: "Générer", icon: Film, credits: 5, description: "Générez des vidéos depuis du texte" },
  { key: "video-to-video", label: "Transformer", icon: Video, credits: 5, description: "Transformez vos vidéos" },
  { key: "video-to-text", label: "Transcrire", icon: FileText, credits: 4, description: "Transcription de vidéos" },
];

const CODE_SUBTABS = [
  { key: "code-generation", label: "Générer", icon: Code, credits: 2, description: "Générez du code dans n'importe quel langage" },
  { key: "code-refactor", label: "Refactoriser", icon: Braces, credits: 2, description: "Optimisez et nettoyez votre code" },
  { key: "code-explain", label: "Expliquer", icon: FileCode, credits: 1, description: "Comprenez un code complexe" },
  { key: "code-debug", label: "Déboguer", icon: Terminal, credits: 2, description: "Trouvez et corrigez les bugs" },
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

// Modern Media.io-inspired color palette
const TAB_COLORS = {
  blue: {
    bg: "bg-blue-50",
    bgActive: "bg-blue-600",
    text: "text-blue-600",
    textActive: "text-white",
    border: "border-blue-200",
    borderActive: "border-blue-600",
    light: "bg-blue-50",
    gradient: "from-blue-500 to-blue-600",
  },
  purple: {
    bg: "bg-purple-50",
    bgActive: "bg-purple-600",
    text: "text-purple-600",
    textActive: "text-white",
    border: "border-purple-200",
    borderActive: "border-purple-600",
    light: "bg-purple-50",
    gradient: "from-purple-500 to-purple-600",
  },
  orange: {
    bg: "bg-orange-50",
    bgActive: "bg-orange-600",
    text: "text-orange-600",
    textActive: "text-white",
    border: "border-orange-200",
    borderActive: "border-orange-600",
    light: "bg-orange-50",
    gradient: "from-orange-500 to-orange-600",
  },
  green: {
    bg: "bg-emerald-50",
    bgActive: "bg-emerald-600",
    text: "text-emerald-600",
    textActive: "text-white",
    border: "border-emerald-200",
    borderActive: "border-emerald-600",
    light: "bg-emerald-50",
    gradient: "from-emerald-500 to-emerald-600",
  },
};

// ---------------------------------------------------------------------------
// UI Components - Glassmorphism Style
// ---------------------------------------------------------------------------

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
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
        className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
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
        className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
      />
    </div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-white/10
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
// ---------------------------------------------------------------------------
// Custom Hooks
// ---------------------------------------------------------------------------

function useEditorState(editorTab: string, selectedSubtool: string, setSelectedSubtool: (key: string) => void) {
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

  return { currentSubTabs, activeSubTabConfig };
}

function useFileAttachments(editorTab: string) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  useEffect(() => {
    setAttachedFiles([]);
  }, [editorTab]);

  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const allowedTypes = ALLOWED_FILE_TYPES[editorTab];
      const newFiles: AttachedFile[] = [];
      const remainingSlots = MAX_FILES - attachedFiles.length;

      if (remainingSlots <= 0) {
        return { success: false, message: `Vous ne pouvez pas ajouter plus de ${MAX_FILES} fichiers.` };
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
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
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
        return { success: true, count: newFiles.length };
      }

      return { success: false, message: "Aucun fichier valide ajouté." };
    },
    [editorTab, attachedFiles.length]
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

  const clearFiles = useCallback(() => {
    setAttachedFiles((prev) => {
      prev.forEach((file) => URL.revokeObjectURL(file.url));
      return [];
    });
  }, []);

  return { attachedFiles, handleFilesSelected, handleRemoveFile, clearFiles };
}

function SubToolSelector({ subtabs, activeSubtool, onSubtoolChange }: {
  subtabs: any[];
  activeSubtool: string;
  onSubtoolChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/20 border border-slate-800/50 backdrop-blur-sm">
      {subtabs.map((subTab) => {
        const SubIcon = subTab.icon;
        const isActive = activeSubtool === subTab.key;

        return (
          <motion.button
            key={subTab.key}
            onClick={() => onSubtoolChange(subTab.key)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`
              relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              transition-colors duration-300
              ${isActive
                ? 'text-white'
                : 'text-slate-400 hover:text-white'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeSubtoolIndicator"
                className="absolute inset-0 rounded-lg bg-slate-700/50 border border-slate-600 shadow-md"
              />
            )}
            <SubIcon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{subTab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function ResultCard({ children, header, meta, onRegenerate, onNew }: {
  children: React.ReactNode;
  header: React.ReactNode;
  meta: ResultMeta;
  onRegenerate: () => void;
  onNew: () => void;
}) {
  return (
    <div className="space-y-4">
      {header}
      <GlassCard>
        <div className="p-6">
          {children}
        </div>
      </GlassCard>
      <div className="flex items-center gap-3">
        <Button
          onClick={onRegenerate}
          variant="secondary"
          className="flex-1 gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Régénérer
        </Button>
        <Button
          onClick={onNew}
          variant="secondary"
          className="flex-1 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Selector (replaces SidebarNav functionality)
// ---------------------------------------------------------------------------

function TabSelector({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: typeof TAB_CONFIG;
  activeTab: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const colors = TAB_COLORS[tab.color as keyof typeof TAB_COLORS];

        return (
          <motion.button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative px-5 py-2.5 rounded-xl font-medium transition-all duration-300
              flex items-center gap-2 text-sm border
              ${isActive ? `${colors.bgActive} ${colors.textActive} shadow-lg shadow-${tab.color}-500/30 border-transparent` : `bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800`}
            `}
          >
            {isActive && <motion.div layoutId="activeTabGlow" className={`absolute inset-0 rounded-xl bg-gradient-to-r ${colors.gradient} opacity-30 blur-md`} />}
            <Icon className={`w-4 h-4 relative z-10 ${isActive ? "" : "opacity-70"}`} />
            <span className="relative z-10">{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ tab, description }: { tab: string; description?: string }) {
  const tabConfig = TAB_CONFIG.find((t) => t.key === tab);
  const Icon = tabConfig?.icon || Sparkles;
  const color = tabConfig?.color || "blue";
  const colors = TAB_COLORS[color as keyof typeof TAB_COLORS];

  return (
    <GlassCard>
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className={`w-20 h-20 rounded-2xl ${colors.bgActive} bg-opacity-10 flex items-center justify-center mb-6`}>
          <Icon className={`w-10 h-10 ${colors.text}`} />
        </div>
        
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          Prêt à créer
        </h3>
        
        <p className="text-slate-400 text-center max-w-md mb-8">
          {description || "Décrivez ce que vous souhaitez générer et laissez l'IA faire le reste."}
        </p>

        <div className="flex gap-6">
          {[
            { icon: Zap, label: "Rapide", desc: "Génération en secondes" },
            { icon: Cpu, label: "IA Puissante", desc: "Modèles dernière génération" },
            { icon: Palette, label: "Qualité", desc: "Résultats professionnels" },
          ].map((item, i) => (
            <div key={item.label} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center mb-2 mx-auto">
                <item.icon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Professional Generation Animation
// ---------------------------------------------------------------------------
function GeneratingAnimation({ tab, subtype }: { tab: string; subtype?: string }) {
  const tabConfig = TAB_CONFIG.find((t) => t.key === tab);
  const color = tabConfig?.color || "blue";
  const colors = TAB_COLORS[color as keyof typeof TAB_COLORS];

  const isMusicMode = tab === "text" && subtype && ["text-generation", "text-to-music", "music-to-music"].includes(subtype);
  const actionLabel = isMusicMode ? "musique" : tab === "text" ? "texte" : tab === "image" ? "image" : tab === "video" ? "vidéo" : "code";

  return (
    <GlassCard>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-16 h-16 mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className={`w-full h-full border-4 border-slate-700 border-t-blue-500 rounded-full`} />
          </motion.div>
        </div>
        
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          Génération en cours
        </h3>
        
        <p className="text-sm text-slate-400">
          Création de votre {actionLabel}...
        </p>
      </div>
    </GlassCard>
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

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center`}>
          <meta.icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">{meta.title}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Bot className="w-3 h-3" />
            Généré par UnifyFocus AI
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-9 w-9 p-0"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-600" />
        ) : (
          <Copy className="w-4 h-4 text-slate-400" />
        )}
      </Button>
    </div>
  );

  return (
    <ResultCard header={header} meta={meta} onRegenerate={onRegenerate} onNew={onNew}>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
          {result}
        </p>
      </div>
    </ResultCard>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg"
      onClick={onClose}
    >
      <motion.button
        onClick={onClose}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-6 right-6 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
      >
        <X className="w-6 h-6" />
      </motion.button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-40 max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "image" ? (
          <img
            src={src}
            alt={title}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        )}
      </motion.div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm border border-white/10">
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
  const [isDownloading, setIsDownloading] = useState(false);

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
  }, [result, toast, imageSrcIsValid, showWatermark]);

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center`}>
          <meta.icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">{meta.title}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Bot className="w-3 h-3" />
            Généré par UnifyFocus AI
          </p>
        </div>
      </div>
      {imageSrcIsValid && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
          className="h-9 w-9 p-0"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-slate-400" />
          )}
        </Button>
      )}
    </div>
  );

  return (
    <ResultCard header={header} meta={meta} onRegenerate={onRegenerate} onNew={onNew}>
      {imageSrcIsValid ? (
        <div className="relative overflow-hidden rounded-xl cursor-pointer group bg-slate-900/50" onClick={() => setIsViewerOpen(true)}>
          <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl backdrop-blur-sm">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm flex items-center gap-2 border border-white/20">
              <Maximize2 className="w-4 h-4" />
              <span>Agrandir</span>
            </div>
          </div>
          <img
            src={result}
            alt="Image générée par IA"
            className="w-full max-h-[480px] rounded-xl object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10">
          <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm text-red-600 text-center">
            Erreur : l'image n'a pas pu être générée.
          </p>
        </div>
      )}

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
    </ResultCard>
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
  }, [result, videoSrcIsValid, showWatermark, toast]);

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center`}>
          <meta.icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">{meta.title}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Bot className="w-3 h-3" />
            Généré par UnifyFocus AI
          </p>
        </div>
      </div>
      {videoSrcIsValid && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={isRecording}
          className="h-9 w-9 p-0"
        >
          {isRecording ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-slate-400" />
          )}
        </Button>
      )}
    </div>
  );

  return (
    <ResultCard header={header} meta={meta} onRegenerate={onRegenerate} onNew={onNew}>
      {videoSrcIsValid ? (
        <div className="relative overflow-hidden rounded-xl bg-black cursor-pointer group" onClick={() => setIsViewerOpen(true)}>
          <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl backdrop-blur-sm">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm flex items-center gap-2 border border-white/20">
              <Maximize2 className="w-4 h-4" />
              <span>Agrandir</span>
            </div>
          </div>
          <video
            controls
            src={result}
            className="w-full max-h-[480px] rounded-xl object-contain"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10">
          <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm text-gray-600 text-center">
            {result}
          </p>
        </div>
      )}

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
    </ResultCard>
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

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

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      void audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !audioRef.current.muted;
    setIsMuted(audioRef.current.muted);
  }, []);

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center`}>
          <meta.icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">{meta.title}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Bot className="w-3 h-3" />
            Généré par UnifyFocus AI
          </p>
        </div>
      </div>
      {audioSrcIsValid && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="h-9 w-9 p-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-9 w-9 p-0"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <ResultCard header={header} meta={meta} onRegenerate={onRegenerate} onNew={onNew}>
      {audioSrcIsValid ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${TAB_COLORS[meta.color].bgActive}`}>
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Lecteur audio</p>
                <p className="text-xs text-slate-400">Lecture instantanée et contrôle de volume</p>
              </div>
            </div>
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
              Prêt à lire
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${TAB_COLORS[meta.color].bgActive} text-white shadow-lg transition-transform hover:scale-105`}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Lecture</span>
                  <span>{isPlaying ? "En cours" : "En pause"}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700">
                  <div className={`h-2 rounded-full ${TAB_COLORS[meta.color].bgActive} w-3/4`} />
                </div>
              </div>
            </div>

            <audio
              ref={audioRef}
              controls
              src={result}
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10">
          <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm text-gray-600 text-center">
            L'audio n'a pas pu être généré correctement.
          </p>
        </div>
      )}
    </ResultCard>
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

  const highlightCode = (code: string) => {
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

    let escaped = escapeHtml(code);

    escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="text-gray-500 italic">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500 italic">$1</span>');
    
    escaped = escaped.replace(/(&#039;[^&#]*?&#039;)/g, '<span class="text-emerald-600">$1</span>');
    escaped = escaped.replace(/("[^&]*?")/g, '<span class="text-emerald-600">$1</span>');
    escaped = escaped.replace(/(`[^`]*?`)/g, '<span class="text-emerald-600">$1</span>');
    
    const keywords = [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 
      'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 
      'throw', 'new', 'this', 'typeof', 'instanceof', 'switch', 'case', 'break',
      'continue', 'default', 'do', 'in', 'of', 'yield', 'delete', 'void',
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'
    ];
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      escaped = escaped.replace(regex, '<span class="text-purple-600 font-medium">$1</span>');
    });

    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-600">$1</span>');

    escaped = escaped.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="text-blue-600">$1</span>');

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
  const lines = result.split('\n');

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${TAB_COLORS[meta.color].bgActive} flex items-center justify-center`}>
          <meta.icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">{meta.title}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Bot className="w-3 h-3" />
            Généré par UnifyFocus AI
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-md text-xs bg-slate-800 border-slate-700 text-slate-300">
          {language}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-9 w-9 p-0"
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4 text-slate-400" />
          ) : (
            <Maximize2 className="w-4 h-4 text-slate-400" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-9 w-9 p-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-slate-400" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <ResultCard header={header} meta={meta} onRegenerate={onRegenerate} onNew={onNew}>
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden">
        <div className="flex-1 overflow-auto" style={{ maxHeight: isExpanded ? 'none' : '500px' }}>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-800/50 border-r border-slate-700 flex flex-col items-end py-4 pr-3 select-none">
              {lines.map((_, i) => (
                <span key={i} className="text-xs text-slate-500 font-mono leading-6 h-6">
                  {i + 1}
                </span>
              ))}
            </div>
            
            <pre className="pl-14 pr-5 py-4 font-mono text-sm leading-6 overflow-x-auto bg-transparent">
              <code
                className="text-slate-300"
                dangerouslySetInnerHTML={{ __html: highlightCode(result) }}
              />
            </pre>
          </div>
        </div>
        
        <div className="border-t border-slate-700 px-4 py-2 bg-slate-800/50">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>{lines.length} ligne{lines.length > 1 ? 's' : ''}</span>
            <span>{result.length} caractère{result.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </ResultCard>
  );
}

// ---------------------------------------------------------------------------
// File Attachments
// ---------------------------------------------------------------------------

function FileAttachments({ files, onRemove, maxFiles }: FileAttachmentProps) {
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
    <div className="flex flex-wrap gap-2">
      {files.map((file) => {
        const Icon = getFileIcon(file.type);
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        return (
          <div
            key={file.id}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700 max-w-[280px]"
          >
            <div className="w-10 h-10 rounded-md bg-slate-900/50 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
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
                <Icon className="w-4 h-4 text-slate-400" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs font-medium truncate text-slate-200">{file.name}</p>
              <p className="text-[10px] text-slate-400">
                {formatFileSize(file.size)}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 rounded-md hover:bg-slate-700"
              onClick={() => onRemove(file.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
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

  const { currentSubTabs, activeSubTabConfig } = useEditorState(editorTab, selectedSubtool, setSelectedSubtool);

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
  const { attachedFiles, handleFilesSelected, handleRemoveFile, clearFiles } = useFileAttachments(editorTab);

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
        if (res.status === 402) {
          notifyInsufficientCredits();
          setIsGenerating(false);
          return;
        }

        if ([502, 503, 504].includes(res.status)) {
          notifyConnectionFailure(undefined, data.error || res.statusText);
          setIsGenerating(false);
          return;
        }

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
      clearFiles();

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
  }, [user, canGenerate, editorTab, prompt, currentOptions, selectedModel, currentConversation, setIsGenerating, addGeneration, setAuth, toast, attachedFiles, readFileAsDataUrl, clearFiles]);

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

  const handleFilesSelectedWrapper = useCallback(
    (files: FileList | File[]) => {
      const result = handleFilesSelected(files);
      if (result && !result.success) {
        toast({
          title: "Erreur",
          description: result.message || "Impossible d'ajouter les fichiers.",
          variant: "destructive",
        });
      } else if (result && result.success && result.count) {
        toast({
          title: "Fichiers ajoutés",
          description: `${result.count} fichier(s) ajouté(s) avec succès.`,
        });
      }
    },
    [handleFilesSelected, toast]
  );

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
          notifyGenerationFailure(msg);
          setStreamingContent("Erreur lors de la génération...");
        }
      };

      startStreaming();
    }
  }, [isGenerating, editorTab, prompt, currentOptions, selectedModel]);

  const renderOutput = () => {
    if (isGenerating) {
      return <GeneratingAnimation tab={editorTab} subtype={selectedSubtool} />;
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

    return <EmptyState tab={editorTab} description={activeSubTabConfig?.description || TAB_HELP_TEXT[editorTab]} />;
  };

  const tabConfig = TAB_CONFIG.find((t) => t.key === editorTab);
  const tabColor = tabConfig?.color || "blue";
  const colors = TAB_COLORS[tabColor as keyof typeof TAB_COLORS];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 relative">
      <AnimatedBackground />
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header className="bg-slate-900/50 border-b border-slate-800 px-6 py-4 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back button */}
              <Button variant="ghost" size="icon" onClick={() => setCurrentView("dashboard")} className="rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              {/* Tab Selector */}
              <TabSelector tabs={TAB_CONFIG} activeTab={editorTab} onSelect={(tab) => {
        setEditorTab(tab as "text" | "image" | "video" | "code");
        setLastResult(null);
              }} />

              {/* Current Tab Info (optional, can be removed if TabSelector is descriptive enough) */}
              <div>
                <h1 className="text-lg font-semibold text-slate-100">
                  {activeTabConfig?.label || "Éditeur AI"}
                </h1>
                <p className="text-sm text-slate-400">
                  {activeSubTabConfig?.description || TAB_HELP_TEXT[editorTab]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-lg bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                    <Sparkles className="w-4 h-4" />
                    <span className="truncate">{getModelName(selectedModel)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px] rounded-lg bg-slate-800/90 border-slate-700 text-slate-200 backdrop-blur-md">
                  {AVAILABLE_MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`rounded-md hover:bg-slate-700 ${selectedModel === model.id ? "bg-slate-700" : ""}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-slate-400">{model.description}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-w-7xl mx-auto">
            {/* Left Column: Actions & Inputs */}
            <div className="flex flex-col gap-6">
              {/* Sub-tools */}
              {currentSubTabs.length > 0 && (
                <div>
                  <SubToolSelector 
                    subtabs={currentSubTabs}
                    activeSubtool={selectedSubtool}
                    onSubtoolChange={(key) => {
                      setSelectedSubtool(key);
                      localStorage.setItem('selectedFeature', key);
                    }}
                  />
                </div>
              )}

              {/* Input Area */}
              <GlassCard>
                {attachedFiles.length > 0 && (
                  <div className="p-4 border-b border-slate-700">
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
                    className="min-h-[120px] bg-transparent border-0 resize-none focus:ring-0 text-slate-100 text-base p-0 placeholder:text-slate-500"
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
                              handleFilesSelectedWrapper(e.target.files);
                            }
                          }}
                          className="hidden"
                          disabled={isGenerating}
                        />
                        <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center hover:bg-slate-800 transition-colors border border-slate-700">
                          <Paperclip className="w-5 h-5 text-slate-400" />
                        </div>
                      </label>
                    )}
                    <span className="text-xs text-slate-400">
                      {prompt.length} / {MAX_CHARS}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium
                      shadow-sm transition-all duration-200
                      ${
                        canGenerate
                          ? `${colors.bgActive} text-white hover:opacity-90 shadow-lg shadow-${tabColor}-500/20`
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }
                    `}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Génération...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{generateButtonLabel}</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {user?.role !== "admin" && (user?.credits ?? 0) < currentCredits && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 text-xs text-red-500">
                      <Coins className="w-3 h-3" />
                      <span>Crédits insuffisants pour cette action</span>
                    </div>
                  </div>
                )}
                {requiresSourceFile && !hasSourceFile && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 text-xs text-amber-500">
                      <Paperclip className="w-3 h-3" />
                      <span>Ajoutez un fichier source valide pour cette action.</span>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Right Column: Results */}
            <div>
              <div className="sticky top-6">
                <AnimatePresence mode="wait">
                  {renderOutput()}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Sidebar */}
      <ConversationSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
    </div>
  );
}

export default AiEditorView;