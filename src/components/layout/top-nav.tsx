"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ImageIcon,
  Video,
  Code,
  MessageSquare,
  ChevronDown,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  Coins,
  Download,
  Save,
  Undo,
  Redo,
  X,
  Sparkles,
  LayoutDashboard,
  PenTool,
  BarChart3,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  Flame,
  Shield,
  Music,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";

// Plan configuration with colors and icons
const PLAN_CONFIG = {
  free: {
    label: "Gratuit",
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-500/20",
    textColor: "text-slate-400",
    borderColor: "border-slate-500/30",
    icon: Zap,
    gradient: "from-slate-500/20 via-slate-500/10 to-transparent",
  },
  pro: {
    label: "Pro",
    color: "from-amber-500 via-orange-500 to-amber-500",
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    icon: Crown,
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  enterprise: {
    label: "Enterprise",
    color: "from-violet-500 via-purple-500 to-fuchsia-500",
    bgColor: "bg-violet-500/20",
    textColor: "text-violet-400",
    borderColor: "border-violet-500/30",
    icon: Building2,
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
  },
};


interface TopNavProps {
  onNavigate?: (view: string) => void;
  onOpenAuth?: (tab: "login" | "signup") => void;
  onOpenProperties?: () => void;
  onOpenMobileSidebar?: () => void;
}

export function TopNav({ onNavigate, onOpenAuth, onOpenProperties, onOpenMobileSidebar }: TopNavProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const {
    user,
    logout,
    isAuthenticated,
    currentView,
    setCurrentView,
    editorTab,
    setEditorTab,
    generations,
    clearGenerations,
    setGenerations,
    conversations,
    setConversations,
  } = useAppStore();
  const [hoveredTool, setHoveredTool] = React.useState<string | null>(null);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  const currentPlan = user?.plan || "free";
  const planConfig = PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG];
  const PlanIcon = planConfig.icon;

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
      if (data.editorTab) {
        setEditorTab(data.editorTab);
      }
      if (data.currentView) {
        setCurrentView(data.currentView);
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


  const handleToolClick = (action: string) => {
    const shouldOpenProperties = ["editor", "musique", "image", "video", "code"].includes(action);

    if (action === "chat") {
      setCurrentView("chat");
    } else if (action === "dashboard") {
      setCurrentView("dashboard");
    } else if (action === "editor") {
      setCurrentView("editor");
    } else if (action === "usage") {
      setCurrentView("usage");
    } else {
      setEditorTab(action as "text" | "image" | "video" | "code");
      setCurrentView("editor");
    }

    if (shouldOpenProperties) {
      onOpenProperties?.();
    }
  };

  const handleLogout = () => {
    logout();
    if (onOpenAuth) onOpenAuth("login");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Tool configuration for hover cards
  const toolConfig = [
    { id: "musique", icon: Music, label: "Musique", description: "Génération musicale", color: "blue" },
    { id: "image", icon: ImageIcon, label: "Image", description: "Création visuelle", color: "purple" },
    { id: "video", icon: Video, label: "Vidéo", description: "Production vidéo", color: "orange" },
    { id: "code", icon: Code, label: "Code", description: "Génération de code", color: "green" },
  ];

  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-pink-500",
    orange: "from-orange-500 to-amber-500",
    green: "from-emerald-500 to-teal-500",
  };

  const colorBgMap: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
    orange: "bg-orange-500/10 border-orange-500/20",
    green: "bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <TooltipProvider>
      <header className="relative h-14 shrink-0 z-50">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-cyan-500/10 backdrop-blur-xl" />
        <div className="absolute inset-0 border-b border-white/10" />
        
        <div className="relative h-full flex items-center justify-between px-4">
          {/* Left Section - Logo & Menus */}
          <div className="flex items-center gap-3">
            {/* Logo with glow effect */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 blur-lg opacity-30 rounded-full" />
              <div className="relative">
                <Logo markSize={30} textClassName="text-sm font-bold" onClick={() => setCurrentView("dashboard")} />
              </div>
            </motion.div>

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
          </div>

          {/* Center Section - Quick Actions with Hover Cards (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <Separator orientation="vertical" className="h-6 bg-white/10" />
            
            <div className="flex items-center gap-1">
              {toolConfig.map((tool) => {
                const Icon = tool.icon;
                const isActive = currentView === "editor" && editorTab === tool.id;
                return (
                  <div 
                    key={tool.id}
                    className="relative"
                    onMouseEnter={() => setHoveredTool(tool.id)}
                    onMouseLeave={() => setHoveredTool(null)}
                  >
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToolClick(tool.id)}
                      className={`relative p-2 rounded-xl transition-all duration-300 ${
                        isActive 
                          ? `bg-gradient-to-br ${colorMap[tool.color]} text-white shadow-lg` 
                          : "text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      <Icon className="size-4" />
                      {isActive && (
                        <motion.div
                          layoutId="activeToolIndicator"
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white`}
                        />
                      )}
                    </motion.button>

                    {/* Hover Card */}
                    <AnimatePresence>
                      {hoveredTool === tool.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 8, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50"
                        >
                          <div className={`relative px-4 py-3 rounded-xl backdrop-blur-xl border shadow-2xl min-w-[180px] ${colorBgMap[tool.color]}`}>
                            {/* Gradient accent line */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full bg-gradient-to-r ${colorMap[tool.color]}`} />
                            
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-gradient-to-br ${colorMap[tool.color]}`}>
                                <Icon className="size-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{tool.label}</p>
                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                              </div>
                            </div>
                            
                            {/* Arrow pointer */}
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-inherit border-l border-t border-white/20" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <Separator orientation="vertical" className="h-6 bg-white/10" />

            {/* Enhanced Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
              <Input
                placeholder="Rechercher..."
                className="w-40 group-focus-within:w-56 transition-all duration-300 pl-9 pr-3 py-1.5 h-8 text-sm bg-white/5 border-white/10 rounded-xl focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          {/* Right Section - User & Actions */}
          <div className="flex items-center gap-3">
            {/* Credits Display - Enhanced with colored badge */}
            {isAuthenticated && user && user.role !== "admin" && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg blur opacity-30" />
                <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 border border-emerald-500/30 backdrop-blur-md">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Coins className="size-4 text-emerald-400" />
                  </motion.div>
                  <span className="text-xs font-bold text-emerald-300 tabular-nums">{user.credits}</span>
                  <span className="text-[10px] text-emerald-400/70">crédits</span>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                </div>
              </motion.div>
            )}

            {/* Admin & Plan Badges */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-2">
                {/* Admin Badge */}
                {user.role === "admin" && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="hidden sm:flex relative"
                  >
                    <div className="relative px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500/20 via-purple-500/10 to-violet-500/20 border border-violet-500/30 backdrop-blur-md overflow-hidden">
                      <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      />
                      <div className="relative flex items-center gap-2">
                        <Shield className="size-3.5 text-violet-400" />
                        <span className="text-xs font-bold text-violet-300">Admin</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Plan Badge - Hidden for admin */}
                {user.role !== "admin" && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative hidden sm:flex"
                  >
                    <div className={`relative px-3 py-1.5 rounded-xl bg-gradient-to-r ${planConfig.gradient} border ${planConfig.borderColor} backdrop-blur-md overflow-hidden`}>
                      {/* Animated shimmer */}
                      <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      />
                      
                      <div className="relative flex items-center gap-2">
                        <PlanIcon className={`size-3.5 ${planConfig.textColor}`} />
                        <span className={`text-xs font-bold ${planConfig.textColor}`}>
                          {planConfig.label}
                        </span>
                        {currentPlan !== "free" && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gradient-to-r ${planConfig.color}`}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Theme Toggle - Enhanced */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-xl text-muted-foreground hover:bg-white/10 hover:text-violet-400 transition-all duration-200"
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </motion.button>

            {/* Notifications */}
            <div className="relative">
              <NotificationDropdown />
            </div>

            {/* User Menu - Enhanced */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button 
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/10 transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="relative">
                      <Avatar className="size-8 ring-2 ring-white/10">
                        {user.avatar && (
                          <AvatarImage src={user.avatar} alt={user.name ?? ""} />
                        )}
                        <AvatarFallback className={`bg-gradient-to-br ${planConfig.color} text-white text-xs font-bold`}>
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator */}
                      <motion.div
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background"
                      />
                    </div>
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-xl bg-card/95 backdrop-blur-xl border-white/20 shadow-2xl shadow-violet-500/10 p-2">
                  {/* User Info Card */}
                  <div className="mb-2 p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        {user.avatar && <AvatarImage src={user.avatar} alt={user.name ?? ""} />}
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-bold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-foreground truncate">{user.name || "Utilisateur"}</p>
                          {user.role === "admin" && (
                            <Badge variant="secondary" className="bg-violet-500/20 text-violet-300 text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator className="bg-white/10 my-2" />
                  
                  <DropdownMenuItem onClick={() => setCurrentView("profile")} className="py-2.5 px-3 rounded-lg hover:bg-white/10 cursor-pointer">
                    <User className="size-4 mr-2 text-muted-foreground" />
                    <span>Profil</span>
                    <ArrowRight className="size-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentView("settings")} className="py-2.5 px-3 rounded-lg hover:bg-white/10 cursor-pointer">
                    <Settings className="size-4 mr-2 text-muted-foreground" />
                    <span>Paramètres</span>
                    <ArrowRight className="size-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentView("usage")} className="py-2.5 px-3 rounded-lg hover:bg-white/10 cursor-pointer">
                    <BarChart3 className="size-4 mr-2 text-muted-foreground" />
                    <span>Statistiques</span>
                    <ArrowRight className="size-3 ml-auto text-muted-foreground" />
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => setCurrentView("admin")} className="py-2.5 px-3 rounded-lg hover:bg-white/10 cursor-pointer">
                      <Shield className="size-4 mr-2 text-muted-foreground" />
                      <span>Admin</span>
                      <ArrowRight className="size-3 ml-auto text-muted-foreground" />
                    </DropdownMenuItem>
                  )}
                  
                  {currentPlan === "free" && user.role !== "admin" && (
                    <>
                      <DropdownMenuSeparator className="bg-white/10 my-2" />
                      <DropdownMenuItem 
                        onClick={() => setCurrentView("pricing")}
                        className="py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 cursor-pointer"
                      >
                        <Flame className="size-4 mr-2 text-amber-400" />
                        <span className="text-amber-400 font-medium">Passer Pro</span>
                        <ArrowRight className="size-3 ml-auto text-amber-400" />
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator className="bg-white/10 my-2" />
                  <DropdownMenuItem
                    className="py-2.5 px-3 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4 mr-2" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  className="h-8 px-4 text-sm rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white shadow-lg shadow-violet-500/25"
                  onClick={() => onOpenAuth?.("login")}
                >
                  Connexion
                </Button>
              </motion.div>
            )}

          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}