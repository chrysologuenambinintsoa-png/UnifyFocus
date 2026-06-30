"use client";
import { Suspense, useEffect, useState } from "react";

import { useAppStore } from "@/store/app-store";
import LandingView from "@/components/views/landing-view";
import { DashboardView } from "@/components/views/dashboard-view";
import AIEditorView from "@/components/editor/ai-editor-view";
import { AiEditorDalle3View } from "@/components/editor/ai-editor-dalle3-view";
import ProfileView from "@/components/views/profile-view";
import PricingView from "@/components/views/pricing-view";
import SettingsView from "@/components/views/settings-view";
import { ChatView } from "@/components/views/chat-view";
import { AuthModal } from "@/components/auth/auth-modal";
import { OAuthCallback } from "@/components/auth/oauth-callback";
import { AnimatePresence, motion } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { SplashScreen } from "@/components/views/splash-screen";
import { Logo } from "@/components/ui/logo";

import { UsageView } from "@/components/views/usage-view";
import HelpView from "@/components/views/help-view";
import AdminView from "@/components/views/admin-view";
export default function Home() {
  const { currentView, isAuthenticated, initialLoadComplete } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!initialLoadComplete) {
      setShowSplash(true);
      return;
    }

    const timer = window.setTimeout(() => setShowSplash(false), 3000);
    return () => window.clearTimeout(timer);
  }, [initialLoadComplete]);

  if (showSplash) {
    return (
      <>
        <SplashScreen />
        <AuthInitializer />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Suspense fallback={<div />}>
          <AnimatePresence mode="wait">
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LandingView />
            </motion.div>
          </AnimatePresence>
        </Suspense>
        <AuthModal />
        <Suspense fallback={<div />}>
          <OAuthCallback />
        </Suspense>
        <AuthInitializer />
      </>
    );
  }

  // If authenticated, show the main app layout and render view based on `currentView`.
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        {currentView === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <DashboardView />
          </motion.div>
        )}

        {currentView === "editor" && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <AIEditorView />
          </motion.div>
        )}

        {currentView === "editor-dalle3" && (
          <motion.div
            key="editor-dalle3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <AiEditorDalle3View />
          </motion.div>
        )}

        {currentView === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <ProfileView />
          </motion.div>
        )}

        {currentView === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <SettingsView />
          </motion.div>
        )}

        {currentView === "usage" && (
          <motion.div
            key="usage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <UsageView />
          </motion.div>
        )}

        {currentView === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <ChatView />
          </motion.div>
        )}

        {currentView === "help" && (
          <motion.div
            key="help"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <HelpView />
          </motion.div>
        )}

        {currentView === "pricing" && (
          <motion.div
            key="pricing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <PricingView />
          </motion.div>
        )}

        {currentView === "admin" && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <AdminView />
          </motion.div>
        )}
      </AnimatePresence>

      <AuthInitializer />
      <AuthModal />
      <Suspense fallback={<div />}>
        <OAuthCallback />
      </Suspense>
    </AppLayout>
  );
}