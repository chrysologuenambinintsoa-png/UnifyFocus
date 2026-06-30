import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import MessageBubble, { ChatMessage } from "./message-bubble";

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="max-w-5xl mx-auto space-y-1 flex flex-col items-center w-full py-4">
      <AnimatePresence mode="popLayout">
        {messages.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              delay: i * 0.02,
              duration: 0.3,
              ease: "easeOut"
            }}
            className="w-full"
          >
            <MessageBubble message={m} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}