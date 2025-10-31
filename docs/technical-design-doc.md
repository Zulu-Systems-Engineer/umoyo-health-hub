# Technical Design Document

## Architecture Overview

Umoyo Health Hub follows a monorepo architecture using pnpm workspaces and Turborepo for build orchestration.

### High-Level Architecture

```
┌─────────────────┐
│   React Frontend│
│   (apps/web)    │
└────────┬────────┘
         │ tRPC
         ▼
┌─────────────────┐
│ Firebase Cloud  │
│ Functions (tRPC)│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ RAG    │ │ Gemini │
│ Service│ │ Service│
└────────┘ └────────┘
```

## Frontend Architecture

### Technology Stack
- **React 18** with TypeScript (strict mode)
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **TanStack Query** for server state management
- **React Hook Form + Zod** for form validation
- **tRPC React** for type-safe API calls

### Component Structure
```
src/
├── components/
│   ├── chat/        # Chat interface components
│   ├── search/      # Search UI components
│   └── ui/          # shadcn/ui components
├── hooks/           # Custom React hooks
├── lib/             # Utilities and configurations
│   ├── trpc.ts      # tRPC client setup
│   └── firebase.ts  # Firebase client config
└── pages/           # Page components
```

## Backend Architecture

### Technology Stack
- **Firebase Cloud Functions (Gen 2)** for serverless backend
- **tRPC** for type-safe RPC layer
- **TypeScript** (strict mode)
- **Firebase Admin SDK** for server-side Firebase operations

### Router Structure
```
src/
├── routers/
│   ├── chat.router.ts    # Chat/RAG query endpoints
│   ├── search.router.ts  # Search functionality
│   └── user.router.ts    # User management
├── services/
│   ├── rag.service.ts    # Vertex AI RAG integration
│   ├── pubmed.service.ts # PubMed API wrapper
│   └── gemini.service.ts # Gemini model calls
└── middleware/
    └── auth.middleware.ts # Firebase Auth validation
```

## Data Flow

### Chat Query Flow
1. User submits query via frontend
2. Frontend calls tRPC `chat.query` mutation
3. Backend validates input using Zod schemas
4. RAG service searches corpus for relevant documents
5. Gemini service generates response with context
6. Response (with sources) returned to frontend

### Search Flow
1. User submits search query
2. Frontend calls tRPC `search.search` query
3. Backend queries RAG service with filters
4. Results returned to frontend

## Shared Package

The `packages/shared` package contains:
- **Type Definitions**: TypeScript interfaces and types
- **Zod Schemas**: Validation schemas used by both frontend and backend
- **Utilities**: Shared utility functions

## Deployment

- **Frontend**: Deployed via Firebase Hosting
- **Backend**: Deployed via Firebase Cloud Functions
- **CI/CD**: GitHub Actions for automated testing and deployment

