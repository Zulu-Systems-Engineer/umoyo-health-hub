# Data Sources & Content Strategy

## Primary Data Sources (PDFs - Static Corpus)

| Source Type | Description | Volume Estimate | Update Frequency |
| :--- | :--- | :--- | :--- |
| WHO Guidelines | Disease management protocols, treatment guidelines | 500-1000 PDFs | Quarterly |
| Zambian MoH Protocols | National treatment guidelines, essential medicines list | 100-300 PDFs | Annually |
| Medical Textbooks | Core medical reference materials (public domain) | 50-100 PDFs | Rarely |
| Drug Formularies | Medication information, interactions, dosing | 200-500 PDFs | Monthly |
| Disease Fact Sheets | Malaria, TB, HIV, maternal health resources | 300-500 PDFs | Quarterly |

**Total Corpus Size:** ~2,000-3,000 documents

## Live Data Sources (API Integration)

| API Source | Purpose | Update Pattern | Priority |
| :--- | :--- | :--- | :--- |
| PubMed API | Latest medical research papers | Real-time | High |
| OpenFDA Drug API | Drug safety alerts, recalls | Real-time | High |
| WHO Disease Outbreak News | Current health alerts | Daily | Medium |
| Local Hospital Protocols API* | Facility-specific guidelines | Real-time | Future Phase |

*Note: May need to build custom endpoints for local data

## Content Preparation Workflow

1. **PDF Collection**: Gather PDFs from sources
2. **Quality Review**: Validate content quality and relevance
3. **Metadata Tagging**: Add metadata tags (category, language, audience, region)
4. **GCS Upload**: Upload to Google Cloud Storage
5. **RAG Ingestion**: Process and add to RAG corpus

## Metadata Tags

Each document should have:
- `category`: clinical-guideline | drug-info | disease-reference | patient-education
- `language`: en | ny (Nyanja) | bem (Bemba) - for future multilingual support
- `audience`: healthcare-professional | patient | both
- `region`: zambia | southern-africa | global
- `last_updated`: ISO date

## Ingestion Scripts

See `packages/seeding/src/` for ingestion scripts:
- `ingest-pdfs.ts`: PDF ingestion pipeline
- `create-corpus.ts`: Corpus creation for Vertex AI RAG
- `pubmed-ingestion.ts`: PubMed API ingestion

