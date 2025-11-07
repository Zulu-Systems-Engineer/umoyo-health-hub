import { useEffect, useRef, useState } from "react";
import { Loader2, Bot, Shield, BookOpen, AlertCircle, Sparkles, Zap, Heart } from "lucide-react";
import { useChat } from "@/hooks";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import type { ChatMessage as ChatMessageType, ChatResponse } from "@umoyo/shared";

interface ChatInterfaceProps {
  role: "patient" | "professional";
  sessionId?: string;
  onExit?: () => void;
}

// Quick action buttons for common queries
const QUICK_ACTIONS = {
  patient: [
    { icon: "🤒", text: "Common symptoms", query: "What are common symptoms of malaria?" },
    { icon: "💊", text: "Medication info", query: "Tell me about pain relief options" },
    { icon: "👶", text: "Child health", query: "What vaccines are recommended for children?" },
    { icon: "🍎", text: "Nutrition", query: "Healthy eating tips for Zambian diet" }
  ],
  professional: [
    { icon: "📋", text: "Malaria guidelines", query: "Current Zambian malaria treatment guidelines" },
    { icon: "💊", text: "Drug interactions", query: "Common drug interactions to watch for" },
    { icon: "🔬", text: "Diagnostic criteria", query: "Diagnostic criteria for hypertension" },
    { icon: "📊", text: "Treatment protocols", query: "Standard treatment protocols for diabetes" }
  ]
};

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
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    initializeSession(initialSessionId);
  }, [initialSessionId, initializeSession]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryMutation = (trpc as any).chat.query.useMutation({
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (response: ChatResponse) => {
      addMessage({
        role: "assistant",
        content: response.message.content,
        sources: response.sources,
      });
      setIsTyping(false);
    },
    onError: (error: Error) => {
      addMessage({
        role: "assistant",
        content: `I apologize, but I'm having trouble accessing medical information right now. ${error.message || "Please try again in a moment."}`,
      });
      setIsTyping(false);
    },
  });

  const handleSubmit = (message: string) => {
    if (!message.trim() || queryMutation.isPending) return;

    addMessage({
      role: "user",
      content: message,
    });

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

  const handleQuickAction = (query: string) => {
    handleSubmit(query);
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50/80 via-white to-emerald-50/60">
      {/* Enhanced Header with better visual hierarchy */}
      <header className="border-b bg-white/90 backdrop-blur-lg sticky top-0 z-10 shadow-sm border-blue-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                    Umoyo Health Hub
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600">
                      At the Heart of Zambian Healthcare
                    </p>
                    <Badge 
                      variant={role === "patient" ? "default" : "secondary"}
                      className="text-xs font-medium shadow-sm"
                    >
                      {role === "patient" ? "👤 Patient Mode" : "👨‍⚕️ Professional Mode"}
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
                className="gap-1.5 shadow-sm hover:shadow transition-all"
              >
                <Zap className="h-4 w-4" />
                Clear Chat
              </Button>
              {onExit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExit}
                  className="hover:bg-red-50 hover:text-red-600 transition-colors"
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
        className="flex-1 overflow-y-auto scroll-smooth bg-gradient-to-b from-transparent to-blue-50/30"
        onScroll={handleScroll}
      >
        <div className="container mx-auto max-w-4xl py-6 px-4">
          {/* Enhanced Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center max-w-2xl mx-auto mb-8 animate-in fade-in duration-700">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-blue-100/50">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent mb-4">
                  {welcomeData.title}
                </h2>
                <p className="text-gray-700 mb-8 text-lg leading-relaxed">
                  {welcomeData.description}
                </p>
                
                {/* Quick Actions */}
                <div className="mb-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 text-lg">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {QUICK_ACTIONS[role].map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickAction(action.query)}
                        className="p-3 bg-white border border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all duration-200 group text-left shadow-sm"
                      >
                        <div className="text-2xl mb-1">{action.icon}</div>
                        <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700">
                          {action.text}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tips Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 justify-center">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 text-lg">You can ask me about:</h3>
                  </div>
                  <div className="grid gap-3 text-gray-700">
                    {welcomeData.tips.map((tip, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-white/50 rounded-xl">
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                        <span className="text-sm">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security Badges */}
                <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>Not for emergencies</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((message: ChatMessageType) => (
              <ChatMessage 
                key={message.id} 
                message={message}
              />
            ))}

            {/* Enhanced Loading State */}
            {(queryMutation.isPending || isTyping) && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="max-w-[80%]">
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-blue-600 rounded-full shadow-sm">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                            <div className="text-sm font-semibold text-gray-700">
                              Searching medical knowledge...
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            Analyzing your query against Zambian healthcare guidelines
                          </div>
                          {/* Typing indicator */}
                          <div className="flex gap-1 mt-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
          className="fixed bottom-24 right-6 rounded-full w-12 h-12 shadow-lg bg-blue-600 hover:bg-blue-700 transition-all animate-bounce"
          size="icon"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </Button>
      )}

      {/* Enhanced Input Area */}
      <div className="border-t bg-white/90 backdrop-blur-lg sticky bottom-0 border-blue-100">
        <div className="container mx-auto max-w-4xl p-4">
          <ChatInput
            onSubmit={handleSubmit}
            isLoading={queryMutation.isPending}
            disabled={queryMutation.isPending}
            quickActions={QUICK_ACTIONS[role]}
            onQuickAction={handleQuickAction}
          />
          
          {/* Enhanced Disclaimer */}
          <div className="text-center mt-3">
            <p className="text-xs text-gray-600 flex items-center justify-center gap-2 bg-amber-50/80 py-2 px-4 rounded-full border border-amber-200">
              <AlertCircle className="h-3 w-3 text-amber-600 flex-shrink-0" />
              <span>
                For medical emergencies, contact your nearest healthcare facility immediately • 
                Powered by <Heart className="h-3 w-3 text-red-500 inline mx-1" /> Zambian Healthcare Guidelines
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}