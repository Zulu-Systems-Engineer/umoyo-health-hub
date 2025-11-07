# Umoyo Health Hub - Seeding Package Setup (Windows)

Write-Host "🏥 Setting up Umoyo Health Hub Seeding Package..." -ForegroundColor Green

# Create directory structure
Write-Host "`n📁 Creating directories..." -ForegroundColor Cyan

$directories = @(
    "packages\seeding\src\config",
    "packages\seeding\src\services",
    "packages\seeding\src\pipeline",
    "packages\seeding\src\scripts",
    "packages\seeding\src\types",
    "packages\seeding\data\downloads",
    "packages\seeding\data\metadata"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Host "  ✓ Created: $dir" -ForegroundColor Gray
}

# Create package.json
Write-Host "`n📦 Creating package.json..." -ForegroundColor Cyan

$packageJson = @"
{
  "name": "@umoyo/seeding",
  "version": "1.0.0",
  "description": "Data ingestion pipeline for Umoyo Health Hub",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "pipeline": "tsx src/index.ts",
    "download-only": "tsx src/scripts/download-only.ts",
    "create-corpus": "tsx src/scripts/create-corpus.ts",
    "test-pubmed": "tsx src/scripts/test-pubmed.ts",
    "clean": "rimraf dist data/downloads"
  },
  "dependencies": {
    "@google-cloud/storage": "^7.7.0",
    "@google-cloud/vertexai": "^1.1.0",
    "axios": "^1.6.5",
    "cheerio": "^1.0.0-rc.12",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "@types/uuid": "^9.0.7",
    "rimraf": "^5.0.5",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
"@

Set-Content -Path "packages\seeding\package.json" -Value $packageJson
Write-Host "  ✓ Created package.json" -ForegroundColor Gray

# Create tsconfig.json
Write-Host "`n⚙️  Creating tsconfig.json..." -ForegroundColor Cyan

$tsconfig = @"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
"@

Set-Content -Path "packages\seeding\tsconfig.json" -Value $tsconfig
Write-Host "  ✓ Created tsconfig.json" -ForegroundColor Gray

# Create .env.example
Write-Host "`n🔐 Creating .env.example..." -ForegroundColor Cyan

$envExample = @"
# Google Cloud Project Configuration
GCP_PROJECT_ID=umoyo-health-hub
GCP_REGION=us-central1

# Google Cloud Storage
GCS_BUCKET_PDFS=umoyo-health-pdfs
GCS_BUCKET_API_DATA=umoyo-health-api-data
GCS_BUCKET_LOGS=umoyo-health-rag-logs

# Vertex AI RAG Engine
RAG_CORPUS_NAME=umoyo-medical-knowledge
RAG_LOCATION=us-central1
"@

Set-Content -Path "packages\seeding\.env.example" -Value $envExample
Write-Host "  ✓ Created .env.example" -ForegroundColor Gray

# Create .gitignore
Write-Host "`n📄 Creating .gitignore..." -ForegroundColor Cyan

$gitignore = @"
# Data files
data/
*.pdf
*.json
!package.json
!tsconfig.json

# Environment
.env
.env.local

# Build output
dist/
*.log

# Dependencies
node_modules/
"@

Set-Content -Path "packages\seeding\.gitignore" -Value $gitignore
Write-Host "  ✓ Created .gitignore" -ForegroundColor Gray

# Create placeholder files
Write-Host "`n📝 Creating placeholder TypeScript files..." -ForegroundColor Cyan

$placeholders = @{
    "packages\seeding\src\types\index.ts" = "// Types will go here`nexport interface MedicalDocument {}"
    "packages\seeding\src\config\data-sources.ts" = "// Data sources configuration`nexport const WHO_GUIDELINES = [];"
    "packages\seeding\src\services\download.service.ts" = "// Download service`nexport class DownloadService {}"
    "packages\seeding\src\services\gcs.service.ts" = "// GCS service`nexport class GCSService {}"
    "packages\seeding\src\services\pubmed.service.ts" = "// PubMed service`nexport class PubMedService {}"
    "packages\seeding\src\services\rag.service.ts" = "// RAG service`nexport class RAGService {}"
    "packages\seeding\src\pipeline\ingestion-pipeline.ts" = "// Pipeline orchestration`nexport class IngestionPipeline {}"
    "packages\seeding\src\scripts\download-only.ts" = "// Download script`nconsole.log('Download script');"
    "packages\seeding\src\scripts\test-pubmed.ts" = "// PubMed test`nconsole.log('PubMed test');"
    "packages\seeding\src\scripts\create-corpus.ts" = "// Create corpus`nconsole.log('Create corpus');"
    "packages\seeding\src\index.ts" = "// Main entry point`nconsole.log('Umoyo Health Hub - Data Pipeline');"
}

foreach ($file in $placeholders.Keys) {
    Set-Content -Path $file -Value $placeholders[$file]
    Write-Host "  ✓ Created: $file" -ForegroundColor Gray
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. cd packages\seeding" -ForegroundColor White
Write-Host "  2. pnpm install" -ForegroundColor White
Write-Host "  3. Copy the code from artifacts into the files" -ForegroundColor White
Write-Host "  4. Copy .env.example to .env and configure" -ForegroundColor White
Write-Host "  5. pnpm run pipeline`n" -ForegroundColor White

