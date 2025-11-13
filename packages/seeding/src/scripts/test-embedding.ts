import { EmbeddingService } from '../services/embedding.service';

async function testEmbedding() {
  console.log('🧪 Testing Embedding Service...\n');

  const embeddingService = new EmbeddingService();

  // Test single embedding
  console.log('1️⃣ Testing single text embedding...');
  const testText = 'Malaria is a life-threatening disease caused by Plasmodium parasites transmitted through mosquito bites.';
  
  const embedding = await embeddingService.generateEmbedding(testText);
  
  console.log(`   ✅ Generated embedding with ${embedding.length} dimensions`);
  console.log(`   First 10 values: [${embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]`);

  // Test batch embedding
  console.log('\n2️⃣ Testing batch embeddings...');
  const texts = [
    'HIV is treated with antiretroviral therapy (ART).',
    'Tuberculosis is a bacterial infection affecting the lungs.',
    'Child malnutrition requires immediate medical attention.'
  ];

  const embeddings = await embeddingService.generateEmbeddingsBatch(texts);
  console.log(`   ✅ Generated ${embeddings.length} embeddings`);
  
  embeddings.forEach((emb, index) => {
    console.log(`   Text ${index + 1}: ${emb.length} dimensions`);
  });

  console.log('\n✅ Embedding service test complete!');
}

testEmbedding().catch(console.error);



