"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ImageIcon,
  Video,
  Code,
  MessageSquare,
  Type,
  Wand2,
  Camera,
  Film,
  Braces,
  Terminal,
  FileCode,
  ChevronDown,
  ChevronRight,
  Coins,
  Clock,
  Check,
  X,
  Loader2,
  Sparkles,
  Trash2,
  Download,
  Copy,
  Zap,
  TrendingUp,
  Star,
  Clock3,
  Save,
  FolderOpen,
  FolderPlus,
  LogOut,
  Undo,
  Redo,
  Settings,
  LayoutDashboard,
  PenTool,
  BarChart3,
} from "lucide-react";
import { useAppStore, type Generation } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Menu sections for Fichier, Édition, Affichage (moved from navbar)
const menuSections = [
  {
    id: "file",
    label: "Fichier",
    icon: FileText,
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-400/30",
    items: [
      { label: "Nouveau projet", icon: FolderPlus, action: "new-project", shortcut: "Ctrl+N" },
      { label: "Ouvrir", icon: FolderOpen, action: "open", shortcut: "Ctrl+O" },
      { label: "Enregistrer", icon: Save, action: "save", shortcut: "Ctrl+S" },
      { label: "Exporter", icon: Download, action: "export", shortcut: "Ctrl+E" },
      { type: "separator" as const },
      { label: "Quitter", icon: LogOut, action: "quit" },
    ],
  },
  {
    id: "edit",
    label: "Édition",
    icon: FileCode,
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-400/30",
    items: [
      { label: "Annuler", icon: Undo, action: "undo", shortcut: "Ctrl+Z" },
      { label: "Rétablir", icon: Redo, action: "redo", shortcut: "Ctrl+Y" },
      { type: "separator" as const },
      { label: "Paramètres", icon: Settings, action: "settings", shortcut: "Ctrl+," },
    ],
  },
  {
    id: "view",
    label: "Affichage",
    icon: LayoutDashboard,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-400/30",
    items: [
      { label: "Tableau de bord", icon: LayoutDashboard, action: "dashboard" },
      { label: "Éditeur", icon: PenTool, action: "editor" },
      { label: "Statistiques", icon: BarChart3, action: "usage" },
    ],
  },
];

