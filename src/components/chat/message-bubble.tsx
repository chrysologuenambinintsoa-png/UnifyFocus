import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import Logo from "@/components/ui/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, AlertCircle, Download, FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { extractImagesFromResponse } from "@/lib/ai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  rating?: "good" | "bad" | "incomplete" | null;
  attachments?: string[];
}

// Helper function to check if URL is an image
const isImageUrl = (url: string): boolean => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.includes(ext));
};

// Helper function to extract filename from URL
const getFilename = (url: string): string => {
  return url.split("/").pop() || "file";
};

// Helper function to get file extension
const getFileExtension = (filename: string): string => {
  const ext = filename.split(".").pop() || "";
  return ext.toUpperCase();
};

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const { user } = useAppStore();
  const [isRating, setIsRating] = useState(false);
  const [userRating, setUserRating] = useState<"good" | "bad" | "incomplete" | null>(message.rating || null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const time = (() => {
    try {
      return format(new Date(message.createdAt), "HH:mm");
    } catch {
      return "";
    }
  })();

  const isUser = message.role === "user";

  const contentSegments = useMemo(() => {
    const segments: Array<{ type: "text" | "code"; language?: string; content: string }> = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          content: message.content.slice(lastIndex, match.index),
        });
      }
      segments.push({
        type: "code",
        language: match[1] || "text",
        content: match[2],
      });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < message.content.length) {
      segments.push({
        type: "text",
        content: message.content.slice(lastIndex),
      });
    }

    return segments;
  }, [message.content]);

  const inlineImageUrls = useMemo(() => extractImagesFromResponse(message.content), [message.content]);
  const attachedImageUrls = message.attachments?.filter((url) => isImageUrl(url)) ?? [];
  const imageUrls = [...new Set([...attachedImageUrls, ...inlineImageUrls])];
  const fileAttachments = message.attachments?.filter((url) => !isImageUrl(url)) ?? [];

  const copyToClipboard = async (code: string, codeId: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(codeId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderContent = () =>
    contentSegments.map((segment, index) => {
      if (segment.type === "code") {
        const codeId = `${message.id}-code-${index}`;
        return (
          <div key={`code-${index}`} className="my-4 overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-lg">
            {/* Code Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 ml-2">
                  {segment.language || "code"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(segment.content.trim(), codeId)}
                className="h-7 px-2.5 text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {copiedCode === codeId ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copier
                  </>
                )}
              </Button>
            </div>
            {/* Code Content */}
            <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed text-slate-100 font-mono">
              {segment.content.trim()}
            </pre>
          </div>
        );
      }

      return (
        <div key={`text-${index}`} className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-slate-200">
          {segment.content.trim()}
        </div>
      );
    });

  const handleRating = async (rating: "good" | "bad" | "incomplete") => {
    if (!user) return;
    
    setUserRating(rating);
    setIsRating(true);
    
    try {
      await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          userId: user.id,
          rating,
        }),
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsRating(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-2">
      <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] gap-3 items-end w-full max-w-5xl mx-auto">
        {/* left avatar for assistant, empty for user */}
        <div className="col-start-1 flex items-start pt-1">
          {!isUser ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Logo iconOnly markSize={32} />
            </motion.div>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* message bubble */}
        <div className={`col-start-2 col-end-3 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
          {isUser ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl px-5 py-3.5 max-w-[85%] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all"
            >
              <div className="text-[15px] font-medium break-words leading-relaxed">{message.content}</div>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((url) => {
                    if (isImageUrl(url)) {
                      return (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border-2 border-white/20 hover:border-white/40 transition-all">
                          <img src={url} alt="attachment" className="h-24 max-w-xs object-cover" />
                        </a>
                      );
                    } else {
                      const filename = getFilename(url);
                      return (
                        <a
                          key={url}
                          href={url}
                          download
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all text-xs text-white font-medium border border-white/10"
                          title={filename}
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{filename}</span>
                          <Download className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                      );
                    }
                  })}
                </div>
              )}
              <div className="text-[11px] text-white/80 mt-2 font-medium">{time}</div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl px-5 py-4 max-w-2xl bg-slate-800/80 border-2 border-slate-700 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all backdrop-blur-sm"
            >
              <div className="space-y-3">
                {renderContent()}
              </div>
              {imageUrls.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {imageUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border-2 border-slate-700 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]">
                      <img src={url} alt="assistant image" className="h-36 w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {fileAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {fileAttachments.map((url) => {
                    const filename = getFilename(url);
                    return (
                      <a
                        key={url}
                        href={url}
                        download
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-all text-xs text-slate-200 font-medium border border-slate-600"
                        title={filename}
                      >
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{filename}</span>
                        <Download className="w-3.5 h-3.5 flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              )}
              <div className="text-[11px] text-slate-500 mt-2 font-medium">{time}</div>
            </motion.div>
          )}
          
          {/* Feedback buttons for assistant messages */}
          {!isUser && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex items-center gap-1.5 mt-2"
            >
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 rounded-full transition-all ${
                  userRating === "good"
                    ? "bg-emerald-900/50 text-emerald-400 hover:bg-emerald-800/50"
                    : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/30"
                }`}
                onClick={() => handleRating("good")}
                disabled={isRating}
                title="Bonne réponse"
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 rounded-full transition-all ${
                  userRating === "bad"
                    ? "bg-red-900/50 text-red-400 hover:bg-red-800/50"
                    : "text-slate-500 hover:text-red-400 hover:bg-red-900/30"
                }`}
                onClick={() => handleRating("bad")}
                disabled={isRating}
                title="Mauvaise réponse"
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 rounded-full transition-all ${
                  userRating === "incomplete"
                    ? "bg-amber-900/50 text-amber-400 hover:bg-amber-800/50"
                    : "text-slate-500 hover:text-amber-400 hover:bg-amber-900/30"
                }`}
                onClick={() => handleRating("incomplete")}
                disabled={isRating}
                title="Réponse incomplète"
              >
                <AlertCircle className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* right avatar for user, empty for assistant */}
        <div className="col-start-3 flex items-start justify-end pt-1">
          {isUser ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-slate-700 text-white text-xs font-semibold">U</AvatarFallback>
              </Avatar>
            </motion.div>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </div>
    </div>
  );
}