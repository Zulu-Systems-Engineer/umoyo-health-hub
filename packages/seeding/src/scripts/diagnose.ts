import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { PredictionServiceClient } from '@google-cloud/aiplatform';

async function diagnose() {
  console.log('🏥 Umoyo Health Hub - System Diagnostic\n');
  console.log('='.repeat(60));

  const projectId = process.env.GCP_PROJECT_ID || 'umoyo-health-hub';
  let passed = 0;
  let failed = 0;

  // Test 1: Project ID
  console.log('\n1️⃣ Project Configuration');
  console.log(`   Project ID: ${projectId}`);
  passed++;

  // Test 2: Authentication
  console.log('\n2️⃣ Testing Authentication...');
  try {
    const { execSync } = require('child_process');
    execSync('gcloud auth application-default print-access-token', { stdio: 'pipe' });
    console.log('   ✅ Authentication working');
    passed++;
  } catch (error) {
    console.log('   ❌ Authentication failed');
    console.log('   Fix: Run "gcloud auth application-default login"');
    failed++;
  }

  // Test 3: Firestore
  console.log('\n3️⃣ Testing Firestore...');
  try {
    const firestore = new Firestore({ projectId });
    await firestore.collection('_diagnostic').doc('test').set({ test: true });
    await firestore.collection('_diagnostic').doc('test').delete();
    console.log('   ✅ Firestore working');
    passed++;
  } catch (error: any) {
    console.log('   ❌ Firestore failed:', error.message);
    console.log('   Fix: Initialize Firestore in Firebase Console');
    failed++;
  }

  // Test 4: Cloud Storage
  console.log('\n4️⃣ Testing Cloud Storage...');
  try {
    const storage = new Storage({ projectId });
    const [buckets] = await storage.getBuckets();
    console.log(`   ✅ Storage working (${buckets.length} buckets found)`);
    passed++;
  } catch (error: any) {
    console.log('   ❌ Storage failed:', error.message);
    failed++;
  }

  // Test 5: Vertex AI
  console.log('\n5️⃣ Testing Vertex AI...');
  try {
    const client = new PredictionServiceClient();
    console.log('   ✅ Vertex AI client initialized');
    passed++;
  } catch (error: any) {
    console.log('   ❌ Vertex AI failed:', error.message);
    failed++;
  }

  // Test 6: Check for existing vector chunks
  console.log('\n6️⃣ Checking Vector Database...');
  try {
    const firestore = new Firestore({ projectId });
    const snapshot = await firestore.collection('vectorChunks').limit(1).get();
    const metadata = await firestore.collection('vectorDB').doc('metadata').get();
    
    if (metadata.exists) {
      const data = metadata.data();
      console.log('   ✅ Vector DB exists');
      console.log(`      - Documents: ${data?.totalDocuments || 0}`);
      console.log(`      - Chunks: ${data?.totalChunks || 0}`);
      console.log(`      - Model: ${data?.embeddingModel || 'unknown'}`);
    } else {
      console.log('   ⚠️  Vector DB empty (run RAG pipeline)');
    }
    passed++;
  } catch (error: any) {
    console.log('   ❌ Vector DB check failed:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Diagnostic Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All systems operational!');
    console.log('\nNext steps:');
    console.log('   1. Run: pnpm run pipeline (download PDFs)');
    console.log('   2. Run: pnpm run rag-pipeline (index documents)');
    console.log('   3. Run: pnpm run test-search (test search)');
  } else {
    console.log('\n⚠️  Please fix the failed tests above');
  }
}

diagnose().catch(console.error);

