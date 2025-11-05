import { ChunkingService } from '../services/chunking.service';
import { EmbeddingService } from '../services/embedding.service';
import { FirestoreVectorService } from '../services/firestore-vector.service';
import { OCRService } from '../services/ocr.service';
import { VectorChunk } from '@umoyo/shared';
import type { MedicalDocument } from '../types';
import * as fs from 'fs/promises';

export class RAGIngestionPipeline {
  private chunkingService: ChunkingService;
  private embeddingService: EmbeddingService;
  private vectorService: FirestoreVectorService;
  private ocrService: OCRService;

  constructor() {
    this.chunkingService = new ChunkingService(512, 50);
    this.embeddingService = new EmbeddingService();
    this.vectorService = new FirestoreVectorService();
    this.ocrService = new OCRService();
    
    // Wire up OCR service for fallback when PDF parsing fails
    this.chunkingService.setOCRService(this.ocrService);
  }

  /**
   * Process a single document through the complete pipeline
   */
  async processDocument(
    document: MedicalDocument, 
    pdfPath: string
  ): Promise<number> {
    console.log(`\n📄 Processing: ${document.title}`);

    // Step 1: Extract text from PDF
    console.log('  1️⃣ Extracting text...');
    const textContent = await this.chunkingService.extractTextFromPDF(pdfPath);
    
    if (!textContent || textContent.length < 100) {
      console.log('  ⚠️  Insufficient text content, skipping');
      return 0;
    }

    // Step 2: Chunk the text
    console.log('  2️⃣ Chunking text...');
    const preparedChunks = this.chunkingService.prepareDocumentChunks(
      document,
      textContent
    );
    console.log(`     Created ${preparedChunks.length} chunks`);

    // Step 3: Generate embeddings
    console.log('  3️⃣ Generating embeddings...');
    const texts = preparedChunks.map(c => c.content);
    const embeddings = await this.embeddingService.generateEmbeddingsBatch(texts);

    // Step 4: Combine chunks with embeddings
    const vectorChunks: VectorChunk[] = preparedChunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
      embeddingDim: this.embeddingService.getDimensions()
    }));

    // Step 5: Upsert to Firestore
    console.log('  4️⃣ Storing in Firestore...');
    await this.vectorService.upsertChunksBatch(vectorChunks);

    console.log(`  ✅ Completed: ${vectorChunks.length} chunks indexed`);
    
    return vectorChunks.length;
  }

  /**
   * Process multiple documents
   */
  async processDocumentsBatch(
    documents: Array<{ document: MedicalDocument; pdfPath: string }>
  ): Promise<void> {
    console.log(`\n🚀 Processing ${documents.length} documents...`);
    
    let totalChunks = 0;
    let successfulDocs = 0;

    for (const { document, pdfPath } of documents) {
      try {
        const chunksCreated = await this.processDocument(document, pdfPath);
        totalChunks += chunksCreated;
        successfulDocs++;

        // Rate limiting - be nice to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to process ${document.title}:`, error);
      }
    }

    // Update metadata
    console.log('\n📊 Updating vector database metadata...');
    const metadata = await this.vectorService.getMetadata();
    
    await this.vectorService.updateMetadata({
      version: 1,
      embeddingModel: 'text-embedding-005',
      dimensions: 768,
      totalDocuments: (metadata?.totalDocuments || 0) + successfulDocs,
      totalChunks: (metadata?.totalChunks || 0) + totalChunks,
      updatedAt: Date.now()
    });

    console.log('\n✅ RAG Ingestion Pipeline Complete!');
    console.log(`   Documents processed: ${successfulDocs}/${documents.length}`);
    console.log(`   Total chunks created: ${totalChunks}`);
  }
}
