import { PubMedService } from '../services/pubmed.service';

async function testPubMed() {
  console.log('🧪 Testing PubMed API integration...\n');
  
  const pubmedService = new PubMedService();
  
  // Test search
  console.log('1. Testing search...');
  const pmids = await pubmedService.searchArticles('malaria treatment zambia', 5);
  console.log(`   Found ${pmids.length} articles\n`);
  
  if (pmids.length > 0) {
    // Test fetch details
    console.log('2. Testing fetch details...');
    const articles = await pubmedService.fetchArticleDetails(pmids);
    console.log(`   Retrieved ${articles.length} article details\n`);
    
    // Display first article
    if (articles.length > 0) {
      console.log('📄 Sample Article:');
      console.log(`   Title: ${articles[0].title}`);
      console.log(`   Journal: ${articles[0].journal}`);
      console.log(`   Date: ${articles[0].publicationDate}`);
      console.log(`   PMID: ${articles[0].pmid}`);
      console.log(`   PMC ID: ${articles[0].pmcId || 'N/A'}`);
    }
  }
  
  console.log('\n✅ PubMed test complete!');
}

testPubMed().catch(console.error);
