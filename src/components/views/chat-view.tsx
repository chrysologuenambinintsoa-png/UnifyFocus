"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  Loader2,
  Sparkles,
  User,
  Bot,
  Copy,
  CheckCircle,
  Zap,
  Code,
  Wand2,
  Bug,
  RotateCcw,
  Terminal,
  FileCode,
  Lightbulb,
  PenTool,
  Check,
  X,
  MoreVertical,
  Edit3,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  History,
  Settings2,
  Palette,
  Search,
} from "lucide-react";
import { useAppStore, Conversation, AVAILABLE_MODELS } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { notifyGenerationFailure, notifyConnectionFailure, notifyInsufficientCredits } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

// reusable chat components
import MessageList from "@/components/chat/message-list";
import ChatInput from "@/components/chat/chat-input";
import Logo from "@/components/ui/logo";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: string[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { 
    id: "explain", 
    label: "Expliquer", 
    icon: <Lightbulb className="w-4 h-4" />, 
    prompt: "Explique ce code en détail :",
    color: "from-amber-500 to-orange-600"
  },
  { 
    id: "fix", 
    label: "Corriger", 
    icon: <Bug className="w-4 h-4" />, 
    prompt: "Trouve et corrige les bugs dans :",
    color: "from-red-500 to-pink-600"
  },
  { 
    id: "optimize", 
    label: "Optimiser", 
    icon: <Zap className="w-4 h-4" />, 
    prompt: "Optimise ce code pour de meilleures performances :",
    color: "from-yellow-500 to-amber-600"
  },
  { 
    id: "refactor", 
    label: "Refactoriser", 
    icon: <RotateCcw className="w-4 h-4" />, 
    prompt: "Refactorise ce code pour le rendre plus lisible :",
    color: "from-purple-500 to-indigo-600"
  },
];

const SUGGESTIONS = [
  { icon: <Code className="w-5 h-5" />, text: "Générer une fonction de tri", category: "Code", color: "blue" },
  { icon: <Wand2 className="w-5 h-5" />, text: "Expliquer une erreur", category: "Debug", color: "purple" },
  { icon: <FileCode className="w-5 h-5" />, text: "Créer une API REST", category: "Architecture", color: "indigo" },
  { icon: <Terminal className="w-5 h-5" />, text: "Commande Git utile", category: "DevOps", color: "emerald" },
];

