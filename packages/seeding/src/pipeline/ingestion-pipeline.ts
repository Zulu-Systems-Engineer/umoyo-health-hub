import { MedicalDocument, IngestionJob } from '../types';
import { DownloadService } from '../services/download.service';
import { GCSService } from '../services/gcs.service';
import { RAGService } from '../services/rag.service';
import { PubMedService } from '../services/pubmed.service';
import { WHO_GUIDELINES, PUBMED_SEARCH_QUERIES } from '../config/data-sources';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';

export class IngestionPipeline {
  private downloadService: DownloadService;
  private gcsService: GCSService;
  private ragService: RAGService;
  private pubmedService: PubMedService;
  private job: IngestionJob;

  constructor() {
    this.downloadService = new DownloadService();
    this.gcsService = new GCSService();
    this.ragService = new RAGService();
    this.pubmedService = new PubMedService();
    
    this.job = {
      jobId: uuidv4(),
      status: 'pending',
      totalDocuments: 0,
      processedDocuments: 0,
      failedDocuments: 0,
      startTime: new Date(),
      errors: []
    };
  }

  async prepareMedicalDocuments(): Promise<MedicalDocument[]> {
    console.log('\n📚 Preparing medical documents list...\n');
    
    const documents: MedicalDocument[] = [];

    // 1. Add WHO Guidelines
    console.log('📋 Adding WHO guidelines...');
    WHO_GUIDELINES.forEach(partial => {
      documents.push({
        id: uuidv4(),
        ...partial,
      } as MedicalDocument);
    });
    console.log(`   ✅ Added ${WHO_GUIDELINES.length} WHO guidelines`);

    // 2. Fetch PubMed articles
    console.log('\n📋 Fetching PubMed articles...');
    const pubmedDocs = await this.pubmedService.fetchAllArticles(PUBMED_SEARCH_QUERIES);
    documents.push(...pubmedDocs);
    console.log(`   ✅ Added ${pubmedDocs.length} PubMed articles`);

    this.job.totalDocuments = documents.length;
    
    // Save document list for reference
    await fs.writeFile(
      './data/document-list.json',
      JSON.stringify(documents, null, 2)
    );

    console.log(`\n✅ Total documents prepared: ${documents.length}\n`);
    
    return documents;
  }

  async executeFullPipeline(): Promise<IngestionJob> {
    console.log('🚀 Starting Umoyo Health Hub Data Ingestion Pipeline\n');
    console.log('='.repeat(70));
    
    this.job.status = 'downloading';

    try {
      // STEP 1: Prepare document list
      console.log('\n📝 STEP 1: Preparing document list...');
      const documents = await this.prepareMedicalDocuments();

      // STEP 2: Download documents
      console.log('\n📥 STEP 2: Downloading documents...');
      this.job.status = 'downloading';
      
      const downloadedFiles = await this.downloadService.downloadBatch(documents);
      console.log(`\n✅ Downloaded ${downloadedFiles.size}/${documents.length} documents`);

      // Update document paths
      documents.forEach(doc => {
        const localPath = downloadedFiles.get(doc.id);
        if (localPath) {
          doc.localPath = localPath;
          this.job.processedDocuments++;
        } else {
          this.job.failedDocuments++;
          this.job.errors.push({
            documentId: doc.id,
            error: 'Download failed'
          });
        }
      });

      // STEP 3: Upload to Google Cloud Storage
      console.log('\n☁️  STEP 3: Uploading to Google Cloud Storage...');
      this.job.status = 'uploading';
      
      const uploadedPaths = await this.gcsService.uploadBatch(downloadedFiles);
      console.log(`\n✅ Uploaded ${uploadedPaths.size} documents to GCS`);

      // Update document GCS paths
      documents.forEach(doc => {
        const gcsPath = uploadedPaths.get(doc.id);
        if (gcsPath) {
          doc.gcsPath = gcsPath;
        }
      });

      // Upload metadata file
      await this.gcsService.createMetadataFile(documents);

      // STEP 4: Create RAG Corpus
      console.log('\n🏗️  STEP 4: Creating RAG corpus...');
      const corpusId = await this.ragService.createCorpus(
        'Umoyo Health Medical Knowledge',
        'Comprehensive medical knowledge base for Zambian healthcare including WHO guidelines, research papers, and clinical protocols'
      );

      // STEP 5: Import files into RAG Engine
      console.log('\n📥 STEP 5: Importing files into RAG Engine...');
      const importOperation = await this.ragService.importFiles(
        corpusId,
        'gs://umoyo-health-pdfs/**/*.pdf'
      );

      console.log('\n⏳ Waiting for RAG import to complete...');
      console.log('   This may take 15-30 minutes. You can safely exit and check status later.');
      
      // Optional: Wait for completion (can be skipped in dev)
      // await this.ragService.waitForImportCompletion(importOperation);

      // Mark job as completed
      this.job.status = 'completed';
      this.job.endTime = new Date();

      // Generate summary
      this.printJobSummary();

      return this.job;

    } catch (error) {
      this.job.status = 'failed';
      this.job.endTime = new Date();
      console.error('\n❌ Pipeline failed:', error);
      throw error;
    }
  }

  private printJobSummary(): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 INGESTION PIPELINE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Job ID: ${this.job.jobId}`);
    console.log(`Status: ${this.job.status}`);
    console.log(`Total Documents: ${this.job.totalDocuments}`);
    console.log(`Processed: ${this.job.processedDocuments}`);
    console.log(`Failed: ${this.job.failedDocuments}`);
    console.log(`Duration: ${((this.job.endTime!.getTime() - this.job.startTime.getTime()) / 1000 / 60).toFixed(2)} minutes`);
    
    if (this.job.errors.length > 0) {
      console.log(`\n⚠️  Errors (${this.job.errors.length}):`);
      this.job.errors.forEach(error => {
        console.log(`   - ${error.documentId}: ${error.error}`);
      });
    }
    
    console.log('\n✅ Pipeline completed successfully!');
    console.log('='.repeat(70) + '\n');
  }
}
