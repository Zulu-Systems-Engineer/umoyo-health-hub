# Hybrid RAG Architecture

## Overview

The Umoyo Health Hub now uses an **intelligent hybrid RAG system** that combines two complementary approaches:

1. **Google Vertex AI RAG Engine** - Managed RAG for general medical knowledge
2. **Custom Firestore RAG Pipeline** - Specialized system for Zambia-specific and image-based content

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER QUERY                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              INTELLIGENT QUERY ROUTER                        │
│  (Analyzes query & determines optimal strategy)            │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Vertex     │    │    Custom    │    │    Hybrid    │
│   RAG Only   │    │   RAG Only   │    │  Both + Merge│
└──────────────┘    └──────────────┘    └──────────────┘
         ↓                    ↓                    ↓
    ┌────────────────────────────────────────────────┐
    │         FALLBACK LOGIC (if primary fails)      │
    └────────────────────────────────────────────────┘
                           ↓
                   Final Response
```

## Services

### 1. VertexRAGService (`vertex-rag.service.ts`)

Manages interaction with Google's Vertex AI RAG Engine.

**Features:**
- Create and manage RAG corpora
- Import documents from Google Cloud Storage
- Query using Gemini with retrieval augmentation
- Extract grounding metadata and confidence scores

**Best for:**
- General medical queries ("What is diabetes?")
- Drug information
- WHO guidelines
- Clinical protocols

### 2. QueryRouterService (`query-router.service.ts`)

Intelligently determines which RAG system to use based on query characteristics.

**Routing Logic:**
- **Vertex RAG** → General medical queries, short queries
- **Custom RAG** → Zambia-specific queries, image-based queries
- **Hybrid** → Complex queries, professional queries

**Keywords tracked:**
- General medical: "symptoms of", "treatment for", "diagnosis", etc.
- Zambia-specific: "zambia", "lusaka", "endemic", "local", etc.
- Visual: "image", "diagram", "x-ray", "show me", etc.

### 3. HybridRAGService (`hybrid-rag.service.ts`)

Orchestrates both RAG systems and merges results.

**Features:**
- Executes queries using the router's strategy
- Parallel execution for hybrid queries
- Intelligent result merging
- Automatic fallback on failure
- Confidence score calculation

## API Endpoints

### Query Endpoint

```typescript
// Public endpoint (patients)
POST /trpc/rag.query
{
  "message": "What are the symptoms of malaria?",
  "conversationId": "optional-id"
}

// Response
{
  "answer": "Malaria symptoms include...",
  "sources": [
    {
      "title": "WHO Malaria Guidelines",
      "snippet": "...",
      "source": "vertex" | "custom",
      "confidence": 0.85
    }
  ],
  "confidence": 0.85,
  "processingTime": 1234,
  "strategyUsed": "vertex" | "custom" | "hybrid",
  "fallbackUsed": false
}
```

### Professional Query Endpoint

```typescript
// Requires authentication & healthcare-professional role
POST /trpc/rag.professionalQuery
{
  "message": "Detailed treatment protocol for severe malaria in Zambia",
  "conversationId": "optional-id"
}
```

### Health Check

```typescript
GET /trpc/rag.healthCheck

// Response
{
  "status": "ok",
  "systems": {
    "vertex": {
      "available": true,
      "corpusReady": true
    },
    "custom": {
      "available": true
    }
  },
  "timestamp": "2025-11-07T..."
}
```

## Setup

### 1. Environment Variables

Add to `.env` or Cloud Functions config:

```bash
# Project configuration
GCP_PROJECT_ID=umoyo-health-hub
GCP_LOCATION=us-central1

# Vertex RAG corpus ID (after creating corpus)
VERTEX_RAG_CORPUS_ID=projects/.../locations/.../ragCorpora/...
```

### 2. Create Vertex RAG Corpus

```bash
# Option 1: Use the seeding package
cd packages/seeding
pnpm run create-vertex-corpus

