# ============================================================================
# UMOYO HEALTH HUB - SERVICE ACCOUNT SETUP SCRIPT (WINDOWS POWERSHELL)
# ============================================================================
# This script creates service accounts with least-privilege permissions for:
# 1. RAG API Service (Cloud Functions/Cloud Run)
# 2. RAG Ingestion Service (Data pipeline)
# 3. Frontend Deployment Service (Firebase Hosting)
# ============================================================================

# Stop on errors
$ErrorActionPreference = "Stop"

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null

if ([string]::IsNullOrEmpty($PROJECT_ID)) {
    Write-Host "Error: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║                                                                   ║" -ForegroundColor Blue
Write-Host "║        UMOYO HEALTH HUB - SERVICE ACCOUNT SETUP                  ║" -ForegroundColor Blue
Write-Host "║                                                                   ║" -ForegroundColor Blue
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 1: CREATE SERVICE ACCOUNTS
# ============================================================================

Write-Host "📝 STEP 1: Creating Service Accounts..." -ForegroundColor Yellow
Write-Host ""

# 1.1 RAG API Service Account
Write-Host "Creating: umoyo-rag-api service account..." -ForegroundColor Cyan
$apiSaExists = gcloud iam service-accounts describe "umoyo-rag-api@$PROJECT_ID.iam.gserviceaccount.com" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ⏭️  Service account already exists, skipping..." -ForegroundColor Yellow
} else {
    gcloud iam service-accounts create umoyo-rag-api `
        --display-name="Umoyo RAG API Service" `
        --description="Service account for Umoyo Health Hub RAG API (Cloud Functions/Cloud Run)"
    Write-Host "  ✅ Created: umoyo-rag-api@$PROJECT_ID.iam.gserviceaccount.com" -ForegroundColor Green
}

# 1.2 RAG Ingestion Service Account
Write-Host "Creating: umoyo-rag-ingestion service account..." -ForegroundColor Cyan
$ingestionSaExists = gcloud iam service-accounts describe "umoyo-rag-ingestion@$PROJECT_ID.iam.gserviceaccount.com" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ⏭️  Service account already exists, skipping..." -ForegroundColor Yellow
} else {
    gcloud iam service-accounts create umoyo-rag-ingestion `
        --display-name="Umoyo RAG Ingestion Service" `
        --description="Service account for Umoyo Health Hub data ingestion pipeline"
    Write-Host "  ✅ Created: umoyo-rag-ingestion@$PROJECT_ID.iam.gserviceaccount.com" -ForegroundColor Green
}

