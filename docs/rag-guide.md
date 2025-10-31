# RAG Implementation Guide

## Overview

Umoyo Health Hub uses Google Cloud Vertex AI RAG for retrieval-augmented generation. The RAG system enables the application to query a large corpus of medical documents and generate context-aware responses.

## Architecture

### Components
1. **Corpus**: Collection of medical documents stored in Vertex AI
2. **RAG Service**: Backend service that queries the corpus
3. **Gemini Service**: Generates responses using retrieved context
4. **Data Ingestion**: Pipeline for adding new documents to the corpus

## Corpus Setup

### Creating the Corpus

Use the `packages/seeding` scripts to create and manage the corpus:

```bash
# Create corpus
pnpm --filter @umoyo/seeding create-corpus

# Ingest PDFs
pnpm --filter @umoyo/seeding ingest-pdfs

# Ingest from PubMed
pnpm --filter @umoyo/seeding pubmed-ingestion
```

### Document Metadata

Each document in the corpus should have metadata tags:
- `category`: clinical-guideline | drug-info | disease-reference | patient-education
- `language`: en | ny (Nyanja) | bem (Bemba)
- `audience`: healthcare-professional | patient | both
- `region`: zambia | southern-africa | global
- `last_updated`: ISO date string

## Query Flow

1. **User Query**: User submits a medical question
2. **RAG Search**: System searches corpus for relevant documents
3. **Context Retrieval**: Top relevant excerpts retrieved
4. **Response Generation**: Gemini generates response using context
5. **Source Attribution**: Sources included in response

## Implementation Status

Currently, the RAG service is a stub. To implement:

1. Initialize Vertex AI client in `functions/src/services/rag.service.ts`
2. Implement corpus query methods
3. Integrate with Gemini service for response generation
4. Set up corpus ingestion pipeline

## Configuration

Set the following environment variables:
- `GCP_PROJECT_ID`: Google Cloud project ID
- `GCP_LOCATION`: Region (default: us-central1)
- `RAG_CORPUS_NAME`: Name of the RAG corpus

## Data Sources

See `docs/data-sources.md` for information about data sources and ingestion.

