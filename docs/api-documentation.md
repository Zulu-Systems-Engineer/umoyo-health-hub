# API Documentation

## Overview

Umoyo Health Hub uses tRPC for type-safe API communication between frontend and backend.

## tRPC Routers

### Chat Router

**Endpoint**: `chat.query`

**Type**: Mutation

**Input**: 
```typescript
{
  message: string;
  sessionId?: string;
  context?: {
    category?: string;
    language?: string;
    audience?: string;
  };
}
```

**Output**:
```typescript
{
  message: {
    id: string;
    role: "assistant";
    content: string;
    timestamp: Date;
  };
  sources: Array<{
    documentId: string;
    documentTitle: string;
    pageNumber?: number;
    excerpt: string;
    relevanceScore?: number;
  }>;
  sessionId: string;
}
```

**Description**: Submit a chat query and receive a response with relevant document sources.

### Search Router

**Endpoint**: `search.search`

**Type**: Query

**Input**:
```typescript
{
  query: string;
  category?: string;
  language?: string;
  audience?: string;
  region?: string;
  limit?: number; // default: 20, max: 100
  offset?: number; // default: 0
}
```

**Output**:
```typescript
Array<{
  documentId: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  metadata: {
    category: string;
    language: string;
    lastUpdated: string;
  };
}>
```

**Description**: Search the document corpus with filters and pagination.

### User Router

**Endpoint**: `user.profile`

**Type**: Query

**Input**: None (uses authentication token)

**Output**:
```typescript
{
  uid: string;
  email: string;
  displayName?: string;
  role: "healthcare-professional" | "patient";
  createdAt: Date;
  lastLoginAt: Date;
}
```

**Description**: Get the authenticated user's profile.

## Authentication

All authenticated endpoints require a Firebase Authentication token. The token should be included in the request headers when calling tRPC endpoints.

## Error Handling

tRPC automatically handles validation errors and provides type-safe error responses. All errors follow tRPC's error format.

## Client Usage

### Frontend (React)

```typescript
import { trpc } from "@/lib/trpc";

// Query example
const { data } = trpc.search.search.useQuery({
  query: "malaria treatment",
  limit: 10,
});

// Mutation example
const mutation = trpc.chat.query.useMutation();
mutation.mutate({
  message: "What are the symptoms of malaria?",
});
```

