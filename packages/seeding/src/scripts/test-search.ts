import { FirestoreVectorService } from '../services/firestore-vector.service';
import { EmbeddingService } from '../services/embedding.service';

async function testSearch() {
  console.log('🔍 Testing Vector Search...\n');

  const vectorService = new FirestoreVectorService();
  const embeddingService = new EmbeddingService();

  // Get metadata
  console.log('1️⃣ Fetching vector database metadata...');
  const metadata = await vectorService.getMetadata();
  
  if (metadata) {
    console.log('   ✅ Vector Database Stats:');
    console.log(`      - Model: ${metadata.embeddingModel}`);
    console.log(`      - Dimensions: ${metadata.dimensions}`);
    console.log(`      - Documents: ${metadata.totalDocuments}`);
    console.log(`      - Chunks: ${metadata.totalChunks}`);
  } else {
    console.log('   ⚠️  No metadata found. Have you run the RAG pipeline yet?');
    return;
  }

  // Test search
  console.log('\n2️⃣ Testing similarity search...');
  const testQuery = 'How do you treat malaria?';
  console.log(`   Query: "${testQuery}"`);

  console.log('   Generating query embedding...');
  const queryEmbedding = await embeddingService.generateEmbedding(testQuery);

  console.log('   Searching for similar chunks...');
  const results = await vectorService.searchSimilar(queryEmbedding, 5);

  console.log(`\n   ✅ Found ${results.length} similar chunks:\n`);
  
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. Source: ${result.source}`);
    console.log(`      Similarity: ${(result.similarity * 100).toFixed(2)}%`);
    console.log(`      Content: ${result.content.substring(0, 100)}...`);
    console.log('');
  });

  console.log('✅ Vector search test complete!');
}

testSearch().catch(console.error);