# Option 2: Manual via console
# Go to: https://console.cloud.google.com/vertex-ai/rag
```

### 3. Import Documents

```typescript
import { VertexRAGService } from './services/vertex-rag.service';

const vertexRAG = new VertexRAGService();
await vertexRAG.setCorpusId('your-corpus-id');

// Import from GCS
await vertexRAG.importDocuments([
  'gs://umoyo-health-pdfs/clinical-guideline/who-malaria-guidelines.pdf',
  'gs://umoyo-health-pdfs/drug-info/who-essential-medicines.pdf',
]);
```

### 4. Deploy Functions

```bash
cd functions
pnpm build
firebase deploy --only functions
```

## Query Routing Examples

### Example 1: General Medical Query → Vertex RAG

```
Query: "What is hypertension?"
Strategy: vertex
Reasoning: General medical query suitable for Vertex RAG
Confidence: 0.85
```

### Example 2: Zambia-Specific → Custom RAG

```
Query: "Malaria prevalence in Zambia 2024"
Strategy: custom
Reasoning: Query is Zambia-specific
Confidence: 0.90
```

### Example 3: Complex Query → Hybrid

```
Query: "Compare malaria treatment protocols in Zambia versus WHO guidelines"
Strategy: hybrid
Reasoning: Complex query benefits from multiple sources
Confidence: 0.80
```

### Example 4: Image Query → Custom RAG

```
Query: "Show me the diagnostic flowchart for TB"
Strategy: custom
Reasoning: Query requires visual/image content
Confidence: 0.90
```

## Fallback Behavior

If the primary strategy fails, the system automatically tries:

1. **Vertex failed** → Try Custom RAG (reduce confidence by 30%)
2. **Custom failed** → Try Vertex RAG (reduce confidence by 30%)
3. **Hybrid failed** → Try Custom RAG only (reduce confidence by 40%)
4. **All failed** → Return helpful error message

## Monitoring

### Check System Health

```bash
curl http://localhost:5001/umoyo-health-hub/us-central1/api/trpc/rag.healthCheck
```

### View Logs

```bash
# Local emulator
firebase emulators:start --only functions

# Production
firebase functions:log --only api
```

### Metrics to Monitor

- **Strategy distribution**: How often each strategy is used
- **Fallback rate**: How often fallbacks are triggered
- **Processing time**: Average response time per strategy
- **Confidence scores**: Average confidence by strategy
- **Error rates**: Failures by system

## Cost Optimization

### Vertex AI RAG Costs

- **Storage**: ~$0.10 per GB per month
- **Queries**: ~$0.25 per 1,000 queries
- **Document processing**: ~$0.50 per 1,000 pages

### Custom RAG Costs

- **Firestore**: Pay per read/write
- **Embeddings**: ~$0.025 per 1,000 tokens
- **Storage**: Minimal

### Optimization Tips

1. Use **Custom RAG** for Zambia-specific queries (cheaper)
2. Use **Vertex RAG** for general queries (better quality)
3. Cache frequently asked questions
4. Set appropriate `similarityTopK` limits

## Troubleshooting

### "RAG corpus not initialized"

Set the corpus ID:

```typescript
const vertexRAG = new VertexRAGService();
vertexRAG.setCorpusId(process.env.VERTEX_RAG_CORPUS_ID);
```

### "Both RAG systems failed"

Check:
1. Firestore has indexed documents
2. Vertex RAG corpus is ready
3. Authentication is configured
4. Network connectivity

### Low confidence scores

- Add more relevant documents to corpus
- Improve chunking strategy
- Use hybrid mode for better coverage

## Future Enhancements

- [ ] Caching layer for frequent queries
- [ ] A/B testing framework
- [ ] User feedback loop
- [ ] Query rewriting for better retrieval
- [ ] Multi-turn conversation support
- [ ] Streaming responses
- [ ] Analytics dashboard

## References

- [Vertex AI RAG Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/rag-overview)
- [Firestore Vector Search](https://firebase.google.com/docs/firestore)
- [Gemini API](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)