# 1.3 Firebase Deployment Service Account
Write-Host "Creating: umoyo-firebase-deploy service account..." -ForegroundColor Cyan
$firebaseSaExists = gcloud iam service-accounts describe "umoyo-firebase-deploy@$PROJECT_ID.iam.gserviceaccount.com" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ⏭️  Service account already exists, skipping..." -ForegroundColor Yellow
} else {
    gcloud iam service-accounts create umoyo-firebase-deploy `
        --display-name="Umoyo Firebase Deployment" `
        --description="Service account for Umoyo Health Hub CI/CD deployments"
    Write-Host "  ✅ Created: umoyo-firebase-deploy@$PROJECT_ID.iam.gserviceaccount.com" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 2: GRANT PROJECT-LEVEL ROLES TO RAG API SERVICE ACCOUNT
# ============================================================================

Write-Host "🔐 STEP 2: Granting roles to RAG API Service Account..." -ForegroundColor Yellow
Write-Host ""

$API_SA = "umoyo-rag-api@$PROJECT_ID.iam.gserviceaccount.com"

$API_ROLES = @(
    "roles/aiplatform.user",
    "roles/logging.logWriter",
    "roles/run.developer",
    "roles/cloudfunctions.developer",
    "roles/artifactregistry.reader",
    "roles/secretmanager.secretAccessor"
)

foreach ($ROLE in $API_ROLES) {
    Write-Host "  Granting $ROLE..." -ForegroundColor Cyan
    gcloud projects add-iam-policy-binding $PROJECT_ID `
        --member="serviceAccount:$API_SA" `
        --role="$ROLE" `
        --condition=None `
        --quiet 2>$null | Out-Null
    Write-Host "  ✅ Granted: $ROLE" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 3: GRANT PROJECT-LEVEL ROLES TO INGESTION SERVICE ACCOUNT
# ============================================================================

Write-Host "🔐 STEP 3: Granting roles to RAG Ingestion Service Account..." -ForegroundColor Yellow
Write-Host ""

$INGESTION_SA = "umoyo-rag-ingestion@$PROJECT_ID.iam.gserviceaccount.com"

$INGESTION_ROLES = @(
    "roles/aiplatform.user",
    "roles/logging.logWriter",
    "roles/storage.objectAdmin",
    "roles/discoveryengine.admin"
)

foreach ($ROLE in $INGESTION_ROLES) {
    Write-Host "  Granting $ROLE..." -ForegroundColor Cyan
    gcloud projects add-iam-policy-binding $PROJECT_ID `
        --member="serviceAccount:$INGESTION_SA" `
        --role="$ROLE" `
        --condition=None `
        --quiet 2>$null | Out-Null
    Write-Host "  ✅ Granted: $ROLE" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 4: GRANT BUCKET-LEVEL PERMISSIONS
# ============================================================================

Write-Host "🪣 STEP 4: Granting bucket-level permissions..." -ForegroundColor Yellow
Write-Host ""

# Define buckets
$PDF_BUCKET = "gs://umoyo-health-pdfs"
$API_DATA_BUCKET = "gs://umoyo-health-api-data"
$LOGS_BUCKET = "gs://umoyo-health-rag-logs"

$BUCKETS = @($PDF_BUCKET, $API_DATA_BUCKET, $LOGS_BUCKET)

Write-Host "Checking if buckets exist..." -ForegroundColor Cyan

foreach ($BUCKET in $BUCKETS) {
    $BUCKET_NAME = $BUCKET -replace "gs://", ""
    $bucketExists = gsutil ls $BUCKET 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Bucket exists: $BUCKET" -ForegroundColor Green
    } else {
        Write-Host "  Creating bucket: $BUCKET..." -ForegroundColor Yellow
        gsutil mb -l us-central1 $BUCKET
        Write-Host "  ✅ Created: $BUCKET" -ForegroundColor Green
    }
}

Write-Host ""

# Grant RAG API read access to PDF bucket
Write-Host "Granting RAG API read access to PDF bucket..." -ForegroundColor Cyan
gcloud storage buckets add-iam-policy-binding $PDF_BUCKET `
    --member="serviceAccount:$API_SA" `
    --role="roles/storage.objectViewer" `
    --quiet 2>$null | Out-Null
Write-Host "  ✅ Granted: objectViewer on $PDF_BUCKET" -ForegroundColor Green

# Grant Ingestion full access to all buckets
Write-Host "Granting Ingestion full access to all buckets..." -ForegroundColor Cyan
foreach ($BUCKET in $BUCKETS) {
    gcloud storage buckets add-iam-policy-binding $BUCKET `
        --member="serviceAccount:$INGESTION_SA" `
        --role="roles/storage.objectAdmin" `
        --quiet 2>$null | Out-Null
    Write-Host "  ✅ Granted: objectAdmin on $BUCKET" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 5: GRANT FIREBASE DEPLOYMENT PERMISSIONS
# ============================================================================

Write-Host "🔥 STEP 5: Granting Firebase deployment permissions..." -ForegroundColor Yellow
Write-Host ""

$FIREBASE_SA = "umoyo-firebase-deploy@$PROJECT_ID.iam.gserviceaccount.com"

$FIREBASE_ROLES = @(
    "roles/firebase.admin",
    "roles/firebasehosting.admin",
    "roles/cloudfunctions.developer",
    "roles/iam.serviceAccountUser"
)

foreach ($ROLE in $FIREBASE_ROLES) {
    Write-Host "  Granting $ROLE..." -ForegroundColor Cyan
    gcloud projects add-iam-policy-binding $PROJECT_ID `
        --member="serviceAccount:$FIREBASE_SA" `
        --role="$ROLE" `
        --condition=None `
        --quiet 2>$null | Out-Null
    Write-Host "  ✅ Granted: $ROLE" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 6: ENABLE WORKLOAD IDENTITY
# ============================================================================

Write-Host "🔗 STEP 6: Configuring Workload Identity..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Allowing Cloud Functions to impersonate RAG API SA..." -ForegroundColor Cyan
gcloud iam service-accounts add-iam-policy-binding $API_SA `
    --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" `
    --role="roles/iam.serviceAccountUser" `
    --quiet 2>$null | Out-Null
Write-Host "  ✅ Workload Identity configured" -ForegroundColor Green

Write-Host ""

# ============================================================================
# STEP 7: CREATE SERVICE ACCOUNT KEYS
# ============================================================================

Write-Host "🔑 STEP 7: Creating service account keys for local development..." -ForegroundColor Yellow
Write-Host ""

# Create keys directory
if (-not (Test-Path ".keys")) {
    New-Item -ItemType Directory -Path ".keys" -Force | Out-Null
}

# Create key for ingestion SA
if (-not (Test-Path ".keys\umoyo-rag-ingestion-key.json")) {
    Write-Host "Creating key for ingestion service account..." -ForegroundColor Cyan
    gcloud iam service-accounts keys create .keys\umoyo-rag-ingestion-key.json `
        --iam-account="$INGESTION_SA"
    Write-Host "  ✅ Key saved: .keys\umoyo-rag-ingestion-key.json" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Key already exists, skipping..." -ForegroundColor Yellow
}

# Create key for API SA
if (-not (Test-Path ".keys\umoyo-rag-api-key.json")) {
    Write-Host "Creating key for API service account..." -ForegroundColor Cyan
    gcloud iam service-accounts keys create .keys\umoyo-rag-api-key.json `
        --iam-account="$API_SA"
    Write-Host "  ✅ Key saved: .keys\umoyo-rag-api-key.json" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Key already exists, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "⚠️  SECURITY WARNING:" -ForegroundColor Red
Write-Host "   - Never commit .keys\ directory to git!" -ForegroundColor Red
Write-Host "   - Add .keys\ to your .gitignore" -ForegroundColor Red
Write-Host "   - Rotate keys regularly (every 90 days)" -ForegroundColor Red
Write-Host ""

# ============================================================================
# STEP 8: GENERATE SUMMARY
# ============================================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                                   ║" -ForegroundColor Green
Write-Host "║                    ✅ SETUP COMPLETED!                            ║" -ForegroundColor Green
Write-Host "║                                                                   ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📋 SERVICE ACCOUNTS CREATED:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. RAG API Service Account" -ForegroundColor Cyan
Write-Host "   Email: $API_SA"
Write-Host "   Purpose: Cloud Functions, Gemini API calls, RAG queries"
Write-Host ""
Write-Host "2. RAG Ingestion Service Account" -ForegroundColor Cyan
Write-Host "   Email: $INGESTION_SA"
Write-Host "   Purpose: Data pipeline, PDF uploads, corpus management"
Write-Host ""
Write-Host "3. Firebase Deployment Service Account" -ForegroundColor Cyan
Write-Host "   Email: $FIREBASE_SA"
Write-Host "   Purpose: CI/CD deployments"
Write-Host ""

Write-Host "🪣 STORAGE BUCKETS:" -ForegroundColor Yellow
Write-Host "   - $PDF_BUCKET (Medical PDFs)"
Write-Host "   - $API_DATA_BUCKET (API data staging)"
Write-Host "   - $LOGS_BUCKET (RAG ingestion logs)"
Write-Host ""

Write-Host "🔑 SERVICE ACCOUNT KEYS:" -ForegroundColor Yellow
Write-Host "   - .keys\umoyo-rag-ingestion-key.json"
Write-Host "   - .keys\umoyo-rag-api-key.json"
Write-Host ""

Write-Host "📝 NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Add to .gitignore:"
Write-Host '   Add-Content -Path .gitignore -Value ".keys/"'
Write-Host ""
Write-Host "2. Set environment variable for seeding package:"
Write-Host "   `$env:GOOGLE_APPLICATION_CREDENTIALS=`"$(Get-Location)\.keys\umoyo-rag-ingestion-key.json`""
Write-Host ""
Write-Host "3. Test authentication:"
Write-Host "   cd packages\seeding"
Write-Host "   `$env:GOOGLE_APPLICATION_CREDENTIALS=`"..\..\\.keys\umoyo-rag-ingestion-key.json`""
Write-Host "   pnpm run test-pubmed"
Write-Host ""
Write-Host "4. Run the data ingestion pipeline:"
Write-Host "   pnpm run pipeline"
Write-Host ""
Write-Host "✅ You're all set! Service accounts are ready." -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 9: SAVE CONFIGURATION
# ============================================================================

$CONFIG_FILE = ".service-accounts-config.json"

$config = @{
    project_id = $PROJECT_ID
    service_accounts = @{
        api = @{
            email = $API_SA
            key_path = ".keys\umoyo-rag-api-key.json"
            roles = $API_ROLES
        }
        ingestion = @{
            email = $INGESTION_SA
            key_path = ".keys\umoyo-rag-ingestion-key.json"
            roles = $INGESTION_ROLES
        }
        deployment = @{
            email = $FIREBASE_SA
            roles = $FIREBASE_ROLES
        }
    }
    buckets = @{
        pdfs = $PDF_BUCKET
        api_data = $API_DATA_BUCKET
        logs = $LOGS_BUCKET
    }
    created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

$config | ConvertTo-Json -Depth 10 | Set-Content $CONFIG_FILE
Write-Host "💾 Configuration saved to: $CONFIG_FILE" -ForegroundColor Green
Write-Host ""

# Add to .gitignore
if (-not (Test-Path ".gitignore")) {
    New-Item -ItemType File -Path ".gitignore" -Force | Out-Null
}

$gitignoreContent = Get-Content .gitignore -Raw -ErrorAction SilentlyContinue

if ($gitignoreContent -notmatch ".keys/") {
    Add-Content -Path .gitignore -Value ".keys/"
    Write-Host "✅ Added .keys/ to .gitignore" -ForegroundColor Green
}

if ($gitignoreContent -notmatch ".service-accounts-config.json") {
    Add-Content -Path .gitignore -Value ".service-accounts-config.json"
    Write-Host "✅ Added config file to .gitignore" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Setup script completed successfully!" -ForegroundColor Blue
Write-Host ""


