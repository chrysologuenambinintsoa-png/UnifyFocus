"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Settings,
  MoreVertical,
  Edit3,
  X,
  Check,
} from "lucide-react";
import { useAppStore, Conversation, AVAILABLE_MODELS } from "@/store/app-store";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

interface ConversationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  isOpen,
  onToggle,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const { user, conversations, setConversations, currentConversation, deleteConversation, selectedModel, setSelectedModel } =
    useAppStore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/conversations?userId=${encodeURIComponent(user.id)}`
      );
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, setConversations]);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (user && isOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchConversations();
    }
  }, [user, isOpen, fetchConversations]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        deleteConversation(id);
        toast({
          title: "Conversation supprimée",
          description: "La conversation a été supprimée avec succès.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la conversation.",
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
        // Update local state
        setConversations(
          conversations.map((c) =>
            c.id === id ? { ...c, title: data.conversation.title } : c
          )
        );
        if (currentConversation?.id === id) {
          onSelectConversation({ ...currentConversation, title: data.conversation.title });
        }
        toast({
          title: "Titre mis à jour",
          description: "Le titre de la conversation a été mis à jour.",
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

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const getModelName = (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    return model?.name || modelId;
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

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={onToggle}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-50 flex flex-col shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gold" />
                Conversations
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="lg:hidden"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>

            {/* Model Selector */}
            <div className="p-4 border-b border-border">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Modèle IA
              </Label>
              <Select
                value={selectedModel}
                onValueChange={(value) => {
                  setSelectedModel(value);
                  // Update user settings
                  if (user) {
                    fetch("/api/user/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ defaultModel: value }),
                    }).catch(console.error);
                  }
                }}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Sélectionner un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.provider}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* New Conversation Button */}
            <div className="p-4">
              <Button
                onClick={() => {
                  onNewConversation();
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                className="w-full gap-2"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                Nouvelle conversation
              </Button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>Aucune conversation</p>
                  <p className="text-xs mt-1">Commencez une nouvelle discussion</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`group relative rounded-lg transition-colors ${
                        currentConversation?.id === conversation.id
                          ? "bg-gold/10 border border-gold/30"
                          : "hover:bg-accent"
                      }`}
                    >
                      {editingId === conversation.id ? (
                        <div className="flex items-center gap-1 p-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(conversation.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={() => saveEdit(conversation.id)}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={cancelEdit}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectConversation(conversation);
                            if (window.innerWidth < 1024) {
                              onToggle();
                            }
                          }}
                          className="w-full text-left p-3 pr-8"
                        >
                          <div className="font-medium text-sm truncate">
                            {conversation.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(conversation.updatedAt)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {getModelName(conversation.model)}
                            </span>
                          </div>
                        </button>
                      )}

                      {/* Actions */}
                      {editingId !== conversation.id && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => startEdit(conversation, e)}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Renommer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => handleDelete(conversation.id, e)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}