// Tool categories configuration with enhanced vibrant colors
const toolCategories = [
  {
    id: "text",
    label: "Texte",
    icon: FileText,
    color: "text-blue-400",
    gradientFrom: "from-blue-500",
    gradientTo: "to-cyan-400",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-400/30",
    glowColor: "shadow-blue-500/20",
    badge: "POPULAIRE",
    badgeColor: "bg-blue-500",
    subtools: [
      { id: "text-generation", label: "Génération", icon: Type, credits: 1, description: "Créez du contenu texte avec l'IA", badge: "RAPIDE" },
    ],
  },
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    color: "text-purple-400",
    gradientFrom: "from-purple-500",
    gradientTo: "to-pink-400",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-400/30",
    glowColor: "shadow-purple-500/20",
    badge: "CRÉATIF",
    badgeColor: "bg-purple-500",
    subtools: [
      { id: "text-to-image", label: "Texte → Image", icon: Wand2, credits: 3, description: "Transformez vos idées en images", badge: "TOP" },
      { id: "image-to-image", label: "Image → Image", icon: Camera, credits: 3, description: "Modifiez et transformez des images" },
      { id: "image-to-text", label: "Image → Texte", icon: Type, credits: 2, description: "Extrayez du texte d'images" },
    ],
  },
  {
    id: "video",
    label: "Vidéo",
    icon: Video,
    color: "text-orange-400",
    gradientFrom: "from-orange-500",
    gradientTo: "to-red-400",
    bgColor: "bg-orange-500/15",
    borderColor: "border-orange-400/30",
    glowColor: "shadow-orange-500/20",
    badge: "PRO",
    badgeColor: "bg-orange-500",
    subtools: [
      { id: "text-to-video", label: "Texte → Vidéo", icon: Film, credits: 5, description: "Générez des vidéos depuis du texte", badge: "NOUVEAU" },
      { id: "video-to-video", label: "Vidéo → Vidéo", icon: Video, credits: 5, description: "Transformez vos vidéos" },
      { id: "video-to-text", label: "Vidéo → Texte", icon: FileText, credits: 4, description: "Transcrivez vos vidéos" },
    ],
  },
  {
    id: "code",
    label: "Code",
    icon: Code,
    color: "text-emerald-400",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-teal-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-400/30",
    glowColor: "shadow-emerald-500/20",
    badge: "DEV",
    badgeColor: "bg-emerald-500",
    subtools: [
      { id: "code-generation", label: "Génération", icon: Code, credits: 2, description: "Générez du code automatiquement" },
      { id: "code-refactor", label: "Refactoring", icon: Braces, credits: 2, description: "Optimisez votre code" },
      { id: "code-explain", label: "Explication", icon: FileCode, credits: 1, description: "Comprenez n'importe quel code", badge: "UTILE" },
      { id: "code-debug", label: "Debug", icon: Terminal, credits: 2, description: "Trouvez et corrigez les bugs" },
    ],
  },
  {
    id: "chat",
    label: "Chat IA",
    icon: MessageSquare,
    color: "text-violet-400",
    gradientFrom: "from-violet-500",
    gradientTo: "to-fuchsia-400",
    bgColor: "bg-violet-500/15",
    borderColor: "border-violet-400/30",
    glowColor: "shadow-violet-500/20",
    badge: "IA",
    badgeColor: "bg-violet-500",
    subtools: [
      { id: "chat", label: "Discussion", icon: MessageSquare, credits: 1, description: "Discutez avec notre IA avancée", badge: "GRATUIT" },
    ],
  },
];

interface ToolsPanelProps {
  collapsed?: boolean;
  isMobile?: boolean;
  onToolSelect?: (categoryId: string, subtoolId: string) => void;
}

