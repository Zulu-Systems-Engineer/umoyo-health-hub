import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useChat } from "@/hooks";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "../ui/card";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import type { ChatMessage as ChatMessageType } from "@umoyo/shared";

interface ChatInterfaceProps {
  role: "patient" | "professional";
  sessionId?: string;
}

export default function ChatInterface({
  role,
  sessionId: initialSessionId,
}: ChatInterfaceProps) {
  const { messages, sessionId, addMessage, initializeSession } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeSession(initialSessionId);
  }, [initialSessionId, initializeSession]);

  const queryMutation = (trpc as any).chat.query.useMutation({
    onSuccess: (response: any) => {
      // Add assistant response
      addMessage({
        role: "assistant",
        content: response.message.content,
        sources: response.sources,
      });
    },
    onError: (error: any) => {
      // Add error message
      addMessage({
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message || "Unknown error"}. Please try again.`,
      });
    },
  });

  const handleSubmit = (message: string) => {
    // Add user message
    addMessage({
      role: "user",
      content: message,
    });

    // Send query
    queryMutation.mutate({
      message,
      sessionId: sessionId,
      context: {
        audience: role === "patient" ? "patient" : "healthcare-professional",
      },
    });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Umoyo Health Hub</h1>
          <p className="text-muted-foreground">At the Heart of Zambian Healthcare</p>
        </div>
      </header>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="container mx-auto max-w-4xl">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-8">
              <p className="text-lg mb-2">Welcome to Umoyo Health Hub</p>
              <p>Ask me about symptoms, treatments, medications, or any health-related questions.</p>
            </div>
          )}

          {messages.map((message: ChatMessageType) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Loading State */}
          {queryMutation.isPending && (
            <Card className="mb-4 bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
                  <div className="text-sm font-semibold text-gray-700">
                    Searching medical knowledge...
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <ChatInput
        onSubmit={handleSubmit}
        isLoading={queryMutation.isPending}
        disabled={queryMutation.isPending}
      />
    </div>
  );
}
