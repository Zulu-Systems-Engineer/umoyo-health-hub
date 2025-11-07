# ======================================================================
# Complete RAG System Setup Script for Windows (PowerShell)
# ======================================================================
# This script automates the entire RAG pipeline setup on Google Cloud Platform
# Prerequisites: 
# - gcloud CLI installed and authenticated
# - Docker Desktop installed (for container builds)
# - Firebase CLI installed (npm install -g firebase-tools)
# - Node.js and PNPM installed
# ======================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "us-central1",
    
    [Parameter(Mandatory=$false)]
    [int]$BudgetAmount = 100
)

# Color output functions
function Write-Success { 
    param($Message) 
    Write-Host "[OK] $Message" -ForegroundColor Green 
}
function Write-Info { 
    param($Message) 
    Write-Host "[INFO] $Message" -ForegroundColor Cyan 
}
function Write-WarningScriptScript { 
    param($Message) 
    Write-Host "[WARN] $Message" -ForegroundColor Yellow 
}
function Write-ErrorScriptScript { 
    param($Message) 
    Write-Host "[ERROR] $Message" -ForegroundColor Red 
}

# Error handling
$ErrorActionPreference = "Continue"

Write-Info "Starting RAG System Setup for Project: $ProjectId"
Write-Info "Region: $Region | Location: $Location"

# ======================================================================
# 1. PROJECT CONFIGURATION & API ENABLEMENT
# ======================================================================
Write-Info "`n=== Step 1: Project Configuration & API Enablement ==="

Write-Info "Setting active project..."
gcloud config set project $ProjectId 2>&1 | Out-Null

Write-Info "Enabling required APIs..."
$apis = @(
    "aiplatform.googleapis.com",
    "compute.googleapis.com",
    "storage.googleapis.com",
    "firestore.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "discoveryengine.googleapis.com"
)

foreach ($api in $apis) {
    Write-Info "Enabling $api..."
    $null = gcloud services enable $api --project=$ProjectId 2>&1 | Out-Null
    Start-Sleep -Milliseconds 500
    Write-Success "$api"
}

Write-Success "APIs enabled successfully"

# ======================================================================
# 2. SERVICE ACCOUNTS CREATION
# ======================================================================
Write-Info "`n=== Step 2: Creating Service Accounts ==="

# RAG API Service Account
$ragApiSA = "umoyo-rag-api"
$ragApiEmail = "$ragApiSA@$ProjectId.iam.gserviceaccount.com"

Write-Info "Creating RAG API service account..."
gcloud iam service-accounts create $ragApiSA `
    --display-name="Umoyo RAG API Service Account" `
    --project=$ProjectId 2>$null | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Success "Service account created: $ragApiEmail"
} else {
    Write-WarningScript "Service account may already exist"
}

# Ingestion Pipeline Service Account
$ingestionSA = "umoyo-rag-ingestion"
$ingestionEmail = "$ingestionSA@$ProjectId.iam.gserviceaccount.com"

Write-Info "Creating Ingestion Pipeline service account..."
gcloud iam service-accounts create $ingestionSA `
    --display-name="Umoyo RAG Ingestion Pipeline Service Account" `
    --project=$ProjectId 2>$null | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Success "Service account created: $ingestionEmail"
} else {
    Write-WarningScript "Service account may already exist"
}

# ======================================================================
# 3. IAM ROLE BINDINGS
# ======================================================================
Write-Info "`n=== Step 3: Configuring IAM Roles ==="

$ragApiRoles = @(
    "roles/aiplatform.user",
    "roles/storage.objectViewer",
    "roles/datastore.user",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter"
)

