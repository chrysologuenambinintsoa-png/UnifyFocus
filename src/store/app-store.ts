import { create } from "zustand";

export type AppView =
  | "landing"
  | "dashboard"
  | "editor"
  | "editor-dalle3"
  | "chat"
  | "profile"
  | "settings"
  | "usage"
  | "pricing"
  | "admin"
  | "help";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
  credits: number;
  plan: "free" | "pro" | "enterprise";
  role: "user" | "admin";
  isBlocked?: boolean;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: "light" | "dark" | "system";
  language: "fr" | "en" | "es" | "de";
  notifications: boolean;
  emailAlerts: boolean;
  autoSave: boolean;
  updatedAt: string;
}

export interface Generation {
  id: string;
  type: "text" | "image" | "video" | "audio" | "code";
  prompt: string;
  result: string | null;
  status: "pending" | "completed" | "failed";
  credits: number;
  createdAt: string;
}

export interface EditorOptions {
  textStyle: string;
  textLength: string;
  textTone: string;
  imageStyle: string;
  imageFormat: string;
  imageQuality: string;
  videoDuration: string;
  videoStyle: string;
  videoFormat: string;
  codeLanguage: string;
  codeFramework: string;
  codeComplexity: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  createdAt: string;
}

export type ConversationType = "text" | "image" | "video" | "chat";

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  type: ConversationType;
  createdAt: string;
  updatedAt: string;
  messages?: ConversationMessage[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
};

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "OpenRouter",
    description: "Modèle haute performance d'OpenAI",
    maxTokens: 8192,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenRouter",
    description: "Modèle rapide et efficace",
    maxTokens: 4096,
  },
];

interface AppState {
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Initial load
  initialLoadComplete: boolean;
  finishInitialLoad: () => void;

  // Auth
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (user: User | null) => void;
  logout: () => void;

  // Auth modal
  authModalOpen: boolean;
  authModalTab: "login" | "signup";
  openAuthModal: (tab?: "login" | "signup") => void;
  closeAuthModal: () => void;

  // Generations
  generations: Generation[];
  setGenerations: (gens: Generation[]) => void;
  addGeneration: (gen: Generation) => void;
  clearGenerations: () => void;

  // Editor
  editorTab: "text" | "image" | "video" | "code";
  setEditorTab: (tab: "text" | "image" | "video" | "code") => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  editorOptions: EditorOptions;
  setEditorOptions: (options: Partial<EditorOptions>) => void;
  // Selected subtool/subtab (synchronise sidebar <-> editor)
  selectedSubtool: string;
  setSelectedSubtool: (subtool: string) => void;

  // Mobile menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;

  // Settings
  settings: UserSettings | null;
  setSettings: (settings: UserSettings | null) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;

  // Conversations
  conversations: Conversation[];
  currentConversation: Conversation | null;
  selectedModel: string;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setSelectedModel: (modelId: string) => void;

  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  setUnreadNotificationCount: (count: number) => void;
  fetchNotifications: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: "landing",
  setCurrentView: (view) => set({ currentView: view }),

  // Initial load
  initialLoadComplete: false,
  finishInitialLoad: () => set({ initialLoadComplete: true }),

  // Auth
  isAuthenticated: false,
  user: null,
  setAuth: (user) =>
    set((s) => ({
      isAuthenticated: !!user,
      user,
      // Only change view if this is a first login (no previous user)
      currentView: user && !s.user ? "dashboard" : s.currentView,
    })),
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors
    }
    set({
      isAuthenticated: false,
      user: null,
      generations: [],
      currentView: "landing",
    });
  },

  // Auth modal
  authModalOpen: false,
  authModalTab: "login",
  openAuthModal: (tab = "login") =>
    set({ authModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ authModalOpen: false }),

  // Generations
  generations: [],
  setGenerations: (gens) => set({ generations: gens }),
  addGeneration: (gen) =>
    set((s) => ({ generations: [gen, ...s.generations] })),
  clearGenerations: () => set({ generations: [] }),

  // Editor
  editorTab: "text",
  setEditorTab: (tab) => set({ editorTab: tab }),
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
  editorOptions: {
    textStyle: "professionnel",
    textLength: "moyen",
    textTone: "informatif",
    imageStyle: "photorealiste",
    imageFormat: "1:1",
    imageQuality: "standard",
    videoDuration: "5s",
    videoStyle: "cinematique",
    videoFormat: "16:9",
    codeLanguage: "javascript",
    codeFramework: "aucun",
    codeComplexity: "intermediaire",
  },
  setEditorOptions: (options) =>
    set((s) => ({ editorOptions: { ...s.editorOptions, ...options } })),

  // Selected subtool/subtab (synchronise sidebar <-> editor)
  selectedSubtool: "text-generation",
  setSelectedSubtool: (subtool) => set({ selectedSubtool: subtool }),

  // Mobile menu
  mobileMenuOpen: false,
  setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),

  // Settings
  settings: null,
  setSettings: (settings) => set({ settings }),
  updateSettings: (settings) =>
    set((s) => ({
      settings: s.settings ? { ...s.settings, ...settings } : null,
    })),

  // Conversations
  conversations: [],
  currentConversation: null,
  selectedModel: "gpt-4",
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((s) => ({ conversations: [conversation, ...s.conversations] })),
  updateConversation: (id, data) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
      currentConversation:
        s.currentConversation?.id === id
          ? { ...s.currentConversation, ...data }
          : s.currentConversation,
    })),
  deleteConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      currentConversation:
        s.currentConversation?.id === id ? null : s.currentConversation,
    })),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  setSelectedModel: (modelId) => set({ selectedModel: modelId }),

  // Notifications
  notifications: [],
  unreadNotificationCount: 0,
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadNotificationCount: notification.read ? s.unreadNotificationCount : s.unreadNotificationCount + 1,
    })),
  markNotificationAsRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadNotificationCount: Math.max(0, s.unreadNotificationCount - 1),
    })),
  markAllNotificationsAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadNotificationCount: 0,
    })),
  deleteNotification: (id) =>
    set((s) => {
      const notification = s.notifications.find((n) => n.id === id);
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadNotificationCount: notification && !notification.read
          ? Math.max(0, s.unreadNotificationCount - 1)
          : s.unreadNotificationCount,
      };
    }),
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),
  fetchNotifications: async () => {
    const state = useAppStore.getState();
    if (!state.user) return;

    try {
      const response = await fetch(`/api/notifications?userId=${state.user.id}`);
      if (response.ok) {
        const data = await response.json();
        set({
          notifications: data.notifications,
          unreadNotificationCount: data.unreadCount,
        });
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  },
}));
