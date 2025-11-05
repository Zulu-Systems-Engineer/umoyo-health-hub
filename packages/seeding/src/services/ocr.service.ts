import { ImageAnnotatorClient } from '@google-cloud/vision';

export class OCRService {
  private client: ImageAnnotatorClient;

  constructor() {
    this.client = new ImageAnnotatorClient();
  }

  /**
   * Extract text from image-based PDF using OCR
   * @param pdfPath - Path to the PDF file (local file path or GCS URI)
   * @returns Extracted text content
   */
  async extractTextFromImagePDF(pdfPath: string): Promise<string> {
    try {
      const [result] = await this.client.documentTextDetection({
        image: {
          source: {
            filename: pdfPath
          }
        }
      });
      
      const fullTextAnnotation = result.fullTextAnnotation;
      
      return fullTextAnnotation?.text || '';
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract text from image file
   * @param imagePath - Path to the image file (local file path or GCS URI)
   * @returns Extracted text content
   */
  async extractTextFromImage(imagePath: string): Promise<string> {
    try {
      const [result] = await this.client.textDetection({
        image: {
          source: {
            filename: imagePath
          }
        }
      });
      
      const detections = result.textAnnotations;
      
      if (detections && detections.length > 0) {
        // The first element contains the full text
        return detections[0].description || '';
      }
      
      return '';
    } catch (error) {
      console.error('OCR extraction from image failed:', error);
      throw error;
    }
  }

  /**
   * Extract text from GCS URI
   * @param gcsUri - Google Cloud Storage URI (e.g., gs://bucket-name/file.pdf)
   * @returns Extracted text content
   */
  async extractTextFromGCS(gcsUri: string): Promise<string> {
    try {
      const [result] = await this.client.documentTextDetection({
        image: {
          source: {
            imageUri: gcsUri
          }
        }
      });
      
      const fullTextAnnotation = result.fullTextAnnotation;
      
      return fullTextAnnotation?.text || '';
    } catch (error) {
      console.error('OCR extraction from GCS failed:', error);
      throw error;
    }
  }
}

