
import { RAGIngestionPipeline } from '../pipeline/rag-ingestion-pipeline';
import type { MedicalDocument } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

async function runRAGPipeline() {
  console.log('🏥 Starting Umoyo Health Hub RAG Ingestion Pipeline\n');

  const pipeline = new RAGIngestionPipeline();

  // Load document metadata
  const metadataPath = './data/documents-metadata.json';
  const metadataContent = await fs.readFile(metadataPath, 'utf-8');
  const documents: MedicalDocument[] = JSON.parse(metadataContent);

  console.log(`📚 Loaded ${documents.length} documents\n`);

  // Prepare documents with their PDF paths
  const documentsToProcess = documents
    .filter(doc => doc.localPath) // Only process downloaded docs
    .map(doc => ({
      document: doc,
      pdfPath: doc.localPath!
    }));

  console.log(`✅ ${documentsToProcess.length} documents ready for processing\n`);

  // Run the pipeline
  await pipeline.processDocumentsBatch(documentsToProcess);

  console.log('\n🎉 RAG Pipeline Complete!');
  console.log('   Your medical knowledge is now indexed and searchable.');
}

// Run the pipeline
runRAGPipeline().catch(error => {
  console.error('❌ Pipeline failed:', error);
  process.exit(1);
});
