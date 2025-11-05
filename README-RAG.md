# Umoyo Health Hub - RAG Pipeline Documentation

## Overview

This RAG (Retrieval-Augmented Generation) pipeline implements:

1. **Chunking** - Breaking documents into 512-character chunks with 50-character overlap

2. **Embedding** - Converting chunks to 768-dimensional vectors using text-embedding-005

3. **Indexing** - Storing vectors in Firestore for similarity search

4. **Retrieval** - Finding relevant chunks using cosine similarity

5. **Generation** - Using Gemini 2.0 Flash to generate answers with citations

## Architecture

```
User Query
    ↓
Generate Query Embedding (text-embedding-005)
    ↓
Search Firestore Vector Store (Cosine Similarity)
    ↓
Retrieve Top-K Similar Chunks
    ↓
Build Grounding Context
    ↓
Generate Answer with Gemini 2.0 Flash
    ↓
Return Answer + Citations
```

## Setup

### 1. Install Dependencies

```bash
cd packages/seeding
pnpm install

cd ../../functions
pnpm install
```

### 2. Authenticate

```bash
gcloud auth application-default login
```

### 3. Run Setup Script

**Windows:**

```powershell
.\scripts\setup-rag.ps1
```

**Linux/Mac:**

```bash
chmod +x scripts/setup-rag.sh
./scripts/setup-rag.sh
```

## Running the Pipeline

### Step 1: Download Medical Documents

```bash
cd packages/seeding

pnpm run pipeline  # Downloads PDFs from WHO, PubMed, etc.
```

### Step 2: Run RAG Ingestion

```bash
pnpm run rag-pipeline
```

This will:

- Extract text from PDFs

- Chunk into 512-character segments

- Generate embeddings for each chunk

- Store in Firestore with metadata

**Expected output:**

```
🏥 Starting Umoyo Health Hub RAG Ingestion Pipeline

📚 Loaded 47 documents

✅ 47 documents ready for processing

📄 Processing: WHO Guidelines for Malaria Treatment

  1️⃣ Extracting text...

  2️⃣ Chunking text...

     Created 234 chunks

  3️⃣ Generating embeddings...

  4️⃣ Storing in Firestore...

  ✅ Completed: 234 chunks indexed

...

✅ RAG Ingestion Pipeline Complete!

   Documents processed: 47/47

   Total chunks created: 10,523
```

### Step 3: Test Vector Search

```bash
pnpm run test-search
```

### Step 4: Deploy Cloud Functions

```bash
cd ../../functions

firebase deploy --only functions
```

## Testing

### Test Embedding Generation

```bash
cd packages/seeding

pnpm run test-embedding
```

### Test Vector Search

```bash
pnpm run test-search
```

### Test Full Query Flow

```bash
# Use the deployed Cloud Function

curl -X POST https://REGION-PROJECT_ID.cloudfunctions.net/ragQuery \

  -H "Content-Type: application/json" \

  -d '{"message": "How do you treat malaria?"}'
```

## Cost Optimization

### Firestore Vector Storage

- **Cost:** ~$0.18/GB/month storage + $0.06 per 100K reads

- **Optimization:** 

  - Use category filters to reduce search space

  - Implement caching for common queries

  - Consider Vertex AI Vector Search for >100K chunks

### Vertex AI Embeddings

- **Cost:** ~$0.025 per 1K characters

- **Optimization:**

  - Batch embedding calls (up to 250 texts per request)

  - Cache embeddings (hash content to avoid re-embedding)

  - Use 512-char chunks (balance between context and cost)

### Gemini API

- **Cost:** $0.15 per 1M input tokens, $0.60 per 1M output tokens

- **Optimization:**

  - Limit grounding context to top-5 chunks

  - Set max_output_tokens to 2000

  - Use Flash model for faster, cheaper responses

## Monitoring

### Check Vector Database Stats

```typescript
// In your app

const stats = await trpc.rag.getVectorStats.query();

console.log(stats);

// {

//   embeddingModel: 'text-embedding-005',

//   dimensions: 768,

//   totalDocuments: 47,

//   totalChunks: 10523,

//   updatedAt: 1735588888000

// }

```

### View Firestore Data

```bash
# List collections

firebase firestore:indexes

# Query vector chunks

firebase firestore:query vectorChunks --limit 10
```

## Troubleshooting

### Issue: "Could not load default credentials"

**Solution:**

```bash
gcloud auth application-default login
```

### Issue: Embedding API quota exceeded

**Solution:**

1. Check quotas: https://console.cloud.google.com/iam-admin/quotas

2. Request increase or implement rate limiting

3. Add delays between batches

### Issue: Firestore write quota exceeded

**Solution:**

```bash
# Increase batch delay in rag-ingestion-pipeline.ts

await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
```

### Issue: Poor search results

**Solution:**

1. Increase chunk size (try 768 or 1024 characters)

2. Increase overlap (try 100 characters)

3. Filter by category before searching

4. Increase top-K results (try 10 instead of 5)

## Next Steps

1. ✅ Complete RAG pipeline setup

2. ✅ Ingest medical documents

3. ⬜ Deploy Cloud Functions

4. ⬜ Build React frontend with chat interface

5. ⬜ Implement conversation history

6. ⬜ Add user authentication

7. ⬜ Monitor costs and optimize

## Resources

- [Vertex AI Embeddings](https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings)

- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

- [Gemini API Reference](https://ai.google.dev/docs)

- [Vector Search Best Practices](https://cloud.google.com/vertex-ai/docs/vector-search/overview)

