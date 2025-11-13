import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { MedicalDocument } from '../types';

export class DownloadService {
  private downloadDir: string;

  constructor(downloadDir: string = './data/downloads') {
    this.downloadDir = downloadDir;
  }

  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async downloadPDF(doc: MedicalDocument): Promise<string> {
    const sanitizedTitle = doc.title
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .substring(0, 100);
    
    const fileName = `${doc.source.toLowerCase()}-${sanitizedTitle}.pdf`;
    const categoryDir = path.join(this.downloadDir, doc.category);
    await this.ensureDirectoryExists(categoryDir);
    
    const filePath = path.join(categoryDir, fileName);

    // Check if file already exists
    try {
      await fs.access(filePath);
      console.log(`⏭️  Skipping (already exists): ${doc.title}`);
      return filePath;
    } catch {
      // File doesn't exist, proceed with download
    }

    try {
      console.log(`📥 Downloading: ${doc.title}`);
      
      const response = await axios({
        method: 'GET',
        url: doc.downloadUrl || doc.url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Umoyo-Health-Hub/1.0 (Educational Healthcare Project; +https://umoyohealth.zm)'
        },
        timeout: 60000, // 60 second timeout
        maxRedirects: 5
      });

      await pipeline(response.data, createWriteStream(filePath));
      
      // Verify file was downloaded
      const stats = await fs.stat(filePath);
      if (stats.size < 1000) {
        throw new Error('Downloaded file is too small, likely invalid');
      }

      console.log(`✅ Downloaded: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      return filePath;
    } catch (error: any) {
      console.error(`❌ Failed to download ${doc.title}:`, error.message);
      throw error;
    }
  }

  async downloadBatch(documents: MedicalDocument[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const doc of documents) {
      try {
        const filePath = await this.downloadPDF(doc);
        results.set(doc.id, filePath);
        
        // Rate limiting - be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to download ${doc.id}:`, error);
        // Continue with other downloads
      }
    }

    return results;
  }
}