foreach ($role in $ragApiRoles) {
    Write-Info "Binding $role to $ragApiSA..."
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$ragApiEmail" `
        --role=$role `
        --condition=None 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Bound $role"
    }
}

$ingestionRoles = @(
    "roles/storage.objectAdmin",
    "roles/aiplatform.user",
    "roles/datastore.user",
    "roles/discoveryengine.admin",
    "roles/logging.logWriter"
)

foreach ($role in $ingestionRoles) {
    Write-Info "Binding $role to $ingestionSA..."
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$ingestionEmail" `
        --role=$role `
        --condition=None 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Bound $role"
    }
}

Write-Success "IAM roles configured"

# ======================================================================
# 4. CLOUD STORAGE BUCKETS
# ======================================================================
Write-Info "`n=== Step 4: Creating Cloud Storage Buckets ==="

$pdfBucket = "umoyo-health-pdfs"
$apiDataBucket = "umoyo-health-api-data"
$logsBucket = "umoyo-health-rag-logs"

$buckets = @(
    @{Name=$pdfBucket; Description="Medical PDFs"},
    @{Name=$apiDataBucket; Description="API data staging"},
    @{Name=$logsBucket; Description="RAG ingestion logs"}
)

foreach ($bucket in $buckets) {
    Write-Info "Creating bucket: $($bucket.Name)..."
    $bucketOutput = gsutil mb -p $ProjectId -c STANDARD -l $Region "gs://$($bucket.Name)/" 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Bucket created: $($bucket.Name)"
    } elseif ($bucketOutput -match "already exists" -or $bucketOutput -match "409") {
        Write-WarningScript "Bucket already exists: $($bucket.Name)"
    } else {
        Write-WarningScript "Could not create bucket: $($bucket.Name) - $bucketOutput"
    }
    Start-Sleep -Milliseconds 500
}

Write-Success "Buckets configured"

# ======================================================================
# 5. FIRESTORE DATABASE SETUP
# ======================================================================
Write-Info "`n=== Step 5: Setting up Firestore ==="

Write-Info "Creating Firestore database (Native mode)..."
gcloud firestore databases create `
    --location=$Region `
    --type=firestore-native `
    --project=$ProjectId 2>$null | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Success "Firestore database created"
} else {
    Write-WarningScript "Firestore database may already exist"
}

# ======================================================================
# 6. ARTIFACT REGISTRY SETUP
# ======================================================================
Write-Info "`n=== Step 6: Creating Artifact Registry Repository ==="

$repoName = "umoyo-rag-repo"

Write-Info "Creating Docker repository: $repoName..."
gcloud artifacts repositories create $repoName `
    --repository-format=docker `
    --location=$Region `
    --description="Umoyo RAG System Container Images" `
    --project=$ProjectId 2>$null | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Success "Artifact Registry repository created"
} else {
    Write-WarningScript "Repository may already exist"
}

# Configure Docker authentication
Write-Info "Configuring Docker authentication..."
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet

Write-Success "Docker configured for Artifact Registry"

# ======================================================================
# 7. SECRET MANAGER SETUP
# ======================================================================
Write-Info "`n=== Step 7: Setting up Secret Manager ==="

Write-Info "Creating placeholder secrets..."
$secrets = @(
    @{Name="ncbi-api-key"; Description="PubMed API key (optional)"},
    @{Name="openai-api-key"; Description="OpenAI API key (if needed)"}
)

foreach ($secret in $secrets) {
    Write-Info "Creating secret: $($secret.Name)..."
    echo "REPLACE_WITH_ACTUAL_KEY" | gcloud secrets create $secret.Name `
        --data-file=- `
        --replication-policy="automatic" `
        --project=$ProjectId 2>$null | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Secret created: $($secret.Name)"
        Write-WarningScript "Update secret: gcloud secrets versions add $($secret.Name) --data-file=path/to/key"
    } else {
        Write-WarningScript "Secret may already exist: $($secret.Name)"
    }
}

# ======================================================================
# 8. FIRESTORE INDEXES
# ======================================================================
Write-Info "`n=== Step 8: Creating Firestore Indexes ==="

$firestoreIndexes = @"
{
  "indexes": [
    {
      "collectionGroup": "conversations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "conversationId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "lastUpdated", "order": "DESCENDING" }
      ]
    }
  ]
}
"@

$indexPath = "$env:TEMP\firestore.indexes.json"
$firestoreIndexes | Out-File -FilePath $indexPath -Encoding UTF8

Write-Info "Firestore index definition created: $indexPath"
Write-WarningScript "Deploy indexes manually: firebase deploy --only firestore:indexes --project=$ProjectId"

# ======================================================================
# 9. BUDGET & ALERTS SETUP
# ======================================================================
Write-Info "`n=== Step 9: Setting up Budget Alerts ==="

$billingAccount = gcloud beta billing projects describe $ProjectId --format="value(billingAccountName)" 2>$null

if ($billingAccount) {
    Write-Info "Creating budget alert ($$BudgetAmount USD)..."
    
    gcloud billing budgets create `
        --billing-account=$billingAccount `
        --display-name="Umoyo RAG System Budget" `
        --budget-amount=$BudgetAmount `
        --threshold-rule=percent=50 `
        --threshold-rule=percent=90 `
        --threshold-rule=percent=100 2>$null | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Budget alert created"
    } else {
        Write-WarningScript "Could not create budget (may already exist or need billing admin role)"
    }
} else {
    Write-WarningScript "No billing account found - skipping budget setup"
}

