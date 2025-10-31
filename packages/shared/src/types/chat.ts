export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
}

export interface DocumentSource {
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  excerpt: string;
  relevanceScore?: number;
}

export interface ChatResponse {
  message: ChatMessage;
  sources: DocumentSource[];
  sessionId: string;
}

