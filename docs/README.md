# Umoyo Health Hub

**At the Heart of Zambian Healthcare**

A RAG-powered healthcare knowledge system that enables healthcare professionals and patients in Zambia to access reliable medical information, treatment protocols, and diagnostic support.

## Project Overview

Umoyo Health Hub is a clinical decision support system with medical knowledge retrieval capabilities, built with:

- **React + Vite** for the frontend
- **Firebase Cloud Functions (Gen 2)** for the backend
- **tRPC** for type-safe API communication
- **Google Cloud Vertex AI RAG** for knowledge retrieval
- **Gemini 2.0/2.5** for natural language generation
- **TypeScript** (strict mode) throughout

## Project Structure

```
umoyo-health-hub/
├── apps/
│   └── web/              # React frontend application
├── functions/            # Firebase Cloud Functions (tRPC backend)
├── packages/
│   ├── shared/           # Shared TypeScript types and Zod schemas
│   └── seeding/          # Data ingestion scripts
└── docs/                 # Documentation
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Firebase CLI
- Google Cloud SDK (for RAG setup)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd umoyo-health-hub
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `.firebaserc.example` to `.firebaserc` and configure your Firebase project
   - Create `.env` files in `apps/web` and `functions/` directories
   - See `.env.example` files for required variables

4. Start development servers:
   ```bash
   # Start frontend dev server
   pnpm --filter @umoyo/web dev
   
   # Start Firebase emulators
   pnpm --filter @umoyo/functions dev
   ```

## Development

### Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages
- `pnpm lint` - Run linter on all packages
- `pnpm test` - Run tests (when implemented)
- `pnpm format` - Format code with Prettier

### Package-Specific Scripts

**Frontend (`apps/web`):**
- `pnpm --filter @umoyo/web dev` - Start Vite dev server
- `pnpm --filter @umoyo/web build` - Build for production
- `pnpm --filter @umoyo/web lint` - Run ESLint

**Backend (`functions`):**
- `pnpm --filter @umoyo/functions dev` - Start Firebase emulators
- `pnpm --filter @umoyo/functions build` - Compile TypeScript
- `pnpm --filter @umoyo/functions deploy` - Deploy to Firebase

**Shared (`packages/shared`):**
- `pnpm --filter @umoyo/shared typecheck` - Type check only

**Seeding (`packages/seeding`):**
- `pnpm --filter @umoyo/seeding ingest-pdfs` - Run PDF ingestion
- `pnpm --filter @umoyo/seeding create-corpus` - Create RAG corpus
- `pnpm --filter @umoyo/seeding pubmed-ingestion` - Ingest from PubMed

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **State Management:** TanStack Query
- **Forms:** React Hook Form + Zod
- **Backend:** Firebase Cloud Functions (Gen 2), tRPC
- **Database:** Firestore
- **Storage:** Google Cloud Storage
- **RAG:** Google Cloud Vertex AI RAG
- **LLM:** Google Gemini 2.0 Flash / 2.5 Pro
- **Auth:** Firebase Authentication
- **Deployment:** Firebase Hosting + Cloud Functions
- **CI/CD:** GitHub Actions + Turborepo

## Documentation

See the `docs/` directory for detailed documentation:
- `technical-design-doc.md` - Technical architecture details
- `rag-guide.md` - RAG implementation guide
- `data-sources.md` - Data sources and ingestion
- `api-documentation.md` - API reference

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and type checking: `pnpm lint && pnpm typecheck`
4. Submit a pull request

## License

[Add license information]

## Authors

- ZULU BERNARD
- ALIYON TEMBO

