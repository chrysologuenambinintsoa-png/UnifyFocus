import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import MessageBubble, { ChatMessage } from "./message-bubble";

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="max-w-4xl mx-auto space-y-3 flex flex-col items-start w-full">
      <AnimatePresence mode="popLayout">
        {messages.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
            transition={{ delay: i * 0.01 }}
            className="w-full"
          >
            <MessageBubble message={m} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