export function ChatView() {
  const {
    user,
    conversations,
    setConversations,
    currentConversation,
    setCurrentConversation,
    selectedModel,
    setSelectedModel,
    addConversation,
    deleteConversation,
  } = useAppStore();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  type AttachedFile = { file: File; uploading?: boolean; url?: string; progress?: number };
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [showConversationPanel, setShowConversationPanel] = useState(true);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const xhrRefsMap = useRef<Map<number, XMLHttpRequest>>(new Map());

  const fetchChatConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(user.id)}&type=chat`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to fetch chat conversations:", error);
    }
  }, [user, setConversations]);

  useEffect(() => {
    if (user) {
      fetchChatConversations();
    }
  }, [user, fetchChatConversations]);

  useEffect(() => {
    if (currentConversation) {
      const loadMessages = async () => {
        try {
          const res = await fetch(`/api/conversations/${currentConversation.id}`);
          const data = await res.json();
          if (res.ok && data.conversation.messages) {
            setMessages(
              data.conversation.messages.map((m: any) => ({
                  id: m.id,
                  role: m.role as "user" | "assistant",
                  content: m.content,
                  createdAt: m.createdAt,
                  attachments: m.attachments ?? undefined,
                }))
            );
          } else {
            setMessages([]);
          }
        } catch (error) {
          console.error("Failed to load messages:", error);
          setMessages([]);
        }
      };
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: `Discussion ${new Date().toLocaleDateString("fr-FR")}`,
          model: selectedModel,
          type: "chat",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addConversation(data.conversation);
        setCurrentConversation(data.conversation);
        setMessages([]);
        setInput("");
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setSelectedModel(conversation.model);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        deleteConversation(id);
        if (currentConversation?.id === id) {
          setCurrentConversation(null);
          setMessages([]);
        }
        toast({
          title: "Discussion supprimée",
          description: "La discussion a été supprimée avec succès.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la discussion.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(
          conversations.map((c) =>
            c.id === id ? { ...c, title: data.conversation.title } : c
          )
        );
        if (currentConversation?.id === id) {
          setCurrentConversation({ ...currentConversation, title: data.conversation.title });
        }
        toast({
          title: "Titre mis à jour",
          description: "Le titre a été mis à jour.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le titre.",
        variant: "destructive",
      });
    } finally {
      setEditingId(null);
      setEditTitle("");
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    
    // Confirmation dialog
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement tout l'historique des discussions ? Cette action ne peut pas être annulée.")) {
      return;
    }

    try {
      // Delete all conversations for the user
      for (const conversation of conversations) {
        await fetch(`/api/conversations/${conversation.id}`, {
          method: "DELETE",
        });
      }

      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
      setInput("");
      setShowHistorySidebar(false);

      toast({
        title: "Historique supprimé",
        description: "Tout l'historique des discussions a été supprimé définitivement.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'historique.",
        variant: "destructive",
      });
      console.error("Failed to clear history:", error);
    }
  };

  const handleCancelUpload = (index: number) => {
    const xhr = xhrRefsMap.current.get(index);
    if (xhr) {
      xhr.abort();
      xhrRefsMap.current.delete(index);
    }
    setAttachedFiles((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false, progress: 0 } : p)));
  };

  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || input.trim();
    if (!messageToSend && attachedFiles.length === 0) return;
    if (!user || isLoading) return;

    setIsLoading(true);
    setActiveQuickAction(null);

    let conversationId = currentConversation?.id;
    if (!conversationId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            title: messageToSend.substring(0, 50),
            model: selectedModel,
            type: "chat",
          }),
        });
        const data = await res.json();
        if (res.ok) {
          addConversation(data.conversation);
          setCurrentConversation(data.conversation);
          conversationId = data.conversation.id;
        }
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    }

    try {
      // If there are attached files, upload them first
      let attachmentUrls: string[] | undefined = undefined;
      if (attachedFiles.length > 0) {
        // mark uploading and reset progress
        setAttachedFiles((prev) => prev.map((p) => ({ ...p, uploading: true, progress: 0 })));

        // upload files individually to track per-file progress
        const uploadPromises = attachedFiles.map((af, index) => {
          return new Promise<string>(async (resolve, reject) => {
            try {
              const xhr = new XMLHttpRequest();
              const formData = new FormData();
              formData.append("files", af.file);
              xhr.open("POST", "/api/uploads");

              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  const pct = Math.round((e.loaded / e.total) * 100);
                  setAttachedFiles((prev) => prev.map((p, i) => (i === index ? { ...p, progress: pct } : p)));
                }
              };

              xhr.onload = () => {
                xhrRefsMap.current.delete(index);
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const j = JSON.parse(xhr.responseText);
                    const url = Array.isArray(j.urls) ? j.urls[0] : undefined;
                    setAttachedFiles((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false, url, progress: 100 } : p)));
                    resolve(url);
                  } catch (err) {
                    setAttachedFiles((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false } : p)));
                    reject(err);
                  }
                } else {
                  setAttachedFiles((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false } : p)));
                  reject(new Error("Upload failed"));
                }
              };

              xhr.onerror = () => {
                xhrRefsMap.current.delete(index);
                setAttachedFiles((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false } : p)));
                reject(new Error("Network error"));
              };

              xhr.onabort = () => {
                xhrRefsMap.current.delete(index);
                setAttachedFiles((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false, progress: 0 } : p)));
                reject(new Error("Upload cancelled"));
              };

              xhrRefsMap.current.set(index, xhr);

              xhr.send(formData);
            } catch (err) {
              setAttachedFiles((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false } : p)));
              reject(err);
            }
          });
        });

        try {
          const urls = await Promise.all(uploadPromises);
          attachmentUrls = urls.filter(Boolean) as string[];
        } catch (err) {
          console.error("One or more uploads failed:", err);
        }
      }

      // Add user message including any uploaded attachment URLs
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: messageToSend,
        createdAt: new Date().toISOString(),
        attachments: attachmentUrls,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          conversationId,
          message: userMessage.content,
          model: selectedModel,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          attachments: attachmentUrls,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || data.message || "Désolé, je n'ai pas pu générer de réponse.",
          createdAt: new Date().toISOString(),
          attachments: data.attachments,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        // clear attached files after successful send
        setAttachedFiles([]);

        if (data.credits !== undefined) {
          const state = useAppStore.getState();
          if (state.user) {
            state.setAuth({ ...state.user, credits: data.credits });
          }
        }
      } else {
        // Handle specific API error codes
        if (res.status === 402) {
          notifyInsufficientCredits();
        } else if ([502, 503, 504].includes(res.status)) {
          notifyConnectionFailure(undefined, data.error || res.statusText);
        } else {
          notifyGenerationFailure(data.error || "Une erreur est survenue lors du chat.");
        }

        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Erreur: ${data.error || "Une erreur est survenue"}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      // network / fetch error
      notifyConnectionFailure(undefined, error instanceof Error ? error.message : String(error));
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Erreur de connexion. Veuillez réessayer.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setActiveQuickAction(action.id);
    setInput(action.prompt);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const getModelName = (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    return model?.name || modelId;
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col h-full bg-slate-950">
        {/* Header */}
        <div className="flex-shrink-0 px-6 sm:px-8 py-5 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Title */}
              <div>
                <h1 className="text-lg font-bold text-slate-100">
                  {currentConversation?.title ?? "Nouvelle Discussion"}
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Assistant IA UnifyFocus
                </p>
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-3 ml-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-300">{messages.length} message{messages.length > 1 ? "s" : ""}</span>
                </div>
                
                <Badge className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border-0 shadow-md">
                  ✨ {getModelName(selectedModel)}
                </Badge>

                {currentConversation && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/20 border border-emerald-700/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-xs text-emerald-400 font-semibold">Actif</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleNewChat} 
                      className="group text-xs font-bold border-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl rounded-xl px-4 py-2.5"
                    >
                      <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                      <span className="hidden sm:inline">Nouveau Chat</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Démarrer une nouvelle discussion</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => setShowHistorySidebar(!showHistorySidebar)} 
                      className="group text-xs font-bold border-2 border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all duration-200 shadow-md hover:shadow-lg rounded-xl px-4 py-2.5"
                    >
                      <History className="w-4 h-4 mr-2 group-hover:-rotate-90 transition-transform duration-300" />
                      <span className="hidden sm:inline">Historique</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Afficher l'historique des discussions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/30 px-6 sm:px-8 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Actions rapides</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleQuickAction(action)}
                className={`group relative overflow-hidden rounded-xl border-2 px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${
                  activeQuickAction === action.id 
                    ? `border-blue-500 bg-gradient-to-r ${action.color} text-white shadow-lg scale-105` 
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-blue-500 hover:bg-slate-800 hover:shadow-md hover:scale-105"
                }`}
              >
                <span className="mr-2 inline-flex items-center justify-center">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto bg-slate-950 p-6 sm:p-8">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="w-full max-w-4xl space-y-8 px-4">
                  {/* Welcome Section */}
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div>
                      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-3">
                        UnifyFocus Chat
                      </h1>
                      <p className="text-slate-400 text-base font-medium max-w-md mx-auto">
                        Votre assistant IA intelligent pour coder, déboguer et optimiser vos projets
                      </p>
                    </div>
                  </div>

                  {/* Suggestions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(suggestion.text)}
                        className="group relative overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-900/50 p-5 text-left transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:scale-[1.02]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-indigo-600/0 group-hover:from-blue-500/5 group-hover:to-indigo-600/5 transition-all"></div>
                        <div className="relative flex items-start gap-4">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-${suggestion.color}-900/30 text-${suggestion.color}-400 group-hover:scale-110 transition-all border border-${suggestion.color}-700/30`}>
                            {suggestion.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                              {suggestion.text}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">{suggestion.category}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Quick Tips */}
                  <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/30 p-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      Conseils
                    </h3>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/30 flex items-center justify-center mt-0.5 border-2 border-blue-700/30">
                          <span className="text-[11px] text-blue-400 font-bold">✓</span>
                        </div>
                        <p className="text-sm text-slate-300 font-medium">
                          Utilisez les boutons rapides pour des actions courantes
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/30 flex items-center justify-center mt-0.5 border-2 border-blue-700/30">
                          <span className="text-[11px] text-blue-400 font-bold">✓</span>
                        </div>
                        <p className="text-sm text-slate-300 font-medium">
                          Joignez des fichiers ou des images pour une analyse plus complète
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/30 flex items-center justify-center mt-0.5 border-2 border-blue-700/30">
                          <span className="text-[11px] text-blue-400 font-bold">✓</span>
                        </div>
                        <p className="text-sm text-slate-300 font-medium">
                          Évaluez les réponses avec les pouces pour améliorer la qualité
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <MessageList messages={messages} />
            )}

            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-800/80 border-2 border-slate-700 p-4 shadow-lg backdrop-blur-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">L'assistant UnifyFocus réfléchit...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <ChatInput
            ref={inputRef}
            input={input}
            setInput={setInput}
            onSend={sendMessage}
            isLoading={isLoading}
            attachedFiles={attachedFiles}
            setAttachedFiles={setAttachedFiles}
            onCancelUpload={handleCancelUpload}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* History Sidebar Modal */}
      <AnimatePresence>
        {showHistorySidebar && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
              onClick={() => setShowHistorySidebar(false)}
            />
            
            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 flex flex-col"
            >
            {/* Header */}
            <div className="px-6 py-5 border-b-2 border-slate-500 flex items-center justify-between shrink-0 bg-slate-800 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/50 border-2 border-blue-400">
                  <History className="w-4 h-4 text-blue-200" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-wide">Historique</h2>
              </div>
              <button
                onClick={() => setShowHistorySidebar(false)}
                aria-label="Fermer l'historique"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 border-2 border-slate-500 text-slate-100 hover:bg-slate-600 hover:text-white hover:border-slate-400 transition-all duration-200"
                title="Fermer l'historique"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all"
                />
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1 min-h-0 history-sidebar-scroll scroll-smooth">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/50 border border-slate-700/50">
                      <MessageSquare className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">Aucune discussion</div>
                    <div className="text-[11px] text-slate-600">Commencez une nouvelle conversation</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {conversations
                    .filter((conv) => {
                      if (!historySearchQuery.trim()) return true;
                      const query = historySearchQuery.toLowerCase();
                      return conv.title.toLowerCase().includes(query);
                    })
                    .map((conv) => (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group"
                    >
                      <div className={`relative w-full p-4 rounded-lg text-left transition-all cursor-pointer border ${
                          currentConversation?.id === conv.id
                            ? "bg-blue-500/10 text-slate-200 border-blue-500/30 shadow-sm"
                            : "bg-slate-800/30 text-slate-400 hover:bg-slate-800/60 border-slate-700/50 hover:border-slate-600"
                        }`}
                      >
                        <button
                          onClick={() => {
                            handleSelectConversation(conv);
                            setShowHistorySidebar(false);
                          }}
                          className="w-full text-left"
                        >
                          <div className="font-semibold text-sm text-slate-200 truncate mb-1.5">
                            {conv.title}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                            <span>{formatDate(conv.createdAt)}</span>
                          </div>
                        </button>
                        
                        {/* Delete button on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conv.id, e);
                          }}
                          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-slate-500 hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {historySearchQuery && conversations.filter((conv) => {
                if (!historySearchQuery.trim()) return true;
                const query = historySearchQuery.toLowerCase();
                return conv.title.toLowerCase().includes(query);
              }).length === 0 && (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Search className="w-12 h-12 text-slate-600" />
                    <div className="text-xs text-slate-500 font-medium">Aucun résultat</div>
                    <div className="text-[11px] text-slate-600">Essayez une autre recherche</div>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Footer Actions */}
            {conversations.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
                <button
                  onClick={handleClearHistory}
                  className="w-full text-xs text-slate-400 hover:text-red-400 transition-colors font-medium py-2.5 px-3 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                >
                  Effacer tout l'historique
                </button>
              </div>
            )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