export function ToolsPanel({ collapsed = false, isMobile = false, onToolSelect }: ToolsPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    user,
    generations,
    currentView,
    setCurrentView,
    setEditorTab,
    editorTab,
    selectedSubtool,
    setSelectedSubtool,
    clearGenerations,
    setGenerations,
    setConversations,
    conversations,
  } = useAppStore();
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>(["text"]);
  const [expandedMenuSections, setExpandedMenuSections] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubtoolClick = (categoryId: string, subtoolId: string) => {
    setSelectedSubtool(subtoolId);
    
    if (subtoolId === "chat") {
      setCurrentView("chat");
    } else {
      const typeMap: Record<string, "text" | "image" | "video" | "code"> = {
        text: "text",
        image: "image",
        video: "video",
        code: "code",
        chat: "text",
      };
      setEditorTab(typeMap[categoryId] || "text");
      setCurrentView("editor");
    }
    
    onToolSelect?.(categoryId, subtoolId);
  };

  const toggleMenuSection = (sectionId: string) => {
    setExpandedMenuSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const downloadFile = (content: string, filename: string, mime = "application/json") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getProjectData = () => ({
    currentView,
    editorTab,
    generations,
    conversations,
    timestamp: new Date().toISOString(),
  });

  const handleOpenFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.generations)) {
        setGenerations(data.generations);
      }
      if (Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
      toast({
        title: "Projet chargé",
        description: `Fichier ${file.name} importé avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur d'importation",
        description: "Impossible de charger ce fichier.",
        variant: "destructive",
      });
    }
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case "new-project":
        clearGenerations();
        setCurrentView("editor");
        setEditorTab("text");
        toast({ title: "Nouveau projet", description: "Un nouveau projet a été créé." });
        break;
      case "open":
        fileInputRef.current?.click();
        break;
      case "save": {
        const projectData = getProjectData();
        downloadFile(JSON.stringify(projectData, null, 2), "unifyfocus-project.json");
        toast({ title: "Enregistré", description: "Le projet a été sauvegardé localement." });
        break;
      }
      case "export": {
        const exportData = {
          generations,
          conversations,
          exportedAt: new Date().toISOString(),
        };
        downloadFile(JSON.stringify(exportData, null, 2), "unifyfocus-export.json");
        toast({ title: "Exporté", description: "Les données ont été exportées." });
        break;
      }
      case "quit":
        // Logout handled by app-layout
        break;
      case "undo":
        if (document.execCommand) {
          document.execCommand("undo");
          toast({ title: "Annulé", description: "La dernière action a été annulée." });
        }
        break;
      case "redo":
        if (document.execCommand) {
          document.execCommand("redo");
          toast({ title: "Rétabli", description: "La dernière action a été rétablie." });
        }
        break;
      case "settings":
        setCurrentView("settings");
        break;
      case "dashboard":
        setCurrentView("dashboard");
        break;
      case "editor":
        setCurrentView("editor");
        break;
      case "usage":
        setCurrentView("usage");
        break;
    }
  };

  const getStatusConfig = (status: Generation["status"]) => {
    switch (status) {
      case "completed":
        return { icon: Check, color: "text-emerald-500", bgColor: "bg-emerald-500/10" };
      case "pending":
        return { icon: Loader2, color: "text-yellow-500", bgColor: "bg-yellow-500/10", animate: true };
      case "failed":
        return { icon: X, color: "text-red-500", bgColor: "bg-red-500/10" };
    }
  };

  const getTypeIcon = (type: Generation["type"]) => {
    switch (type) {
      case "text": return FileText;
      case "image": return ImageIcon;
      case "video": return Video;
      default: return FileText;
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffHr < 24) return `il y a ${diffHr} h`;
    return `il y a ${diffDay} j`;
  };

  const recentGenerations = generations.slice(0, 8);

  if (collapsed) {
    return (
      <div className="w-16 border-r border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl flex flex-col items-center py-4 gap-3 h-full overflow-y-auto">
        {toolCategories.map((category) => {
          const Icon = category.icon;
          const isActive = currentView === "editor" && editorTab === category.id;
          return (
            <HoverCard key={category.id} openDelay={100} closeDelay={50}>
              <HoverCardTrigger asChild>
                <button
                  onClick={() => handleSubtoolClick(category.id, category.subtools[0].id)}
                  className={cn(
                    "relative p-3 rounded-2xl transition-all duration-300 group",
                    isActive
                      ? `${category.bgColor} ${category.color} shadow-lg ${category.glowColor}`
                      : "text-muted-foreground hover:bg-white/10"
                  )}
                >
                  {/* Gradient effect on hover */}
                  <div className={cn(
                    "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300",
                    `bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo}`
                  )} />
                  <Icon className={cn("size-5 relative z-10", isActive && "animate-pulse")} />
                  {/* Active indicator */}
                  {isActive && (
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-slate-950",
                      category.badgeColor
                    )} />
                  )}
                </button>
              </HoverCardTrigger>

              {/* Compact Hover Card for collapsed state */}
              <HoverCardContent
                className="w-56 p-0 border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden"
                side="right"
                align="start"
                sideOffset={12}
              >
                {/* Header with gradient */}
                <div className={cn(
                  "relative p-3 overflow-hidden",
                  `bg-gradient-to-r ${category.gradientFrom} ${category.gradientTo}`
                )}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="relative flex items-center gap-2">
                    <Icon className="size-4 text-white" />
                    <span className="text-sm font-semibold text-white">{category.label}</span>
                  </div>
                </div>

                {/* Subtools */}
                <div className="p-1.5">
                  {category.subtools.map((subtool) => {
                    const SubIcon = subtool.icon;
                    const isSubActive = selectedSubtool === subtool.id;
                    return (
                      <button
                        key={subtool.id}
                        onClick={() => handleSubtoolClick(category.id, subtool.id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-lg transition-all duration-200 text-left group/subtool",
                          isSubActive
                            ? `${category.bgColor} border ${category.borderColor}`
                            : "hover:bg-white/5"
                        )}
                      >
                        <SubIcon className={cn(
                          "size-3.5 shrink-0",
                          isSubActive ? category.color : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "flex-1 text-xs font-medium truncate",
                          isSubActive ? category.color : "text-foreground"
                        )}>
                          {subtool.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="size-2.5 text-accent" />
                          <span className="text-[10px] text-muted-foreground">{subtool.credits}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}

        <Separator className="my-2" />

        {/* Credits with hover effect */}
        {user && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="relative p-3 rounded-2xl text-muted-foreground hover:bg-white/10 transition-all duration-300 group">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/0 to-yellow-500/0 group-hover:from-amber-500/10 group-hover:to-yellow-500/10 transition-all duration-300" />
                <Coins className="size-5 text-accent relative z-10" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent
              className="w-40 p-3 border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-xl rounded-xl"
              side="right"
              sideOffset={12}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Coins className="size-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Crédits</p>
                  <p className="text-lg font-bold text-foreground">{user.credits}</p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    );
  }

  // Mobile version with touch-friendly expandable sections
  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="w-full max-w-sm border-r border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl flex flex-col h-full min-h-0 overflow-hidden">
          {/* Header with enhanced mobile styling */}
          <div className="relative mx-3 mt-3 rounded-[2rem] border border-white/10 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-cyan-500/10 p-4 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-cyan-500/5" />
            <div className="relative">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-violet-400" />
                Outils IA
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Créez du contenu avec l'IA
              </p>
            </div>
          </div>

          {/* Credits Display - Enhanced for mobile */}
          {user && (
            <div className="px-3 py-2">
              <div className="relative flex items-center gap-3 rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5" />
                <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-slate-900/80 text-amber-400 shadow-inner">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Coins className="size-5" />
                  </motion.div>
                </div>
                <div className="relative flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Crédits disponibles</p>
                  <p className="text-xl font-bold text-amber-400">{user.credits}</p>
                </div>
                <div className="relative">
                  <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                    {user.plan === 'pro' ? 'PRO' : user.plan === 'enterprise' ? 'ENT' : 'FREE'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <Separator className="bg-white/10" />

          {/* Menu Sections (Fichier, Édition, Affichage) - Mobile accordion style */}
          <div className="px-3 py-2 space-y-2">
            {menuSections.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedMenuSections.includes(section.id);
              return (
                <div key={section.id} className="rounded-2xl overflow-hidden border border-white/5 bg-surface-2/50">
                  <button
                    onClick={() => toggleMenuSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 transition-all duration-300 relative overflow-hidden",
                      isExpanded
                        ? `${section.bgColor} ${section.color}`
                        : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "relative p-2.5 rounded-xl transition-all duration-300 shrink-0",
                      isExpanded ? section.bgColor : "bg-white/5 active:bg-white/10"
                    )}>
                      <SectionIcon className={cn(
                        "size-5",
                        isExpanded ? section.color : "text-muted-foreground"
                      )} />
                    </div>
                    <span className={cn(
                      "flex-1 text-left text-sm font-semibold transition-colors duration-300",
                      isExpanded ? section.color : "text-foreground"
                    )}>
                      {section.label}
                    </span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className={cn(
                        "size-4 transition-colors duration-300",
                        isExpanded ? section.color : "text-muted-foreground"
                      )} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pt-1 space-y-1 border-t border-white/5 mt-1">
                          {section.items.map((item, idx) => {
                            if (item.type === "separator") {
                              return <Separator key={idx} className="my-2 bg-white/5" />;
                            }
                            const ItemIcon = item.icon;
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  handleMenuAction(item.action);
                                  setExpandedMenuSections([]);
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left active:scale-[0.98] text-muted-foreground hover:bg-white/5 hover:text-foreground"
                              >
                                <div className="p-2 rounded-lg bg-white/5">
                                  <ItemIcon className="size-4" />
                                </div>
                                <span className="flex-1 text-sm font-medium">{item.label}</span>
                                {item.shortcut && (
                                  <span className="text-[10px] text-muted-foreground font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                    {item.shortcut}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <Separator className="bg-white/10" />

          {/* Tool Categories - Touch-friendly accordion style */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-3">
              {toolCategories.map((category) => {
                const Icon = category.icon;
                const isActive = currentView === "editor" && editorTab === category.id;
                const isExpanded = expandedCategories.includes(category.id);

                return (
                  <div key={category.id} className="rounded-2xl overflow-hidden border border-white/5 bg-surface-2/50">
                    {/* Category Header - Touch-friendly button */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 transition-all duration-300 relative overflow-hidden",
                        isActive
                          ? `${category.bgColor} ${category.color}`
                          : "text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      {/* Gradient background effect */}
                      <div className={cn(
                        "absolute inset-0 opacity-0 active:opacity-10 transition-opacity duration-200",
                        `bg-gradient-to-r ${category.gradientFrom} ${category.gradientTo}`
                      )} />

                      {/* Icon container with gradient */}
                      <div className={cn(
                        "relative p-2.5 rounded-xl transition-all duration-300 shrink-0",
                        isActive ? category.bgColor : "bg-white/5 active:bg-white/10"
                      )}>
                        <Icon className={cn(
                          "size-5",
                          isActive ? category.color : "text-muted-foreground"
                        )} />
                      </div>

                      {/* Label and info */}
                      <div className="relative flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-semibold transition-colors duration-300",
                            isActive ? category.color : "text-foreground"
                          )}>
                            {category.label}
                          </span>
                          {category.badge && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-white",
                              category.badgeColor
                            )}>
                              {category.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {category.subtools.length} outil{category.subtools.length > 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Expand/Collapse chevron */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                      >
                        <ChevronDown className={cn(
                          "size-4 transition-colors duration-300",
                          isActive ? category.color : "text-muted-foreground"
                        )} />
                      </motion.div>

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId={`mobile-active-${category.id}`}
                          className={cn(
                            "absolute bottom-0 left-4 right-4 h-0.5 rounded-full",
                            category.badgeColor
                          )}
                        />
                      )}
                    </button>

                    {/* Expandable Subtools - Touch-friendly list */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pt-1 space-y-2 border-t border-white/5 mt-1">
                            {category.subtools.map((subtool) => {
                              const SubIcon = subtool.icon;
                              const isSubActive = selectedSubtool === subtool.id;
                              return (
                                <button
                                  key={subtool.id}
                                  onClick={() => handleSubtoolClick(category.id, subtool.id)}
                                  className={cn(
                                    "w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left active:scale-[0.98]",
                                    isSubActive
                                      ? `${category.bgColor} border ${category.borderColor} shadow-md`
                                      : "bg-slate-900/50 border border-transparent hover:bg-slate-900/80 active:bg-slate-800"
                                  )}
                                >
                                  {/* Subtool Icon */}
                                  <div className={cn(
                                    "p-2 rounded-lg shrink-0 transition-all duration-200",
                                    isSubActive ? category.bgColor : "bg-white/5"
                                  )}>
                                    <SubIcon className={cn(
                                      "size-4",
                                      isSubActive ? category.color : "text-muted-foreground"
                                    )} />
                                  </div>

                                  {/* Subtool Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={cn(
                                        "text-sm font-medium",
                                        isSubActive ? category.color : "text-foreground"
                                      )}>
                                        {subtool.label}
                                      </span>
                                      {subtool.badge && (
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-white",
                                          category.badgeColor
                                        )}>
                                          {subtool.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {subtool.description}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className={cn(
                                        "p-1 rounded-md",
                                        isSubActive ? category.bgColor : "bg-white/5"
                                      )}>
                                        <Coins className={cn("size-2.5", isSubActive ? category.color : "text-accent")} />
                                      </div>
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        {subtool.credits} crédit{subtool.credits > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Active checkmark */}
                                  {isSubActive && (
                                    <div className="shrink-0">
                                      <div className={cn(
                                        "size-5 rounded-full flex items-center justify-center",
                                        category.badgeColor
                                      )}>
                                        <Check className="size-3 text-white" />
                                      </div>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

          </ScrollArea>

          {/* Footer - Mobile optimized */}
          <div className="border-t border-white/10 p-3">
            <button
              onClick={() => setCurrentView("help")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-white/5 active:bg-white/10 rounded-2xl transition-all duration-200 active:scale-[0.98]"
            >
              <Sparkles className="size-4" />
              <span className="font-medium">Aide & Documentation</span>
              <ChevronRight className="size-4 ml-auto" />
            </button>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Desktop version (existing code with hover cards)
  return (
    <TooltipProvider>
      <div className="w-64 border-r border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl flex flex-col h-full min-h-0 overflow-hidden">
        {/* Header */}
        <div className="m-4 rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Outils IA</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Créez du contenu avec l'IA
          </p>
        </div>

        {/* Credits Display */}
        {user && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900/80 text-accent shadow-inner">
                <Coins className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Crédits</p>
                <p className="text-sm font-semibold text-foreground">{user.credits}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Menu Sections (Fichier, Édition, Affichage) - Moved from navbar with hover cards */}
        <div className="px-3 py-2 space-y-1">
          {menuSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <HoverCard key={section.id} openDelay={100} closeDelay={50}>
                <HoverCardTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group",
                      "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg transition-all duration-200",
                      "bg-white/5 group-hover:bg-white/10"
                    )}>
                      <SectionIcon className={cn("size-4", "text-muted-foreground group-hover:text-foreground")} />
                    </div>
                    <span className={cn(
                      "flex-1 text-left text-sm font-medium",
                      "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {section.label}
                    </span>
                    <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </HoverCardTrigger>

                {/* Hover Card with Menu Items */}
                <HoverCardContent
                  className="w-64 p-0 border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden"
                  side="right"
                  align="start"
                  sideOffset={8}
                >
                  {/* Card Header with gradient */}
                  <div className={cn(
                    "relative p-3 border-b border-white/5 overflow-hidden",
                    `bg-gradient-to-r ${section.bgColor.replace('/15', '/30')}`
                  )}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="relative flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                        <SectionIcon className={cn("size-4", section.color)} />
                      </div>
                      <span className={cn("text-sm font-semibold", section.color)}>{section.label}</span>
                    </div>
                  </div>

                  {/* Menu Items List */}
                  <div className="p-1.5">
                    {section.items.map((item, idx) => {
                      if (item.type === "separator") {
                        return <Separator key={idx} className="my-1.5 bg-white/5" />;
                      }
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleMenuAction(item.action)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all duration-200 text-left group/item"
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg transition-all duration-200",
                            "bg-white/5 group-hover/item:bg-white/10"
                          )}>
                            <ItemIcon className="size-3.5" />
                          </div>
                          <span className="flex-1">{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[10px] text-muted-foreground font-mono bg-white/5 px-1.5 py-0.5 rounded">
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Card Footer */}
                  <div className="px-3 py-2 border-t border-white/5 bg-white/5">
                    <span className="text-[10px] text-muted-foreground">
                      {section.id === "file" && "Gérez vos projets"}
                      {section.id === "edit" && "Modifiez votre contenu"}
                      {section.id === "view" && "Changez de vue"}
                    </span>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>

        <Separator />

        {/* Tool Categories with Hover Cards */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-2">
            {toolCategories.map((category) => {
              const Icon = category.icon;
              const isActive = currentView === "editor" && editorTab === category.id;

              return (
                <HoverCard key={category.id} openDelay={100} closeDelay={50}>
                  <HoverCardTrigger asChild>
                    <button
                      onClick={() => {
                        toggleCategory(category.id);
                        handleSubtoolClick(category.id, category.subtools[0].id);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
                        isActive
                          ? `${category.bgColor} ${category.color} ${category.borderColor} shadow-lg ${category.glowColor}`
                          : "text-muted-foreground hover:bg-white/5 border-white/5 hover:border-white/10 hover:shadow-md"
                      )}
                    >
                      {/* Gradient background effect on hover */}
                      <div className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300",
                        `bg-gradient-to-r ${category.gradientFrom} ${category.gradientTo}`
                      )} />
                      
                      {/* Icon with gradient */}
                      <div className={cn(
                        "relative p-2 rounded-xl transition-all duration-300",
                        isActive ? category.bgColor : "bg-white/5 group-hover:bg-white/10"
                      )}>
                        <Icon className={cn("size-4", isActive ? category.color : "text-muted-foreground group-hover:text-foreground")} />
                      </div>

                      {/* Label */}
                      <span className={cn(
                        "relative flex-1 text-left text-sm font-medium transition-colors duration-300",
                        isActive ? category.color : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {category.label}
                      </span>

                      {/* Badge */}
                      {category.badge && (
                        <span className={cn(
                          "relative px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm",
                          category.badgeColor
                        )}>
                          {category.badge}
                        </span>
                      )}

                      {/* Active indicator dot */}
                      {isActive && (
                        <div className={cn(
                          "relative size-2 rounded-full animate-pulse",
                          category.badgeColor
                        )} />
                      )}
                    </button>
                  </HoverCardTrigger>

                  {/* Hover Card with Subtools */}
                  <HoverCardContent 
                    className="w-72 p-0 border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden"
                    side="right"
                    align="start"
                    sideOffset={8}
                  >
                    {/* Card Header */}
                    <div className={cn(
                      "relative p-4 border-b border-white/5 overflow-hidden",
                      `bg-gradient-to-r ${category.gradientFrom} ${category.gradientTo}`
                    )}>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="relative flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                          <Icon className="size-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{category.label}</h4>
                          <p className="text-xs text-white/70">
                            {category.subtools.length} outil{category.subtools.length > 1 ? 's' : ''} disponible{category.subtools.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Subtools List */}
                    <div className="p-2">
                      {category.subtools.map((subtool) => {
                        const SubIcon = subtool.icon;
                        const isSubActive = selectedSubtool === subtool.id;
                        return (
                          <button
                            key={subtool.id}
                            onClick={() => handleSubtoolClick(category.id, subtool.id)}
                            className={cn(
                              "w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left group/subtool",
                              isSubActive
                                ? `${category.bgColor} border ${category.borderColor} shadow-md`
                                : "hover:bg-white/5 border border-transparent hover:border-white/5"
                            )}
                          >
                            {/* Subtool Icon */}
                            <div className={cn(
                              "p-2 rounded-lg shrink-0 transition-all duration-200",
                              isSubActive ? category.bgColor : "bg-white/5 group-hover/subtool:bg-white/10"
                            )}>
                              <SubIcon className={cn(
                                "size-4",
                                isSubActive ? category.color : "text-muted-foreground group-hover/subtool:text-foreground"
                              )} />
                            </div>

                            {/* Subtool Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  "text-sm font-medium",
                                  isSubActive ? category.color : "text-foreground"
                                )}>
                                  {subtool.label}
                                </span>
                                {subtool.badge && (
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                    category.badgeColor,
                                    "text-white"
                                  )}>
                                    {subtool.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                {subtool.description}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <Coins className="size-3 text-accent" />
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {subtool.credits} crédit{subtool.credits > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            {/* Active indicator */}
                            {isSubActive && (
                              <div className={cn(
                                "size-2 rounded-full shrink-0 mt-1",
                                category.badgeColor
                              )} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-3 border-t border-white/5 bg-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          Commencez à créer ✨
                        </span>
                        <ChevronRight className="size-3 text-muted-foreground" />
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>

          {/* Hidden file input for opening projects */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleOpenFile(file);
                event.target.value = "";
              }
            }}
          />
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <button
            onClick={() => setCurrentView("help")}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            <Sparkles className="size-4" />
            <span>Aide & Documentation</span>
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}
