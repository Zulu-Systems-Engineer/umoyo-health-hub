import { User, Bot } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import type { ChatMessage as ChatMessageType, DocumentSource } from "@umoyo/shared";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <Card
      className={`mb-4 rounded-xl shadow-sm ${
        isUser ? "bg-blue-50 border-blue-200" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {isUser ? (
              <div className="p-2 bg-blue-600 rounded-full shadow-sm">
                <User className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div className="p-2 bg-blue-600 rounded-full shadow-sm">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Label */}
            <div className="text-sm font-semibold text-gray-700 mb-2">
              {isUser ? "You" : "MoyoHealth Assistant"}
            </div>

            {/* Message Text */}
            <div className="text-gray-900 whitespace-pre-wrap break-words">
              {message.content}
            </div>

            {/* Citations */}
            {isAssistant && message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  Sources:
                </div>
                <div className="space-y-1">
                  {message.sources.map((source: DocumentSource, index: number) => (
                    <a
                      key={source.documentId}
                      href={`#source-${source.documentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      [{index + 1}] {source.documentTitle}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp */}
            {message.timestamp && (
              <div className="text-xs text-gray-500 mt-2">
                {new Date(message.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
