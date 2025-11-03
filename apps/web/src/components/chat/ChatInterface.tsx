import { useEffect, useRef, useState } from "react";
import { Loader2, Bot, User, Shield, BookOpen, AlertCircle } from "lucide-react";
import { useChat } from "@/hooks";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import type { ChatMessage as ChatMessageType } from "@umoyo/shared";

interface ChatInterfaceProps {
  role: "patient" | "professional";
  sessionId?: string;
  onExit?: () => void;
}

export default function ChatInterface({
  role,
  sessionId: initialSessionId,
  onExit,
}: ChatInterfaceProps) {
  const { messages, sessionId, addMessage, initializeSession, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    initializeSession(initialSessionId);
  }, [initialSessionId, initializeSession]);

  const queryMutation = (trpc as any).chat.query.useMutation({
    onSuccess: (response: any) => {
      addMessage({
        role: "assistant",
        content: response.message.content,
        sources: response.sources,
        timestamp: new Date(),
      });
    },
    onError: (error: any) => {
      addMessage({
        role: "assistant",
        content: `I apologize, but I'm having trouble accessing medical information right now. ${error.message || "Please try again in a moment."}`,
        isError: true,
        timestamp: new Date(),
      });
    },
  });

  const handleSubmit = (message: string) => {
    if (!message.trim() || queryMutation.isPending) return;

    const userMessage: ChatMessageType = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    addMessage(userMessage);

    queryMutation.mutate({
      message,
      sessionId: sessionId,
      context: {
        audience: role === "patient" ? "patient" : "healthcare-professional",
        language: "en",
        region: "ZM",
      },
    });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(atBottom);
      setShowScrollButton(!atBottom);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  const handleClearChat = () => {
    clearMessages();
  };

  const getWelcomeMessage = () => {
    if (role === "patient") {
      return {
        title: "Welcome to Umoyo Health Hub",
        description: "I'm here to provide general health information in simple terms. Remember, I'm not a substitute for professional medical advice.",
        tips: [
          "Describe your symptoms clearly",
          "Ask about medications or treatments",
          "Request information in simple language",
          "Always consult a doctor for serious concerns"
        ]
      };
    } else {
      return {
        title: "Healthcare Professional Portal",
        description: "Access evidence-based clinical guidelines and medical protocols. All information is sourced from verified medical databases.",
        tips: [
          "Search for clinical guidelines",
          "Ask about drug interactions",
          "Request diagnostic criteria",
          "Access treatment protocols"
        ]
      };
    }
  };

  const welcomeData = getWelcomeMessage();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-blue-50/50 to-white">
      {/* Enhanced Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Umoyo Health Hub</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      At the Heart of Zambian Healthcare
                    </p>
                    <Badge 
                      variant={role === "patient" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {role === "patient" ? "Patient Mode" : "Professional Mode"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                disabled={messages.length === 0}
              >
                Clear Chat
              </Button>
              {onExit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExit}
                >
                  Exit
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Message History with Enhanced Features */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        onScroll={handleScroll}
      >
        <div className="container mx-auto max-w-4xl py-6 px-4">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center max-w-2xl mx-auto mb-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm border">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Bot className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {welcomeData.title}
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {welcomeData.description}
                </p>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">You can ask me about:</h3>
                  </div>
                  <div className="grid gap-2 text-sm text-gray-700">
                    {welcomeData.tips.map((tip, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Secure & Private
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not for emergencies
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((message: ChatMessageType, index) => (
              <ChatMessage 
                key={message.id} 
                message={message}
                isLatest={index === messages.length - 1}
              />
            ))}

            {/* Enhanced Loading State */}
            {queryMutation.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <Card className="bg-blue-50 border-blue-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-blue-600 rounded-full">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                            <div className="text-sm font-semibold text-gray-700">
                              Searching medical knowledge...
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            Analyzing your query against Zambian healthcare guidelines
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-6 rounded-full w-12 h-12 shadow-lg"
          size="icon"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </Button>
      )}

      {/* Input Form */}
      <div className="border-t bg-white/80 backdrop-blur-sm sticky bottom-0">
        <div className="container mx-auto max-w-4xl p-4">
          <ChatInput
            onSubmit={handleSubmit}
            isLoading={queryMutation.isPending}
            disabled={queryMutation.isPending}
            placeholder={
              role === "patient" 
                ? "Describe your symptoms or ask a health question..." 
                : "Search clinical guidelines or ask about treatments..."
            }
          />
          
          {/* Disclaimer */}
          <div className="text-center mt-3">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3" />
              For medical emergencies, contact your nearest healthcare facility immediately
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}