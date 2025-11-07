# Umoyo Health Hub - RAG Implementation Plan
By
ZULU BERNARD
AND
ALIYON TEMBO

## Project Overview
* **Application Name:** Umoyo Health Hub
* **Tagline:** "At the Heart of Zambian Healthcare"
* **Target Users:** Healthcare professionals AND patients in Zambia
* **Core Purpose:** Clinical decision support system with medical knowledge retrieval

## 1. EXECUTIVE SUMMARY
Umoyohealth-hub will be a RAG-powered healthcare knowledge system that enables:
* **For Healthcare Professionals:** Query medical literature, treatment protocols, drug interactions, and diagnostic support
* **For Patients:** Access reliable health information, symptom guidance, and treatment explanations in accessible language

**Key Differentiator:** Context-aware responses that understand Zambian healthcare context (disease prevalence, available medications, local healthcare infrastructure).

## 2. DATA SOURCES & CONTENT STRATEGY

### 2.1 Primary Data Sources (PDFs - Static Corpus)

| Source Type | Description | Volume Estimate | Update Frequency |
| :--- | :--- | :--- | :--- |
| WHO Guidelines | Disease management protocols, treatment guidelines | 500-1000 PDFs | Quarterly |
| Zambian MoH Protocols | National treatment guidelines, essential medicines list | 100-300 PDFs | Annually |
| Medical Textbooks | Core medical reference materials (public domain) | 50-100 PDFs | Rarely |
| Drug Formularies | Medication information, interactions, dosing | 200-500 PDFs | Monthly |
| Disease Fact Sheets | Malaria, TB, HIV, maternal health resources | 300-500 PDFS | Quarterly |

**Total Corpus Size:** ~2,000-3,000 documents

### 2.2 Live Data Sources (API Integration)

| API Source | Purpose | Update Pattern | Priority |
| :--- | :--- | :--- | :--- |
| PubMed API | Latest medical research papers | Real-time | High |
| OpenFDA Drug API | Drug safety alerts, recalls | Real-time | High |
| WHO Disease Outbreak News | Current health alerts | Daily | Medium |
| Local Hospital Protocols API* | Facility-specific guidelines | Real-time | Future Phase |

*Note: May need to build custom endpoints for local data

### 2.3 Content Preparation Workflow
1.  PDF Collection 2. Quality Review 3. Metadata Tagging 4. GCS Upload 5. RAG Ingestion

**Metadata Tags for Each Document:**
* `category`: clinical-guideline | drug-info | disease-reference | patient-education
* `language`: en | ny (Nyanja) | bem (Bemba) - for future multilingual support
* `audience`: healthcare-professional | patient | both
* `region`: zambia | southern-africa | global
* `last_updated`: ISO date

## 3. TECHNICAL ARCHITECTURE

### 3.1 Tech Stack (Aligned with Golden Path)
* **Frontend:** React + Vite + shadcn/ui + Tailwind
* **Backend:** Firebase Cloud Functions (Gen 2)
* **Language:** TypeScript (strict mode)
* **State Management:** TanStack Query
* **Forms:** React Hook Form + Zod
* **API Layer:** tRPC (typed RPC)
* **RAG Engine:** Google Cloud Vertex AI RAG
* **Vector Database:** Managed by RAG Engine
* **LLM:** Gemini 2.0 Flash (initial) / Gemini 2.5 Pro (production)
* **Auth:** Firebase Authentication
* **Database:** Firestore (user data, chat history)
* **Storage:** Google Cloud Storage (PDF corpus)
* **Deployment:** Firebase Hosting + Cloud Functions
* **CI/CD:** GitHub Actions + Turborepo

moyohealth-hub/ ├── apps/ │ └── web/ # React frontend │ ├── src/ │ │ ├── components/ │ │ │ ├── chat/ # Chat interface │ │ │ ├── search/ # Search UI │ │ │ └── ui/ # shadcn components │ │ ├── hooks/ │ │ ├── lib/ │ │ │ ├── trpc.ts # tRPC client setup │ │ │ └── firebase.ts # Firebase client config │ │ ├── pages/ │ │ └── .storybook/ │ └── package.json └── functions/ # Cloud Functions (tRPC backend) ├── src/ │ ├── routers/ │ │ ├── chat.router.ts │ │ ├── search.router.ts │ │ └── user.router.ts │ ├── services/ │ │ ├── rag.service.ts # RAG Engine integration │ │ ├── pubmed.service.ts # PubMed API wrapper │ │ └── gemini.service.ts # Gemini model calls │ ├── middleware/ │ │ └── auth.middleware.ts │ └── index.ts └── package.json └── packages/ ├── shared/ # Shared utilities │ └── src/ │ ├── schemas/ # Zod validation schemas │ ├── types/ │ └── utils/ │ └── package.json ├── seeding/ # Data ingestion scripts │ └── src/ │ ├── ingest-pdfs.ts │ ├── create-corpus.ts │ └── pubmed-ingestion.ts │ └── package.json └── docs/ ├── technical-design-doc.md ├── rag-guide.md # RAG implementation details ├── data-sources.md └── api-documentation.md └── .github/ └── workflows/ ├── ci.yml └── deploy.yml └── pnpm-workspace.yaml └── turbo.json └── package.json

