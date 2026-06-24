import React, { useState } from "react";
import { format } from "date-fns";
import Logo from "@/components/ui/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, AlertCircle, Download, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";

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

  const time = (() => {
    try {
      return format(new Date(message.createdAt), "HH:mm");
    } catch {
      return "";
    }
  })();

  const isUser = message.role === "user";

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
    <div className="w-full px-4">
      <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] gap-3 items-end w-full">
        {/* left avatar for assistant, empty for user */}
        <div className="col-start-1 flex items-start pt-1">
          {!isUser ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Logo iconOnly markSize={32} className="rounded-lg" />
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
              className="rounded-3xl px-4 py-2.5 max-w-[85%] bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-shadow"
            >
              <p className="text-sm font-medium break-words leading-relaxed">{message.content}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((url) => {
                    if (isImageUrl(url)) {
                      return (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded">
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
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs text-blue-50 font-medium"
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
              <div className="text-[11px] text-blue-100 mt-1.5 opacity-80">{time}</div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl px-4 py-2.5 max-w-2xl bg-surface-2 border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-sm text-foreground leading-relaxed break-words font-normal">{message.content}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((url) => {
                    if (isImageUrl(url)) {
                      return (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded">
                          <img src={url} alt="attachment" className="h-28 max-w-sm object-cover" />
                        </a>
                      );
                    } else {
                      const filename = getFilename(url);
                      return (
                        <a
                          key={url}
                          href={url}
                          download
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs text-foreground font-medium"
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
              <div className="text-[11px] text-muted-foreground mt-1.5 opacity-70">{time}</div>
            </motion.div>
          )}
          
          {/* Feedback buttons for assistant messages */}
          {!isUser && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex items-center gap-1 mt-2"
            >
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 rounded-full transition-all ${
                  userRating === "good"
                    ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                    : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                }`}
                onClick={() => handleRating("good")}
                disabled={isRating}
                title="Bonne réponse"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 rounded-full transition-all ${
                  userRating === "bad"
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                }`}
                onClick={() => handleRating("bad")}
                disabled={isRating}
                title="Mauvaise réponse"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 rounded-full transition-all ${
                  userRating === "incomplete"
                    ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                    : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                }`}
                onClick={() => handleRating("incomplete")}
                disabled={isRating}
                title="Réponse incomplète"
              >
                <AlertCircle className="w-3.5 h-3.5" />
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
                <AvatarFallback className="bg-blue-500 text-white text-xs font-semibold">U</AvatarFallback>
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
