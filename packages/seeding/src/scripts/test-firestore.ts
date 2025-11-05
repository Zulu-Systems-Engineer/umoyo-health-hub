import { Firestore } from '@google-cloud/firestore';

async function testFirestore() {
  console.log('🔍 Testing Firestore Connection...\n');

  try {
    const firestore = new Firestore({
      projectId: process.env.GCP_PROJECT_ID || 'umoyo-health-hub'
    });

    // Test write
    console.log('1️⃣ Testing write...');
    await firestore.collection('test').doc('test-doc').set({
      message: 'Test from Umoyo Health Hub',
      timestamp: Date.now()
    });
    console.log('   ✅ Write successful');

    // Test read
    console.log('\n2️⃣ Testing read...');
    const doc = await firestore.collection('test').doc('test-doc').get();
    console.log('   ✅ Read successful:', doc.data());

    // Clean up
    console.log('\n3️⃣ Cleaning up...');
    await firestore.collection('test').doc('test-doc').delete();
    console.log('   ✅ Delete successful');

    console.log('\n✅ Firestore connection is working!');
  } catch (error) {
    console.error('\n❌ Firestore error:', error);
    console.error('\nPossible issues:');
    console.error('  1. Check authentication: gcloud auth application-default login');
    console.error('  2. Check Firestore is enabled in Firebase Console');
    console.error('  3. Check service account has permissions');
  }
}

testFirestore();

