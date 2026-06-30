"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { Paperclip, Send, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AttachedFile = { file: File; uploading?: boolean; url?: string; progress?: number };

type ChatInputProps = {
  input: string;
  setInput: (s: string) => void;
  onSend: (custom?: string) => void;
  isLoading: boolean;
  attachedFiles: AttachedFile[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  onCancelUpload?: (index: number) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      input,
      setInput,
      onSend,
      isLoading,
      attachedFiles,
      setAttachedFiles,
      onCancelUpload,
      onKeyDown,
    },
    ref
  ) => {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const newPreviews: Record<string, string> = {};
    attachedFiles.forEach((f) => {
      const file = f.file;
      if (file.type.startsWith("image/")) {
        newPreviews[file.name + file.size] = URL.createObjectURL(file);
      }
    });
    setPreviews((old) => {
      Object.values(old).forEach((url) => {
        if (!Object.values(newPreviews).includes(url)) URL.revokeObjectURL(url);
      });
      return newPreviews;
    });

    return () => {
      Object.values(newPreviews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachedFiles]);

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setAttachedFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full flex-shrink-0 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-6 py-4">
        <div className="relative max-w-4xl mx-auto">
          {/* Attachment Button */}
          <label className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer group">
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files).map((file) => ({ file }));
                  setAttachedFiles((prev) => [...prev, ...files]);
                }
                if (e.target) e.target.value = "";
              }}
              className="hidden"
            />
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200 border border-slate-700 group-hover:border-blue-500">
              <Paperclip className="w-5 h-5" />
            </div>
          </label>

          {/* Text Input */}
          <Textarea
            ref={ref}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tapez votre message..."
            className="w-full min-h-[56px] max-h-[200px] resize-none rounded-2xl bg-slate-800/50 border-2 border-slate-700 text-slate-100 placeholder:text-slate-500 p-4 pl-14 pr-14 text-[15px] leading-relaxed focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
            rows={1}
            disabled={isLoading}
          />

          {/* Send Button */}
          <Button
            onClick={() => onSend()}
            disabled={!(input.trim() || attachedFiles.length > 0) || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed h-10 w-10 p-0 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="mt-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600/10 text-blue-400 border-blue-500/30 hover:bg-blue-600/20">
                  {attachedFiles.length} fichier{attachedFiles.length > 1 ? 's' : ''} joint{attachedFiles.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <button 
                onClick={clearFiles} 
                className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition-colors font-medium"
              >
                <X className="w-3.5 h-3.5" />
                Effacer tout
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
              {attachedFiles.map((af, i) => {
                const f = af.file;
                const key = f.name + f.size;
                const isImage = f.type.startsWith("image/");
                
                return (
                  <div 
                    key={key} 
                    className="flex-shrink-0 w-36 border-2 border-slate-700 rounded-xl p-2.5 bg-slate-800/50 relative overflow-hidden shadow-sm hover:shadow-md hover:border-slate-600 transition-all"
                  >
                    {isImage && previews[key] ? (
                      <div className="relative w-full h-20 rounded-lg overflow-hidden bg-slate-900">
                        <img 
                          src={previews[key]} 
                          alt={f.name} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                    ) : (
                      <div className="w-full h-20 flex flex-col items-center justify-center gap-2 text-slate-400 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                        <span className="text-[10px] font-medium truncate w-full px-2 text-center">
                          {f.name}
                        </span>
                      </div>
                    )}

                    {/* Upload Progress Overlay */}
                    {af.uploading && (
                      <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
                        <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                            style={{ width: `${af.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-300 mt-1.5 font-medium">
                          {af.progress ?? 0}%
                        </span>
                      </div>
                    )}

                    {/* File Info */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300 truncate font-medium flex-1" title={f.name}>
                          {f.name}
                        </span>
                        <button
                          onClick={() => {
                            if (af.uploading && onCancelUpload) {
                              onCancelUpload(i);
                            } else {
                              removeFile(i);
                            }
                          }}
                          className="ml-1.5 text-slate-500 hover:text-red-400 transition-colors p-1 hover:bg-red-900/20 rounded"
                          title={af.uploading ? "Annuler l'upload" : "Supprimer"}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {formatFileSize(f.size)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-center justify-between mt-3 max-w-4xl mx-auto">
          <p className="text-[11px] text-slate-500">
            L'assistant UnifyFocus peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
});

ChatInput.displayName = "ChatInput";

export default ChatInput;