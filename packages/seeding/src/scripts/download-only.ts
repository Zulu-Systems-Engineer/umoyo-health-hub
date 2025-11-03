import { DownloadService } from '../services/download.service';
import { WHO_GUIDELINES } from '../config/data-sources';
import { v4 as uuidv4 } from 'uuid';
import { MedicalDocument } from '../types';

async function downloadOnly() {
  console.log('📥 Starting download-only mode...\n');
  
  const downloadService = new DownloadService();
  
  // Prepare documents with IDs
  const documents: MedicalDocument[] = WHO_GUIDELINES.map(partial => ({
    id: uuidv4(),
    ...partial
  } as MedicalDocument));

  console.log(`Downloading ${documents.length} documents...\n`);
  
  const results = await downloadService.downloadBatch(documents);
  
  console.log(`\n✅ Download complete!`);
  console.log(`   Success: ${results.size}/${documents.length}`);
  console.log(`   Failed: ${documents.length - results.size}`);
}

downloadOnly().catch(console.error);
