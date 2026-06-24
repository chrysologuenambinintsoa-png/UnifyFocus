"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "explain", label: "Expliquer", icon: <Lightbulb className="w-3.5 h-3.5" />, prompt: "Explique ce code en détail :" },
  { id: "fix", label: "Corriger", icon: <Bug className="w-3.5 h-3.5" />, prompt: "Trouve et corrige les bugs dans :" },
  { id: "optimize", label: "Optimiser", icon: <Zap className="w-3.5 h-3.5" />, prompt: "Optimise ce code pour de meilleures performances :" },
  { id: "refactor", label: "Refactoriser", icon: <RotateCcw className="w-3.5 h-3.5" />, prompt: "Refactorise ce code pour le rendre plus lisible :" },
];

const SUGGESTIONS = [
  { icon: <Code className="w-4 h-4" />, text: "Générer une fonction de tri", category: "Code" },
  { icon: <Wand2 className="w-4 h-4" />, text: "Expliquer une erreur", category: "Debug" },
  { icon: <FileCode className="w-4 h-4" />, text: "Créer une API REST", category: "Architecture" },
  { icon: <Terminal className="w-4 h-4" />, text: "Commande Git utile", category: "DevOps" },
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
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
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
    <div className="flex h-full min-h-0 overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#0F172A] to-[#09101f] text-white">
      {/* Main Chat Area */}
      <div className="flex h-full min-h-0 flex-1 flex-col backdrop-blur-xl">
        <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-[#0F172A]/90 via-[#1a1f2e]/80 to-[#0F172A]/90 backdrop-blur-xl shadow-lg shadow-sky-500/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            {/* Title Section */}
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-300"></div>
                <div className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-400 animate-pulse shadow-lg shadow-sky-400/50"></div>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-sky-200 via-blue-200 to-cyan-200 bg-clip-text text-transparent group-hover:from-sky-100 group-hover:to-cyan-100 transition-all">
                {currentConversation?.title ?? "Discussion UnifyFocus"}
              </h1>
            </div>
            
            {/* Stats & Info Section */}
            <div className="flex flex-wrap items-center gap-3 ml-5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-medium text-slate-300">{messages.length} message{messages.length > 1 ? "s" : ""}</span>
              </div>
              
              <Badge className="rounded-lg bg-gradient-to-r from-sky-500/30 to-blue-600/30 text-sky-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] border border-sky-500/40 shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all">
                ✨ {getModelName(selectedModel)}
              </Badge>

              {currentConversation && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs text-emerald-300 font-medium">Actif</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:ml-4">
            <Button 
              onClick={handleNewChat} 
              className="group text-xs font-semibold border border-white/20 bg-gradient-to-r from-sky-500/20 to-blue-500/10 hover:from-sky-500/30 hover:to-blue-600/20 text-sky-200 hover:text-sky-100 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-sky-500/20 hover:border-sky-500/40 rounded-lg px-3.5 py-2"
            >
              <Plus className="w-4 h-4 mr-1.5 group-hover:rotate-90 transition-transform duration-300" />
              Nouveau Chat
            </Button>
            <Button 
              onClick={() => setShowHistorySidebar(!showHistorySidebar)} 
              className="group text-xs font-semibold border border-white/20 bg-gradient-to-r from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 text-slate-300 hover:text-white transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-white/10 hover:border-white/30 rounded-lg px-3.5 py-2"
            >
              <History className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
              Historique
            </Button>
          </div>
        </div>

        <div className="border-b border-white/5 bg-gradient-to-b from-[#0F172A]/50 to-transparent px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Actions rapides</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleQuickAction(action)}
                className={`rounded-full border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                  activeQuickAction === action.id 
                    ? "border-sky-500 bg-gradient-to-r from-sky-500/30 to-blue-500/20 text-sky-200 shadow-lg shadow-sky-500/20" 
                    : "border-white/15 bg-white/[0.03] text-slate-300 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-md hover:shadow-white/5"
                }`}
              >
                <span className="mr-2 inline-flex items-center justify-center">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto bg-gradient-to-b from-[#09101f] to-[#0B1220] p-4 pb-28">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="w-full max-w-2xl space-y-8 px-4">
                  {/* Welcome Section */}
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
                      <Logo iconOnly markSize={40} />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent mb-2">
                        UnifyFocus Chat
                      </h1>
                      <p className="text-slate-400 text-sm">
                        Votre assistant IA intelligent pour coder, déboguer et optimiser
                      </p>
                    </div>
                  </div>

                  {/* Suggestions Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(suggestion.text)}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition-all duration-300 hover:border-sky-500/30 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-sky-500/10"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-sky-400 group-hover:bg-sky-500/10 transition-colors">
                            {suggestion.icon}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                              {suggestion.text}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">{suggestion.category}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Quick Tips */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                      💡 Conseils
                    </h3>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center mt-0.5">
                          <span className="text-[10px] text-sky-400">✓</span>
                        </div>
                        <p className="text-sm text-slate-300">
                          Utilisez les boutons rapides pour des actions courantes
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center mt-0.5">
                          <span className="text-[10px] text-sky-400">✓</span>
                        </div>
                        <p className="text-sm text-slate-300">
                          Joignez des fichiers ou des images pour une analyse plus complète
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center mt-0.5">
                          <span className="text-[10px] text-sky-400">✓</span>
                        </div>
                        <p className="text-sm text-slate-300">
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
              <div className="flex justify-center py-2">
                <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-slate-400">L'assistant UnifyFocus réfléchit...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-white/10 bg-[#0F172A]">
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

      {/* History Sidebar */}
      <motion.div
        initial={{ x: 300 }}
        animate={{ x: showHistorySidebar ? 0 : 300 }}
        transition={{ duration: 0.3 }}
        className="absolute right-0 top-0 bottom-0 w-72 bg-surface-1 border-l border-border shadow-lg z-30 flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <button
            onClick={() => setShowHistorySidebar(false)}
            className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">Historique</h2>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Aucune discussion
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group"
                >
                  <div className={`relative w-full p-3 rounded-md text-left transition-all cursor-pointer ${
                      currentConversation?.id === conv.id
                        ? "bg-accent/20 text-foreground border border-accent"
                        : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <button
                      onClick={() => {
                        handleSelectConversation(conv);
                        setShowHistorySidebar(false);
                      }}
                      className="w-full text-left"
                    >
                      <div className="font-semibold text-xs text-foreground truncate mb-1">
                        {conv.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-2">
                        {formatDate(conv.createdAt)}
                      </div>
                    </button>
                    
                    {/* Delete button on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id, e);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded bg-destructive/0 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/20"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </div>
  );
}