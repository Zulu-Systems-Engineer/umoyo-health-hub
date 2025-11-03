import { Storage } from '@google-cloud/storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MedicalDocument } from '../types';
import { getStorageConfig } from '../config/auth';

export class GCSService {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName: string = 'umoyo-health-pdfs') {
    // Use authentication config (supports both env var and keyFilename)
    const config = getStorageConfig();
    this.storage = new Storage(config);
    this.bucketName = bucketName;
  }

  async uploadFile(localPath: string, gcsPath: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      
      await bucket.upload(localPath, {
        destination: gcsPath,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        }
      });

      const publicUrl = `gs://${this.bucketName}/${gcsPath}`;
      console.log(`✅ Uploaded to GCS: ${gcsPath}`);
      
      return publicUrl;
    } catch (error: any) {
      console.error(`❌ Failed to upload ${localPath}:`, error.message);
      throw error;
    }
  }

  async uploadDocument(doc: MedicalDocument, localPath: string): Promise<string> {
    const fileName = path.basename(localPath);
    const gcsPath = `${doc.category}/${doc.source.toLowerCase()}/${fileName}`;
    
    return this.uploadFile(localPath, gcsPath);
  }

  async uploadBatch(documents: Map<string, string>): Promise<Map<string, string>> {
    const uploadedPaths = new Map<string, string>();

    for (const [docId, localPath] of documents.entries()) {
      try {
        // Extract category from local path
        const parts = localPath.split(path.sep);
        const category = parts[parts.length - 2];
        const fileName = parts[parts.length - 1];
        const gcsPath = `${category}/${fileName}`;

        const publicUrl = await this.uploadFile(localPath, gcsPath);
        uploadedPaths.set(docId, publicUrl);
      } catch (error) {
        console.error(`Failed to upload ${docId}:`, error);
      }
    }

    return uploadedPaths;
  }

  async createMetadataFile(documents: MedicalDocument[]): Promise<string> {
    const metadataJson = JSON.stringify(documents, null, 2);
    const tempPath = './data/documents-metadata.json';
    
    await fs.writeFile(tempPath, metadataJson);
    
    const gcsPath = await this.uploadFile(tempPath, 'metadata/documents-metadata.json');
    
    console.log(`✅ Uploaded metadata file with ${documents.length} documents`);
    
    return gcsPath;
  }
}