# ======================================================================
# 10. GENERATE HELPER SCRIPTS
# ======================================================================
Write-Info "`n=== Step 10: Generating Helper Scripts ==="

# Environment variables template
$envTemplate = @"
# Environment Variables for Umoyo RAG System
# Generated by setup-rag-system.ps1

PROJECT_ID=$ProjectId
REGION=$Region
LOCATION=$Location

# Storage Buckets
GCS_BUCKET_PDFS=$pdfBucket
GCS_BUCKET_API_DATA=$apiDataBucket
GCS_BUCKET_LOGS=$logsBucket

# Service Accounts
RAG_API_SA=$ragApiEmail
INGESTION_SA=$ingestionEmail

# Artifact Registry
ARTIFACT_REGISTRY=$Region-docker.pkg.dev/$ProjectId/$repoName

# Vertex AI
RAG_CORPUS_NAME=umoyo-medical-knowledge
"@

$envTemplate | Out-File -FilePath ".env.gcp" -Encoding UTF8
Write-Success "Created: .env.gcp"

# Summary configuration file
$configSummary = @{
    project_id = $ProjectId
    region = $Region
    location = $Location
    service_accounts = @{
        rag_api = $ragApiEmail
        ingestion = $ingestionEmail
    }
    buckets = @{
        pdfs = $pdfBucket
        api_data = $apiDataBucket
        logs = $logsBucket
    }
    artifact_registry = "$Region-docker.pkg.dev/$ProjectId/$repoName"
    firestore_location = $Region
    created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

$configSummary | ConvertTo-Json -Depth 10 | Out-File -FilePath ".rag-system-config.json" -Encoding UTF8
Write-Success "Created: .rag-system-config.json"

# ======================================================================
# 11. SUMMARY & NEXT STEPS
# ======================================================================
Write-Info "`n========================================="
Write-Success "RAG System Setup Complete!"
Write-Info "========================================="

Write-Host "`nCreated Resources:" -ForegroundColor Yellow
Write-Host "  • Project: $ProjectId"
Write-Host "  • Service Accounts: $ragApiSA, $ingestionSA"
Write-Host "  • Buckets: $pdfBucket, $apiDataBucket, $logsBucket"
Write-Host "  • Artifact Registry: $repoName"
Write-Host "  • Firestore: (default database)"

Write-Host "`nConfiguration Files Created:" -ForegroundColor Yellow
Write-Host "  • .env.gcp - Environment variables reference"
Write-Host "  • .rag-system-config.json - System configuration"

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Run service account setup:"
Write-Host "     .\setup-service-accounts.ps1"
Write-Host ""
Write-Host "  2. Set up your .env files in packages/seeding:"
Write-Host "     Copy .env.gcp values to packages/seeding/.env"
Write-Host ""
Write-Host "  3. Create and configure RAG corpus:"
Write-Host "     cd packages\seeding"
Write-Host "     pnpm run create-corpus"
Write-Host ""
Write-Host "  4. Run data ingestion pipeline:"
Write-Host "     pnpm run pipeline"
Write-Host ""
Write-Host "  5. Deploy Firebase Functions:"
Write-Host "     cd functions"
Write-Host "     firebase deploy --only functions"
Write-Host ""
Write-Host "  6. Deploy Firebase Hosting:"
Write-Host "     pnpm build"
Write-Host "     firebase deploy --only hosting"
Write-Host ""
Write-Host "  7. Update Secret Manager with actual API keys (if needed)"

Write-Host "`nDocumentation:" -ForegroundColor Yellow
Write-Host "  • Cloud Console: https://console.cloud.google.com/home/dashboard?project=$ProjectId"
Write-Host "  • Firestore: https://console.firebase.google.com/project/$ProjectId/firestore"
Write-Host "  • Vertex AI: https://console.cloud.google.com/vertex-ai?project=$ProjectId"
Write-Host "  • Storage: https://console.cloud.google.com/storage/browser?project=$ProjectId"

Write-Success "`nSetup completed successfully! 🎉"
Write-Host ""
Write-WarningScript "Important: Remember to:"
Write-Host "  1. Add .env.gcp and .rag-system-config.json to .gitignore"
Write-Host "  2. Update Secret Manager with actual API keys"
Write-Host "  3. Configure Firestore security rules"
Write-Host "  4. Set up Firebase Authentication"
Write-Host ""

