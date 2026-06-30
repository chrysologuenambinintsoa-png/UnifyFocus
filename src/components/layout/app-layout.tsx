"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  PenTool,
  User,
  Settings,
  Sparkles,
  BarChart3,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  Moon,
  Sun,
  Coins,
  Menu,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { TopNav } from "./top-nav";
import { ToolsPanel } from "./tools-panel";
import { PropertiesPanel } from "./properties-panel";
import { StatusBar } from "./status-bar";
import { Toaster } from "@/components/ui/toaster";

interface AppLayoutProps<T = {}> {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const {
    currentView,
    setCurrentView,
    user,
    logout,
    openAuthModal,
    generations,
    settings,
    updateSettings,
  } = useAppStore();
  const { theme: currentTheme, setTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePropertiesOpen, setMobilePropertiesOpen] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  const handleLogout = () => {
    logout();
    openAuthModal("login");
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    updateSettings({ theme: newTheme as "light" | "dark" });
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view as any);
    setMobileOpen(false);
  };

  const toggleMobileProperties = () => {
    setMobilePropertiesOpen((prev) => !prev);
  };

  const openPropertiesPanel = () => {
    setShowPropertiesPanel(true);
    setMobilePropertiesOpen(true);
  };

  const navItems = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "editor", label: "Éditeur IA", icon: PenTool },
    { id: "chat", label: "Chat IA", icon: MessageSquare },
    { id: "usage", label: "Usage", icon: BarChart3 },
    { id: "profile", label: "Profil", icon: User },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Top Navigation Bar */}
        <TopNav
          onNavigate={handleNavigate}
          onOpenAuth={openAuthModal}
          onOpenProperties={openPropertiesPanel}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Sidebar - Tools Panel */}
          <motion.aside
            initial={false}
            animate={{
              width: collapsed ? 56 : 256,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden md:flex h-full min-h-0 border-r border-border bg-surface-2/95 shadow-sm backdrop-blur-sm shrink-0 relative z-20"
          >
            <ToolsPanel collapsed={collapsed} />

            {/* Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground shadow-md"
            >
              {collapsed ? (
                <ChevronRight className="size-3" />
              ) : (
                <ChevronLeft className="size-3" />
              )}
            </button>
          </motion.aside>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setMobileOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Mobile Sidebar */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed inset-y-0 left-0 top-14 z-50 md:hidden w-full max-w-[280px]"
              >
                <ToolsPanel collapsed={false} isMobile={true} />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Center Content */}
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-auto">
            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-auto">
              {children}
            </div>

            {/* Status Bar */}
            <StatusBar />
          </main>

          {/* Toasts */}
          <Toaster />

          {/* Right Sidebar - Properties Panel */}
          {showPropertiesPanel ? (
            <motion.aside
              initial={{ width: 320 }}
              animate={{ width: 320 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden md:flex h-full min-h-0 border-l border-border bg-surface-1 shrink-0 overflow-hidden relative"
            >
              <button
                onClick={() => setShowPropertiesPanel(false)}
                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-muted/80"
                aria-label="Fermer la barre latérale"
              >
                <ChevronRight className="size-4" />
              </button>
              <PropertiesPanel
                isOpen={showPropertiesPanel}
                onClose={() => setShowPropertiesPanel(false)}
              />
            </motion.aside>
          ) : (
            <button
              onClick={() => setShowPropertiesPanel(true)}
              className="hidden md:flex absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-30 h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-muted/80"
              aria-label="Ouvrir la barre latérale"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}

          {/* Mobile Right Sidebar Open Button */}
          {!mobilePropertiesOpen && (
            <button
              onClick={() => setMobilePropertiesOpen(true)}
              className="md:hidden fixed right-3 top-16 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-muted/80"
              aria-label="Ouvrir la barre latérale des propriétés"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}

          {/* Mobile Right Sidebar - Properties Drawer */}
          <AnimatePresence>
            {mobilePropertiesOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/50 md:hidden"
                  onClick={() => setMobilePropertiesOpen(false)}
                />
                <motion.aside
                  initial={{ x: 320 }}
                  animate={{ x: 0 }}
                  exit={{ x: 320 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="fixed inset-y-0 right-0 top-12 z-50 w-full max-w-xs border-l border-border bg-surface-1 md:hidden shadow-xl"
                >
                  <PropertiesPanel
                    isOpen={mobilePropertiesOpen}
                    onClose={() => setMobilePropertiesOpen(false)}
                  />
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}