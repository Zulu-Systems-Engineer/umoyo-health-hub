# Umoyo Health Hub - Backend API

Backend API for Umoyo Health Hub built with Firebase Cloud Functions, tRPC, and Vertex AI.

## 📋 Overview

This backend provides:
- **RAG-powered chat queries** - Query medical knowledge base with AI responses
- **Document search** - Search and filter medical documents
- **User management** - User profiles and preferences
- **Type-safe APIs** - End-to-end type safety with tRPC

## 🏗️ Architecture

```
functions/
├── src/
│   ├── config/          # Configuration management
│   ├── middleware/      # Auth and other middleware
│   ├── routers/         # tRPC routers
│   │   ├── chat.router.ts
│   │   ├── search.router.ts
│   │   └── user.router.ts
│   ├── services/        # Business logic services
│   │   ├── rag.service.ts      # Vertex AI RAG integration
│   │   ├── gemini.service.ts   # Gemini model integration
│   │   └── pubmed.service.ts  # PubMed API wrapper
│   ├── app.ts           # tRPC app setup
│   └── index.ts         # Firebase Functions entry point
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

1. **Firebase CLI** installed and authenticated
2. **Google Cloud SDK** configured
3. **Node.js** >= 18.0.0
4. **pnpm** >= 9.0.0

### Installation

```bash
cd functions
pnpm install
```

### Configuration

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration:
   - GCP Project ID
   - RAG Corpus ID (from seeding package)
   - Firebase Project ID

### Development

Start Firebase emulators:

```bash
pnpm dev
```

This will start:
- Firebase Functions emulator
- Firestore emulator
- Authentication emulator

The tRPC endpoint will be available at:
```
http://localhost:5001/umoyo-health-hub/us-central1/trpc
```

### Build

```bash
pnpm build
```

### Deploy

```bash
pnpm deploy
```

Or deploy specific function:

```bash
firebase deploy --only functions:trpc
```

## 📡 API Endpoints

### Chat Router

**`chat.query`** - Query medical knowledge base
```typescript
// Input
{
  message: string;
  sessionId?: string;
  context?: {
    category?: string;
    language?: string;
    audience?: string;
  };
}

// Output
{
  message: ChatMessage;
  sources: DocumentSource[];
  sessionId: string;
}
```

### Search Router

**`search.search`** - Search documents
```typescript
// Input
{
  query: string;
  category?: string;
  language?: string;
  audience?: string;
  region?: string;
  limit?: number;
  offset?: number;
}
```

**`search.getFilters`** - Get available filter options

**`search.getStats`** - Get corpus statistics

### User Router

**`user.profile`** - Get user profile (protected)
**`user.updateProfile`** - Update user profile (protected)
**`user.searchHistory`** - Get user search history (protected)

## 🔧 Services

### RAG Service

Queries the Vertex AI RAG corpus for relevant medical documents.

```typescript
import { ragService } from './services/rag.service';

const sources = await ragService.searchDocuments(
  'malaria treatment',
  {
    category: 'clinical-guideline',
    language: 'en',
  },
  { limit: 5 }
);
```

### Gemini Service

Generates AI responses using Google Gemini models with RAG context.

```typescript
import { geminiService } from './services/gemini.service';

const response = await geminiService.generateResponse(
  'What is the treatment for malaria?',
  sources
);
```

### Configuration

Centralized configuration management:

```typescript
import { config } from './config';

console.log(config.gcp.projectId);
console.log(config.rag.corpusName);
console.log(config.gemini.modelName);
```

## 🔐 Authentication

The backend uses Firebase Authentication. To use protected endpoints:

1. Authenticate user on frontend
2. Include ID token in Authorization header:
   ```
   Authorization: Bearer <id-token>
   ```

Protected procedures require authentication and will return `UNAUTHORIZED` if token is missing or invalid.

## 🧪 Testing

### Local Testing

Use Firebase emulators:

```bash
pnpm dev
```

### Manual Testing with cURL

```bash
# Test chat query
curl -X POST http://localhost:5001/umoyo-health-hub/us-central1/trpc/chat.query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is malaria?",
    "context": {
      "audience": "patient"
    }
  }'
```

## 🐛 Troubleshooting

### Issue: "RAG service not implemented yet"

**Solution:** The RAG service uses mock data in development. For production:
1. Ensure RAG corpus is created (use seeding package)
2. Update `RAG_CORPUS_ID` in `.env`
3. Check Vertex AI RAG API documentation for latest implementation

### Issue: "Gemini service not implemented yet"

**Solution:** 
1. Verify `GCP_PROJECT_ID` is set correctly
2. Ensure Vertex AI API is enabled
3. Check that service account has Vertex AI User role

### Issue: Firebase Functions deployment fails

**Solution:**
```bash
# Check Firebase login
firebase login

# Check project
firebase use <project-id>

# Verify functions directory
firebase functions:config:get
```

## 📊 Monitoring

### View Logs

```bash
# Local emulator logs
firebase functions:log

# Production logs
firebase functions:log --only trpc
```

### Cloud Console

- Firebase Console: https://console.firebase.google.com
- Cloud Functions: Monitor execution and errors
- Vertex AI: Monitor RAG queries and costs

## 🔄 Environment Variables

Required:
- `GCP_PROJECT_ID` - Google Cloud Project ID
- `GCP_LOCATION` - Vertex AI location (default: us-central1)
- `RAG_CORPUS_NAME` - Name of RAG corpus

Optional:
- `RAG_CORPUS_ID` - Full corpus ID path (if different from name)
- `GEMINI_MODEL` - Gemini model to use (default: gemini-2.0-flash-exp)
- `GEMINI_TEMPERATURE` - Generation temperature (default: 0.7)

## 📚 Resources

- [tRPC Documentation](https://trpc.io)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Vertex AI RAG](https://cloud.google.com/vertex-ai/docs/generative-ai/rag-overview)
- [Gemini API](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Use Zod for input validation
3. Add error handling to all service methods
4. Include JSDoc comments for public APIs
5. Test with Firebase emulators before deploying

---

**Need help?** Check the main project README or open an issue.

