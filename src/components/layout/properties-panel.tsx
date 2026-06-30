"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Download,
  Copy,
  RefreshCw,
  Maximize2,
  Minimize2,
  FileText,
  ImageIcon,
  Video,
  Code,
  Wand2,
  Camera,
  Type,
  Film,
  Braces,
  Terminal,
  FileCode,
  MessageSquare,
  Clock,
  Check,
  AlertCircle,
  Trash2,
  Music,
} from "lucide-react";
import { useAppStore, type Generation } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Option groups for different tools
type OptionDefinition = {
  label: string;
  value: string;
};

type OptionGroup = {
  id: string;
  label: string;
  options: OptionDefinition[];
};

const optionGroups: Record<"text" | "image" | "video" | "code" | "music", OptionGroup[]> = {
  text: [
    {
      id: "style",
      label: "Style",
      options: [
        { value: "professionnel", label: "Professionnel" },
        { value: "creatif", label: "Créatif" },
        { value: "academique", label: "Académique" },
        { value: "casual", label: "Casual" },
        { value: "marketing", label: "Marketing" },
      ],
    },
    {
      id: "length",
      label: "Longueur",
      options: [
        { value: "court", label: "Court (200 mots)" },
        { value: "moyen", label: "Moyen (500 mots)" },
        { value: "long", label: "Long (1000 mots)" },
      ],
    },
    {
      id: "tone",
      label: "Ton",
      options: [
        { value: "informatif", label: "Informatif" },
        { value: "persuasif", label: "Persuasif" },
        { value: "narratif", label: "Narratif" },
        { value: "technique", label: "Technique" },
      ],
    },
  ],
  music: [
    {
      id: "style",
      label: "Genre",
      options: [
        { value: "electro", label: "Électro" },
        { value: "ambient", label: "Ambient" },
        { value: "orchestral", label: "Orchestral" },
        { value: "pop", label: "Pop" },
        { value: "jazz", label: "Jazz" },
      ],
    },
    {
      id: "length",
      label: "Durée",
      options: [
        { value: "court", label: "Court (30 sec)" },
        { value: "moyen", label: "Moyen (1 min)" },
        { value: "long", label: "Long (2 min)" },
      ],
    },
    {
      id: "tone",
      label: "Ambiance",
      options: [
        { value: "calme", label: "Calme" },
        { value: "energique", label: "Énergique" },
        { value: "cinematique", label: "Cinéma" },
        { value: "dramatic", label: "Dramatique" },
      ],
    },
  ],
  image: [
    {
      id: "style",
      label: "Style",
      options: [
        { value: "photorealiste", label: "Photoréaliste" },
        { value: "illustration", label: "Illustration" },
        { value: "art-numerique", label: "Art Numérique" },
        { value: "aquarelle", label: "Aquarelle" },
        { value: "3d", label: "3D" },
      ],
    },
    {
      id: "format",
      label: "Format",
      options: [
        { value: "1:1", label: "Carré (1:1)" },
        { value: "16:9", label: "Paysage (16:9)" },
        { value: "9:16", label: "Portrait (9:16)" },
      ],
    },
    {
      id: "quality",
      label: "Qualité",
      options: [
        { value: "standard", label: "Standard" },
        { value: "hd", label: "HD" },
        { value: "ultra", label: "Ultra HD" },
      ],
    },
  ],
  video: [
    {
      id: "duration",
      label: "Durée",
      options: [
        { value: "5s", label: "5 secondes" },
        { value: "10s", label: "10 secondes" },
        { value: "15s", label: "15 secondes" },
      ],
    },
    {
      id: "style",
      label: "Style",
      options: [
        { value: "cinematique", label: "Cinématique" },
        { value: "animation", label: "Animation" },
        { value: "documentaire", label: "Documentaire" },
        { value: "experimental", label: "Expérimental" },
      ],
    },
    {
      id: "format",
      label: "Format",
      options: [
        { value: "16:9", label: "16:9" },
        { value: "9:16", label: "9:16" },
        { value: "1:1", label: "1:1" },
      ],
    },
  ],
  code: [
    {
      id: "language",
      label: "Langage",
      options: [
        { value: "javascript", label: "JavaScript" },
        { value: "typescript", label: "TypeScript" },
        { value: "python", label: "Python" },
        { value: "java", label: "Java" },
        { value: "csharp", label: "C#" },
        { value: "go", label: "Go" },
        { value: "rust", label: "Rust" },
        { value: "php", label: "PHP" },
      ],
    },
    {
      id: "framework",
      label: "Framework",
      options: [
        { value: "aucun", label: "Aucun" },
        { value: "react", label: "React" },
        { value: "vue", label: "Vue" },
        { value: "angular", label: "Angular" },
        { value: "nextjs", label: "Next.js" },
        { value: "nodejs", label: "Node.js" },
        { value: "django", label: "Django" },
        { value: "spring", label: "Spring" },
      ],
    },
    {
      id: "complexity",
      label: "Complexité",
      options: [
        { value: "simple", label: "Simple" },
        { value: "intermediaire", label: "Intermédiaire" },
        { value: "avance", label: "Avancé" },
        { value: "expert", label: "Expert" },
      ],
    },
  ],
};

