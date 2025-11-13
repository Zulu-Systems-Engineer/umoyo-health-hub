import 'dotenv/config'
import { Storage, File } from '@google-cloud/storage'
import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { RAGIngestionPipeline } from '../pipeline/rag-ingestion-pipeline'
import type { MedicalDocument } from '../types'
import { getServiceAccountKeyPath } from '../config/auth'

async function ingestFromBucket() {
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'umoyo-health-hub'
  const bucketName = process.env.GCS_BUCKET_PDFS || process.env.GCS_BUCKET_NAME || 'medical_book'
  const downloadsDir = process.env.DOWNLOAD_DIR ? path.resolve(process.env.DOWNLOAD_DIR) : path.resolve('./data/downloads')
  const keyPath = getServiceAccountKeyPath()
  const storage = keyPath ? new Storage({ keyFilename: keyPath, projectId }) : new Storage({ projectId })

  console.log(`📥 Listing PDFs in bucket: ${bucketName}`)
  const [files] = await storage.bucket(bucketName).getFiles()

  const args = process.argv.slice(2)
  const filesArgIndex = args.findIndex(a => a === '--files' || a.startsWith('--files='))
  let selectedBaseNames: string[] | null = null
  if (filesArgIndex !== -1) {
    const val = args[filesArgIndex].includes('=') ? args[filesArgIndex].split('=')[1] : args[filesArgIndex + 1]
    if (val) {
      selectedBaseNames = val
        .split(',')
        .map(s => s.trim().toLowerCase().replace(/\.pdf$/i, ''))
        .filter(Boolean)
    }
  }

  const pdfFiles = files.filter((f: File) => f.name.toLowerCase().endsWith('.pdf'))
  let filteredFiles = pdfFiles
  if (selectedBaseNames && selectedBaseNames.length > 0) {
    filteredFiles = pdfFiles.filter((f: File) => {
      const base = path.basename(f.name).toLowerCase().replace(/\.pdf$/i, '')
      return selectedBaseNames!.includes(base)
    })
  }

  console.log(`   Found ${filteredFiles.length} PDF files`)

  await fs.mkdir(downloadsDir, { recursive: true })

  const documents: MedicalDocument[] = []

  for (const file of filteredFiles) {
    const base = path.basename(file.name)
    const dest = path.join(downloadsDir, base)
    try {
      await file.download({ destination: dest })
      const doc: MedicalDocument = {
        id: uuidv4(),
        title: base.replace(/\.pdf$/i, ''),
        source: 'WHO',
        category: 'disease-reference',
        url: `gs://${bucketName}/${file.name}`,
        downloadUrl: undefined,
        localPath: dest,
        gcsPath: file.name,
        metadata: {
          audience: 'both',
          language: 'en',
          region: 'global',
          topics: base.split(/[-_\s]+/).filter(Boolean),
          lastUpdated: new Date().toISOString()
        }
      }
      documents.push(doc)
    } catch (e) {
      console.error(`Failed to download ${file.name}:`, (e as any)?.message || String(e))
    }
  }

  console.log(`✅ Downloaded ${documents.length}/${filteredFiles.length} PDFs`)
  await fs.writeFile('./data/documents-metadata.json', JSON.stringify(documents, null, 2))

  const pipeline = new RAGIngestionPipeline()
  const docsToProcess = documents.map(d => ({ document: d, pdfPath: d.localPath! }))
  await pipeline.processDocumentsBatch(docsToProcess)
}

ingestFromBucket().catch(err => {
  console.error('❌ Ingestion failed:', (err as any)?.message || String(err))
  process.exit(1)
})