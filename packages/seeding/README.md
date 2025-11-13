# Umoyo Health Hub - Data Ingestion Pipeline

This package handles downloading, processing, and ingesting medical documents into the Umoyo Health Hub RAG system.

## 📋 Prerequisites

1. **Google Cloud Project** set up with billing enabled
2. **APIs enabled** (run the setup script from the main README)
3. **Service Account** with appropriate permissions
4. **Cloud Storage buckets** created:
   - `umoyo-health-pdfs`
   - `umoyo-health-api-data`
   - `umoyo-health-rag-logs`

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd packages/seeding
pnpm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your project details
```

### 3. Authenticate with Google Cloud

You can authenticate in one of two ways:

**Option A: Using Service Account Key (Recommended for CI/CD)**
```bash
# Set the environment variable
export GOOGLE_APPLICATION_CREDENTIALS="path/to/umoyo-rag-ingestion-key.json"

# Or in PowerShell:
$env:GOOGLE_APPLICATION_CREDENTIALS="$(Get-Location)\..\..\\.keys\umoyo-rag-ingestion-key.json"
```

**Option B: Using Application Default Credentials**
```bash
gcloud auth application-default login
```

The service will automatically detect and use whichever method is available.

### 4. Run the Complete Pipeline

```bash
pnpm run pipeline
```

This will:
- ✅ Download WHO guidelines and PubMed articles
- ✅ Upload to Google Cloud Storage
- ✅ Create RAG corpus in Vertex AI
- ✅ Ingest all documents into RAG Engine

**Estimated time:** 30-45 minutes

## 🧪 Testing Individual Components

### Test PubMed API

```bash
pnpm run test-pubmed
```

### Download Documents Only

```bash
pnpm run download-only
```

### Create RAG Corpus Only

```bash
pnpm run create-corpus
```

## 📁 Directory Structure

```
packages/seeding/
├── src/
│   ├── config/
│   │   └── data-sources.ts       # Document sources configuration
│   ├── services/
│   │   ├── download.service.ts   # File download logic
│   │   ├── gcs.service.ts        # Google Cloud Storage uploads
│   │   ├── pubmed.service.ts     # PubMed API integration
│   │   └── rag.service.ts        # RAG Engine integration
│   ├── pipeline/
│   │   └── ingestion-pipeline.ts # Main orchestration
│   ├── scripts/
│   │   ├── download-only.ts      # Standalone download script
│   │   ├── test-pubmed.ts        # Test PubMed connection
│   │   └── create-corpus.ts      # Create RAG corpus
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── index.ts                  # Entry point
├── data/                         # Generated data (gitignored)
│   ├── downloads/                # Downloaded PDFs
│   ├── document-list.json        # Document catalog
│   └── documents-metadata.json   # Metadata file
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Adding New Document Sources

Edit `src/config/data-sources.ts`:

```typescript
export const WHO_GUIDELINES: Partial<MedicalDocument>[] = [
  {
    title: 'Your New Guideline',
    source: 'WHO',
    category: 'clinical-guideline',
    url: 'https://who.int/...',
    metadata: {
      audience: 'healthcare-professional',
      language: 'en',
      region: 'zambia',
      topics: ['topic1', 'topic2'],
      lastUpdated: new Date().toISOString()
    }
  },
  // ... existing guidelines
];
```

### Adding PubMed Search Queries

```typescript
export const PUBMED_SEARCH_QUERIES = [
  'malaria treatment zambia',
  'your new search query',
  // ... existing queries
];
```

## 🐛 Troubleshooting

### Issue: "Permission denied" when uploading to GCS

**Solution:**

```bash
# Make sure you're authenticated
gcloud auth application-default login

# Verify service account has Storage Object Admin role
gcloud projects add-iam-policy-binding umoyo-health-hub \
  --member="serviceAccount:umoyo-rag@umoyo-health-hub.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Issue: Download fails with timeout

**Solution:**

- Increase timeout in `download.service.ts`
- Check your internet connection
- Try downloading individual files with `pnpm run download-only`

### Issue: RAG corpus creation fails

**Solution:**

```bash
# Verify Vertex AI API is enabled
gcloud services enable aiplatform.googleapis.com
gcloud services enable discoveryengine.googleapis.com

# Check you have the right permissions
gcloud projects add-iam-policy-binding umoyo-health-hub \
  --member="user:your-email@gmail.com" \
  --role="roles/aiplatform.admin"
```

## 📊 Monitoring

### Check Upload Status

```bash
# List files in GCS bucket
gsutil ls -r gs://umoyo-health-pdfs/

# Check total size
gsutil du -sh gs://umoyo-health-pdfs/
```

### Check RAG Corpus Status

```bash
# List operations
gcloud ai operations list --region=us-central1

# Check specific operation
gcloud ai operations describe OPERATION_ID --region=us-central1
```

## 🔄 Re-running the Pipeline

The pipeline is idempotent - it will skip files that already exist:

```bash
# Safe to run multiple times
pnpm run pipeline
```

To force re-download:

```bash
# Delete local downloads
pnpm run clean

# Delete GCS files (CAREFUL!)
gsutil -m rm -r gs://umoyo-health-pdfs/**

# Re-run pipeline
pnpm run pipeline
```

## 📈 Performance

- **WHO guidelines download:** ~5-10 minutes (depends on file sizes)
- **PubMed article fetching:** ~5 minutes (API rate limited)
- **GCS upload:** ~5-10 minutes
- **RAG ingestion:** ~15-30 minutes (runs asynchronously)

**Total:** 30-45 minutes for ~50-100 documents

## 🎯 Next Steps

After running this pipeline:

1. ✅ Verify documents in GCS: `gsutil ls gs://umoyo-health-pdfs/`
2. ✅ Check RAG corpus status in Google Cloud Console
3. ✅ Proceed to Phase 3: RAG Service Integration
4. ✅ Test queries against your corpus

## 📚 Resources

- [Vertex AI RAG Engine Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/rag-overview)
- [PubMed E-utilities API](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [WHO Publications](https://www.who.int/publications)

---

**Need help?** Open an issue on GitHub or check the main project README.

