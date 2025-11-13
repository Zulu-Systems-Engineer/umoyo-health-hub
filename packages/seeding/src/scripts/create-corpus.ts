import { RAGService } from '../services/rag.service';

async function createCorpus() {
  console.log('🏗️  Creating RAG Corpus for Umoyo Health Hub...\n');
  
  const ragService = new RAGService();
  
  const corpusId = await ragService.createCorpus(
    'Umoyo Health Medical Knowledge',
    'Comprehensive medical knowledge base for Zambian healthcare including WHO guidelines, PubMed articles, and clinical protocols'
  );
  
  console.log('\n✅ Corpus created successfully!');
  console.log(`\nCorpus ID: ${corpusId}`);
  console.log('\n📝 Save this corpus ID to your .env file:');
  console.log(`RAG_CORPUS_ID=${corpusId}\n`);
}

createCorpus().catch(console.error);
