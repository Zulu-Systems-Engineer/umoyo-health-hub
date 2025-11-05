#!/bin/bash

echo "🏥 Setting up Umoyo Health Hub RAG Pipeline"
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
cd packages/seeding
pnpm install

cd ../../functions
pnpm install

cd ../..

# 2. Initialize Firestore
echo "🔥 Initializing Firestore..."
firebase firestore:indexes firestore.indexes.json

# 3. Deploy Firestore rules
echo "🔐 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# 4. Test authentication
echo "🔑 Testing authentication..."
gcloud auth application-default print-access-token > /dev/null
if [ $? -eq 0 ]; then
  echo "   ✅ Authentication configured"
else
  echo "   ❌ Authentication not configured"
  echo "   Run: gcloud auth application-default login"
  exit 1
fi

# 5. Test embedding service
echo "🧪 Testing embedding service..."
cd packages/seeding
pnpm run test-embedding

# 6. Ready message
echo ""
echo "✅ RAG Pipeline setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run data pipeline: cd packages/seeding && pnpm run pipeline"
echo "  2. Run RAG ingestion: pnpm run rag-pipeline"
echo "  3. Test search: pnpm run test-search"
echo "  4. Deploy functions: cd ../../functions && firebase deploy --only functions"

