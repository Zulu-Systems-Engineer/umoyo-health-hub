import { useState, useCallback, useEffect } from "react";
import type { ChatMessage } from "@umoyo/shared";
import { generateId } from "@umoyo/shared";
import { trpcClient } from "@/lib/trpc";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load conversation history when sessionId changes
  useEffect(() => {
    if (!sessionId) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Use vanilla client for non-hook usage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (trpcClient as any).chat.getHistory.query({ sessionId });
        if (result?.messages && Array.isArray(result.messages)) {
          setMessages(result.messages.map((msg: ChatMessage & { timestamp: string | Date }) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          })));
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
        // Don't set messages on error - start fresh
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [sessionId]);

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    
    // Note: Messages are automatically saved by the backend in the chat.query endpoint
    // We only need to save here if we want to save user messages before the backend response
    // For now, we'll rely on backend auto-saving to avoid duplicate saves
    
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
    isLoadingHistory,
  };
}

