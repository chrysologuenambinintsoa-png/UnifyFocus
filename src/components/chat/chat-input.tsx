import React, { useState, useEffect } from "react";
import { Paperclip, Send, Loader2, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type AttachedFile = { file: File; uploading?: boolean; url?: string; progress?: number };

export default function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  attachedFiles,
  setAttachedFiles,
  onCancelUpload,
}: {
  input: string;
  setInput: (s: string) => void;
  onSend: (custom?: string) => void;
  isLoading: boolean;
  attachedFiles: AttachedFile[];
  setAttachedFiles: (files: AttachedFile[]) => void;
  onCancelUpload?: (index: number) => void;
}) {
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
  return (
    <div className="w-full flex-shrink-0 border-t border-border bg-background/95 z-10">
      <div className="w-full px-4 py-4">
        <div className="relative">
          <label className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer">
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
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </label>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demandez à UnifyFocus... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
            className="w-full min-h-[52px] max-h-[200px] resize-none rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground p-3 pl-12 pr-12 text-sm focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
            rows={1}
            disabled={isLoading}
          />

          <Button
            onClick={() => onSend()}
            disabled={!(input.trim() || attachedFiles.length > 0) || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-gold hover:bg-gold/90 text-gold-foreground disabled:opacity-40 disabled:cursor-not-allowed h-8 w-8 p-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {attachedFiles.length > 0 && (
          <div className="mt-3 px-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Fichiers joints ({attachedFiles.length})</p>
              <button onClick={clearFiles} className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                <X className="w-3 h-3" />
                Effacer
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {attachedFiles.map((af, i) => {
                const f = af.file;
                const key = f.name + f.size;
                return (
                  <div key={key} className="flex-shrink-0 w-28 border border-border rounded p-2 bg-card relative">
                    {f.type.startsWith("image/") ? (
                      <img src={previews[key]} alt={f.name} className="w-full h-16 object-cover rounded" />
                    ) : (
                      <div className="w-full h-16 flex items-center justify-center text-xs text-muted-foreground">{f.name}</div>
                    )}

                    {af.uploading && (
                      <div className="absolute inset-0 bg-black/20 flex items-end justify-center rounded p-2">
                        <div className="w-full bg-black/30 h-1 rounded overflow-hidden">
                          <div
                            className="h-1 bg-gold"
                            style={{ width: `${af.progress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">{f.name}</span>
                      <button
                        onClick={() => {
                          if (af.uploading && onCancelUpload) {
                            onCancelUpload(i);
                          } else {
                            removeFile(i);
                          }
                        }}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        title={af.uploading ? "Annuler l'upload" : "Supprimer"}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted-foreground">L'assistant UnifyFocus peut faire des erreurs. Vérifiez les informations importantes.</p>
        </div>
      </div>
    </div>
  );
}
