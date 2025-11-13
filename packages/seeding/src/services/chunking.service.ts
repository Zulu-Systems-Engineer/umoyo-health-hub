import { v4 as uuidv4 } from 'uuid';
import type { VectorChunk } from '@umoyo/shared';
import type { MedicalDocument } from '../types';
import { readFile } from 'fs/promises';
import { OCRService } from './ocr.service';

export interface TextChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
}

export type ChunkBeforeEmbedding = Omit<VectorChunk, 'embedding' | 'embeddingDim'>;

export class ChunkingService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private ocrService?: OCRService;

  // Increased chunk size to stay within token limits
  // text-embedding-005 supports max 20,000 tokens
  // Assuming ~4 chars per token, aim for 60,000 chars (~15,000 tokens) for safety
  constructor(chunkSize: number = 60000, chunkOverlap: number = 2000) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  /**
   * Set OCR service for fallback when PDF parsing fails
   */
  setOCRService(ocrService: OCRService): void {
    this.ocrService = ocrService;
  }

  chunkText(content: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let chunkIndex = 0;
    let start = 0;

    while (start < content.length) {
      let end = Math.min(content.length, start + this.chunkSize);
      
      // Try to break at sentence boundary if not at end of content
      if (end < content.length) {
        // Look for sentence endings within last 500 chars
        const searchStart = Math.max(end - 500, start);
        const segment = content.substring(searchStart, end);
        const sentenceEndings = ['. ', '.\n', '! ', '!\n', '? ', '?\n'];
        
        let bestBreak = -1;
        for (const ending of sentenceEndings) {
          const index = segment.lastIndexOf(ending);
          if (index > bestBreak) {
            bestBreak = index;
          }
        }

        if (bestBreak !== -1) {
          end = searchStart + bestBreak + 1;
        }
      }
      
      const chunk = content.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push({
          content: chunk,
          index: chunkIndex++,
          startChar: start,
          endChar: end
        });
      }

      // Move start with overlap, ensuring progress
      start = end - this.chunkOverlap;
      if (start <= (chunks[chunks.length - 1]?.startChar || 0)) {
        start = end;
      }
      
      if (end >= content.length) break;
    }

    return chunks;
  }

  prepareDocumentChunks(
    document: MedicalDocument, 
    textContent: string,
    pageNumber?: number
  ): ChunkBeforeEmbedding[] {
    const chunks = this.chunkText(textContent);

    return chunks.map(chunk => ({
      chunkId: uuidv4(),
      documentId: document.id,
      source: document.title,
      category: document.category,
      pageNumber,
      chunkIndex: chunk.index,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      content: chunk.content,
      metadata: {
        documentTitle: document.title,
        language: document.metadata.language,
        audience: document.metadata.audience
      },
      createdAt: Date.now()
    }));
  }

  async extractTextFromPDF(pdfPath: string): Promise<string> {
    try {
      console.log(`Extracting text from: ${pdfPath}`);
      
      // Suppress console warnings from pdf-parse
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: any[]) => {
        const msg = args.join(' ');
        // Filter out pdf-parse hex string warnings
        if (!msg.includes('Ignoring invalid character') && !msg.includes('in hex string')) {
          warnings.push(msg);
        }
      };
      
      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = await readFile(pdfPath);
        const data = await pdfParse(dataBuffer);
        
        // Restore console.warn
        console.warn = originalWarn;
        
        // Log any non-filtered warnings
        if (warnings.length > 0) {
          warnings.forEach(w => originalWarn(w));
        }
        
        if (!data.text || data.text.trim().length === 0) {
          console.warn(`  ⚠️  No text extracted (might be image-based)`);
          // Try OCR fallback
          return await this.tryOCRExtraction(pdfPath);
        } else {
          const cleanedText = data.text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .trim();
          
          console.log(`  ✅ Extracted ${cleanedText.length} characters from ${data.numpages} pages`);
          return cleanedText;
        }
      } catch (parseError: any) {
        // Restore console.warn
        console.warn = originalWarn;
        
        // Check if it's an "Invalid PDF structure" error or similar
        const errorMessage = parseError?.message || String(parseError);
        if (
          errorMessage.includes('Invalid PDF') || 
          errorMessage.includes('Invalid PDF structure') ||
          errorMessage.includes('Malformed PDF')
        ) {
          console.warn(`  ⚠️  PDF structure invalid (may be image-based)`);
          // Try OCR fallback
          return await this.tryOCRExtraction(pdfPath);
        } else {
          // Re-throw if it's a different error
          throw parseError;
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      // Don't log full stack trace for known authentication errors
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('invalid_rapt')) {
        console.error(`  ❌ OCR authentication failed. Run: gcloud auth application-default login`);
      } else {
        console.error(`  ❌ Error extracting text from PDF:`, errorMessage);
      }
      return '';
    }
  }

  private async tryOCRExtraction(pdfPath: string): Promise<string> {
    if (!this.ocrService) {
      console.warn(`  ⚠️  OCR service not available`);
      return '';
    }

    try {
      console.log(`  🔍 Attempting OCR extraction...`);
      const ocrText = await this.ocrService.extractTextFromImagePDF(pdfPath);
      
      if (ocrText && ocrText.trim().length > 0) {
        const cleanedText = ocrText
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, ' ')
          .trim();
        
        console.log(`  ✅ OCR extracted ${cleanedText.length} characters`);
        return cleanedText;
      } else {
        console.warn(`  ⚠️  OCR returned no text`);
        return '';
      }
    } catch (ocrError: any) {
      const errorMessage = ocrError?.message || String(ocrError);
      // Check if it's an authentication error
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('invalid_rapt')) {
        console.error(`  ❌ OCR authentication failed. Run: gcloud auth application-default login`);
      } else {
        console.error(`  ❌ OCR extraction failed:`, errorMessage.substring(0, 200));
      }
      return '';
    }
  }

  isTextSufficient(text: string, minLength: number = 100): boolean {
    return text.trim().length >= minLength;
  }
}