interface PropertiesPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function PropertiesPanel({ isOpen = true, onClose }: PropertiesPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    currentView,
    editorTab,
    selectedSubtool,
    generations,
    editorOptions,
    setEditorOptions,
    setGenerations,
    user,
  } = useAppStore();
  const [expandedSections, setExpandedSections] = React.useState<string[]>(["options", "output"]);
  const [selectedGeneration, setSelectedGeneration] = React.useState<Generation | null>(null);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !user || generations.length > 0) return;

    const abortController = new AbortController();
    const signal = abortController.signal;
    const userId = user.id;

    async function fetchGenerations() {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/user/generations`, {
          signal,
          credentials: "include",
        });
        if (!res.ok) return;
        const data: { generations: Generation[] } = await res.json();
        setGenerations(data.generations);
      } catch {
        // ignore failures here
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchGenerations();

    return () => abortController.abort();
  }, [isOpen, user, generations.length, setGenerations]);

  React.useEffect(() => {
    if (!selectedGeneration && generations.length > 0) {
      setSelectedGeneration(generations[0]);
    }
  }, [generations, selectedGeneration]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const optionKeyMap: Record<string, Record<string, string>> = {
    text: {
      style: "textStyle",
      length: "textLength",
      tone: "textTone",
    },
    music: {
      style: "textStyle",
      length: "textLength",
      tone: "textTone",
    },
    image: {
      style: "imageStyle",
      format: "imageFormat",
      quality: "imageQuality",
    },
    video: {
      duration: "videoDuration",
      style: "videoStyle",
      format: "videoFormat",
    },
    code: {
      language: "codeLanguage",
      framework: "codeFramework",
      complexity: "codeComplexity",
    },
  };

  const isMusicTool = ["text-generation", "text-to-music", "music-to-music"].includes(selectedSubtool);
  const currentTool = isMusicTool ? "music" : editorTab || "text";
  const currentOptions = optionGroups[currentTool as keyof typeof optionGroups] || optionGroups.text;

  const getSelectedToolLabel = () => {
    switch (selectedSubtool) {
      case "text-generation":
        return "Génération de musique";
      case "text-to-music":
        return "Texte → Musique";
      case "music-to-music":
        return "Musique → Musique";
      case "text-to-image":
        return "Texte → Image";
      case "image-to-image":
        return "Image → Image";
      case "image-to-text":
        return "Image → Texte";
      case "text-to-video":
        return "Texte → Vidéo";
      case "video-to-video":
        return "Vidéo → Vidéo";
      case "video-to-text":
        return "Vidéo → Texte";
      case "code-generation":
        return "Génération de code";
      case "code-refactor":
        return "Refactorisation de code";
      case "code-explain":
        return "Explication de code";
      case "code-debug":
        return "Débogage de code";
      default:
        return isMusicTool
          ? "Génération de musique"
          : currentTool === "text"
          ? "Génération de musique"
          : currentTool === "image"
          ? "Création d'image"
          : currentTool === "video"
          ? "Production vidéo"
          : currentTool === "code"
          ? "Génération de code"
          : "Propriétés";
    }
  };

  const selectedOptions = React.useMemo(() => {
    switch (currentTool) {
      case "text":
      case "music":
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
  }, [currentTool, editorOptions]);

  const handleOptionSelect = (groupId: string, value: string) => {
    const key = optionKeyMap[currentTool]?.[groupId];
    if (!key) return;
    setEditorOptions({ [key]: value } as any);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="size-4 text-emerald-500" />;
      case "pending":
        return <Clock className="size-4 text-yellow-500 animate-pulse" />;
      case "failed":
        return <AlertCircle className="size-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getToolIcon = (type: string) => {
    switch (type) {
      case "text": return FileText;
      case "music": return Music;
      case "image": return ImageIcon;
      case "video": return Video;
      case "code": return Code;
      default: return FileText;
    }
  };

  const handleDeleteGeneration = async (genId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/user/generations?id=${encodeURIComponent(genId)}`, {
        method: "DELETE",
        credentials: "include",
      });

      setGenerations(generations.filter((g) => g.id !== genId));
      if (selectedGeneration?.id === genId) {
        setSelectedGeneration(null);
      }
      toast({
        title: "Élément supprimé",
        description: "La génération a été supprimée de l'historique.",
      });
    } catch (error) {
      console.error("Failed to delete generation via API:", error);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await fetch(`/api/user/generations`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to clear history via API:", error);
    }

    setGenerations([]);
    setSelectedGeneration(null);
    toast({
      title: "Historique supprimé",
      description: "Tout l'historique a été supprimé.",
    });
  };

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <div className="w-80 border-l border-border bg-surface-1 flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Propriétés</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {/* Tool Info */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                {React.createElement(getToolIcon(currentTool), {
                  className: "size-4 text-accent",
                })}
                <span className="text-sm font-medium text-foreground">
                  {getSelectedToolLabel()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Configurez les options de génération pour obtenir les meilleurs résultats.
              </p>
            </div>

            {/* Generation Options */}
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleSection("options")}
                className="w-full flex items-center justify-between px-3 py-2 bg-surface-2 border-b border-border"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Options de génération</span>
                </div>
                {expandedSections.includes("options") ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.includes("options") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-4">
                      {currentOptions.map((group) => (
                        <div key={group.id}>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                            {group.label}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {group.options.map((option) => {
                              const isSelected = selectedOptions[group.id] === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => handleOptionSelect(group.id, option.value)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                    isSelected
                                      ? "bg-accent text-accent-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  )}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Output Preview */}
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleSection("output")}
                className="w-full flex items-center justify-between px-3 py-2 bg-surface-2 border-b border-border"
              >
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Sortie</span>
                </div>
                {expandedSections.includes("output") ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.includes("output") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-3">
                      {selectedGeneration ? (
                        <>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(selectedGeneration.status)}
                            <span className="text-xs text-muted-foreground">
                              {selectedGeneration.status === "completed" && "Terminé"}
                              {selectedGeneration.status === "pending" && "En cours..."}
                              {selectedGeneration.status === "failed" && "Échoué"}
                            </span>
                          </div>
                          
                          {selectedGeneration.result && (
                            <div className="p-3 rounded-md bg-muted/30 border border-border">
                              {selectedGeneration.type === "image" ? (
                                <img
                                  src={selectedGeneration.result}
                                  alt="Résultat image"
                                  className="w-full h-auto max-h-64 rounded-md object-contain"
                                />
                              ) : selectedGeneration.type === "video" ? (
                                <video
                                  controls
                                  src={selectedGeneration.result}
                                  className="w-full max-h-64 rounded-md bg-black"
                                />
                              ) : (
                                <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                                  {selectedGeneration.result}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {selectedGeneration.credits} crédit(s) utilisé(s)
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
                              <Copy className="size-3 mr-1" />
                              Copier
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
                              <Download className="size-3 mr-1" />
                              Exporter
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-6">
                          <div className="inline-flex items-center justify-center size-10 rounded-full bg-muted mb-2">
                            <Sparkles className="size-5 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Aucune génération sélectionnée
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Sélectionnez une génération dans l'historique
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recent Generations - with delete on hover */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-surface-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Historique</span>
                </div>
                <div className="flex items-center gap-1">
                  {generations.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleClearAllHistory}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Supprimer tout l'historique</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <button
                    onClick={() => toggleSection("history")}
                    className="p-1 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    {expandedSections.includes("history") ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedSections.includes("history") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                      {generations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <Clock className="size-6 text-muted-foreground/50 mb-2" />
                          <p className="text-xs text-muted-foreground">Aucun historique</p>
                        </div>
                      ) : (
                        generations.slice(0, 10).map((gen) => {
                          const TypeIcon = getToolIcon(gen.type);
                          return (
                            <div
                              key={gen.id}
                              className={cn(
                                "group relative flex items-center gap-2 p-2 rounded-md transition-colors text-left",
                                selectedGeneration?.id === gen.id
                                  ? "bg-accent/10 border border-accent/20"
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => setSelectedGeneration(gen)}
                            >
                              <div className={cn(
                                "p-1 rounded",
                                gen.status === "completed" ? "bg-emerald-500/10" :
                                gen.status === "pending" ? "bg-yellow-500/10" : "bg-red-500/10"
                              )}>
                                {getStatusIcon(gen.status)}
                              </div>
                              <div className="p-1 rounded bg-white/5">
                                <TypeIcon className="size-3 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground truncate">
                                  {gen.prompt.slice(0, 25)}...
                                </p>
                              </div>
                              
                              {/* Delete button - appears on hover */}
                              <button
                                className="absolute right-1 opacity-0 group-hover:opacity-100 group-hover:animate-in p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                                onClick={(e) => handleDeleteGeneration(gen.id, e)}
                                aria-label="Supprimer la génération"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t border-border p-4 space-y-2">
          <Button className="w-full" size="sm">
            <Sparkles className="size-4 mr-2" />
            Régénérer
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" size="sm">
              <Copy className="size-4 mr-2" />
              Copier
            </Button>
            <Button variant="outline" className="flex-1" size="sm">
              <Download className="size-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}