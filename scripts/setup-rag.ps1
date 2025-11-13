Write-Host "🏥 Setting up Umoyo Health Hub RAG Pipeline" -ForegroundColor Green
Write-Host ""

# 1. Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Set-Location packages\seeding
pnpm install

Set-Location ..\..\functions
pnpm install

Set-Location ..\

# 2. Initialize Firestore
Write-Host "🔥 Initializing Firestore..." -ForegroundColor Cyan
firebase deploy --only firestore:indexes

# 3. Deploy Firestore rules
Write-Host "🔐 Deploying Firestore security rules..." -ForegroundColor Cyan
firebase deploy --only firestore:rules

# 4. Test authentication
Write-Host "🔑 Testing authentication..." -ForegroundColor Cyan
$authTest = gcloud auth application-default print-access-token 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Authentication configured" -ForegroundColor Green
} else {
    Write-Host "   ❌ Authentication not configured" -ForegroundColor Red
    Write-Host "   Run: gcloud auth application-default login" -ForegroundColor Yellow
    exit 1
}

# 5. Test embedding service
Write-Host "🧪 Testing embedding service..." -ForegroundColor Cyan
Set-Location packages\seeding
pnpm run test-embedding

# 6. Ready message
Write-Host ""
Write-Host "✅ RAG Pipeline setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run data pipeline: cd packages\seeding && pnpm run pipeline"
Write-Host "  2. Run RAG ingestion: pnpm run rag-pipeline"
Write-Host "  3. Test search: pnpm run test-search"
Write-Host "  4. Deploy functions: cd ..\..\functions && firebase deploy --only functions"

