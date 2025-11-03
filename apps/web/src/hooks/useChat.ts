import { useState, useCallback } from "react";
import type { ChatMessage } from "@umoyo/shared";
import { generateId } from "@umoyo/shared";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  const initializeSession = useCallback((newSessionId?: string) => {
    if (newSessionId) {
      setSessionId(newSessionId);
    } else if (!sessionId) {
      setSessionId(generateId());
    }
  }, [sessionId]);

  return {
    messages,
    sessionId: sessionId || undefined,
    addMessage,
    clearMessages,
    initializeSession,
  };
}

