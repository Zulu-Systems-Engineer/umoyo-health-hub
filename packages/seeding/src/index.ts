import { IngestionPipeline } from './pipeline/ingestion-pipeline';

async function main() {
  console.clear();
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              UMOYO HEALTH HUB - DATA INGESTION PIPELINE          ║
║                                                                   ║
║  This pipeline will:                                             ║
║  1. Download medical documents from WHO, PubMed, and other       ║
║     authoritative sources                                        ║
║  2. Upload them to Google Cloud Storage                          ║
║  3. Create a RAG corpus in Vertex AI                             ║
║  4. Ingest all documents into the RAG Engine                     ║
║                                                                   ║
║  Estimated time: 30-45 minutes                                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);

  const pipeline = new IngestionPipeline();
  
  try {
    await pipeline.executeFullPipeline();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the pipeline
main();
