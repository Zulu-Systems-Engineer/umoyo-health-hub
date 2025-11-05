import { PredictionServiceClient } from '@google-cloud/aiplatform';
import type { protos } from '@google-cloud/aiplatform';

export class EmbeddingService {
  private client: PredictionServiceClient;
  private projectId: string;
  private location: string;
  private modelName: string;
  private dimensions: number;

  constructor(
    projectId: string = process.env.GCP_PROJECT_ID || 'umoyo-health-hub',
    location: string = 'us-central1',
    modelName: string = 'text-embedding-005'
  ) {
    this.client = new PredictionServiceClient();
    this.projectId = projectId;
    this.location = location;
    this.modelName = modelName;
    this.dimensions = 768; // text-embedding-005 produces 768-dim vectors
  }

  /**
   * Generate embedding for a single text chunk
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelName}`;

    try {
      // Format instance - Google Cloud AI Platform expects this structure
      const instance = {
        content: text
      };

      const [response] = await this.client.predict({
        endpoint,
        instances: [{ structValue: { fields: { content: { stringValue: text } } } }]
      });

      // Parse predictions from response
      const predictions = response.predictions;
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from API');
      }

      // Extract embedding values from the first prediction
      const prediction = predictions[0];
      const embeddingsField = prediction.structValue?.fields?.embeddings;
      const valuesField = embeddingsField?.structValue?.fields?.values;
      const valuesList = valuesField?.listValue?.values;

      if (!valuesList) {
        throw new Error('No embedding values found in response');
      }

      // Convert to number array
      const embedding = valuesList.map(v => v.numberValue || 0);

      if (embedding.length === 0) {
        throw new Error('Empty embedding returned from API');
      }

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelName}`;

    try {
      // Format instances
      const instances = texts.map(text => ({
        structValue: {
          fields: {
            content: { stringValue: text }
          }
        }
      }));

      const [response] = await this.client.predict({
        endpoint,
        instances
      });

      const predictions = response.predictions;
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from API');
      }

      // Extract embeddings from each prediction
      const embeddings = predictions.map(prediction => {
        const embeddingsField = prediction.structValue?.fields?.embeddings;
        const valuesField = embeddingsField?.structValue?.fields?.values;
        const valuesList = valuesField?.listValue?.values;

        if (!valuesList) {
          throw new Error('No embedding values found in response');
        }

        return valuesList.map(v => v.numberValue || 0);
      });

      return embeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate multimodal embedding (text + image)
   * For future use with medical images
   */
  async generateMultimodalEmbedding(
    text: string, 
    imageBase64?: string
  ): Promise<number[]> {
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/multimodalembedding@001`;

    const fields: any = {
      text: { stringValue: text }
    };

    if (imageBase64) {
      fields.image = {
        structValue: {
          fields: {
            bytesBase64Encoded: { stringValue: imageBase64 }
          }
        }
      };
    }

    try {
      const [response] = await this.client.predict({
        endpoint,
        instances: [{ structValue: { fields } }]
      });

      const predictions = response.predictions;
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from API');
      }

      const prediction = predictions[0];
      
      // Try to get embedding from different possible fields
      const embeddingField = 
        prediction.structValue?.fields?.multimodalEmbedding ||
        prediction.structValue?.fields?.imageEmbedding ||
        prediction.structValue?.fields?.textEmbedding;

      const valuesList = embeddingField?.listValue?.values;

      if (!valuesList) {
        throw new Error('No embedding found in multimodal response');
      }

      return valuesList.map(v => v.numberValue || 0);
    } catch (error) {
      console.error('Error generating multimodal embedding:', error);
      throw error;
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }
}