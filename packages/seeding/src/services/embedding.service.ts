import { PredictionServiceClient } from '@google-cloud/aiplatform';
import type { protos } from '@google-cloud/aiplatform';
import { getVertexAIConfig } from '../config/auth';

export class EmbeddingService {
  private client: PredictionServiceClient;
  private projectId: string;
  private location: string;
  private modelName: string;
  private dimensions: number;
  private batchSize: number;
  private maxTokensPerBatch: number;
  private rateLimitDelayMs: number;
  private maxRetriesDefault: number;

  constructor(
    projectId: string = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'umoyo-health-hub',
    location: string = process.env.GCP_LOCATION || process.env.RAG_LOCATION || 'us-central1',
    modelName: string = process.env.EMBEDDING_MODEL || 'text-embedding-005'
  ) {
    // Initialize client with increased gRPC message limits and timeout
    this.client = new PredictionServiceClient({
      grpcOptions: {
        'grpc.max_receive_message_length': 100 * 1024 * 1024, // 100MB
        'grpc.max_send_message_length': 100 * 1024 * 1024, // 100MB
      }
    });
    const cfg = getVertexAIConfig();
    this.projectId = cfg.project || projectId;
    this.location = cfg.location || location;
    this.modelName = modelName;
    this.dimensions = 768;
    const envBatch = parseInt(process.env.EMBEDDING_BATCH_SIZE || '', 10);
    this.batchSize = Math.min(Number.isFinite(envBatch) ? envBatch : 10, 250);
    const envTokens = parseInt(process.env.TARGET_TOKENS || '', 10);
    this.maxTokensPerBatch = Number.isFinite(envTokens) ? envTokens : 15000;
    const envDelay = parseInt(process.env.EMBEDDING_RATE_LIMIT_DELAY_MS || '', 10);
    this.rateLimitDelayMs = Number.isFinite(envDelay) ? envDelay : 1000;
    const envRetries = parseInt(process.env.EMBEDDING_MAX_RETRIES || '', 10);
    this.maxRetriesDefault = Number.isFinite(envRetries) ? envRetries : 3;
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate chunks before sending to API
   */
  private validateChunks(texts: string[]): void {
    const maxTokens = 20000;
    const oversizedChunks = texts
      .map((text, idx) => ({ text, idx, tokens: this.estimateTokenCount(text) }))
      .filter(chunk => chunk.tokens > maxTokens);
    
    if (oversizedChunks.length > 0) {
      console.warn(`⚠️ Warning: ${oversizedChunks.length} chunks exceed token limit`);
      oversizedChunks.forEach(chunk => {
        console.warn(`   Chunk ${chunk.idx}: ~${chunk.tokens} tokens (${chunk.text.length} chars)`);
      });
      throw new Error(
        `${oversizedChunks.length} chunks exceed the 20k token limit. Reduce chunk size.`
      );
    }
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
   * Generate embeddings for multiple texts in batch with retry logic
   */
  async generateEmbeddingsBatch(texts: string[], maxRetries: number = this.maxRetriesDefault): Promise<number[][]> {
    // Validate chunks before processing
    this.validateChunks(texts);

    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelName}`;

    const MAX_INSTANCES = this.batchSize;
    const MAX_TOKENS_PER_BATCH = this.maxTokensPerBatch;
    const RATE_LIMIT_DELAY_MS = this.rateLimitDelayMs;

    const allEmbeddings: number[][] = [];
    
    console.log(`  📦 Processing ${texts.length} chunks in batches of up to ${MAX_INSTANCES}...`);

    let i = 0;
    while (i < texts.length) {
      let tokenSum = 0;
      const batchTexts: string[] = [];

      // Build batch within token limits
      while (i < texts.length && batchTexts.length < MAX_INSTANCES) {
        const t = texts[i];
        const estTokens = this.estimateTokenCount(t);
        if (batchTexts.length > 0 && tokenSum + estTokens > MAX_TOKENS_PER_BATCH) break;
        batchTexts.push(t);
        tokenSum += estTokens;
        i++;
      }

      const batchNum = Math.floor((i - batchTexts.length) / MAX_INSTANCES) + 1;
      const totalBatches = Math.ceil(texts.length / MAX_INSTANCES);
      console.log(`     Batch ${batchNum}/${totalBatches} (${batchTexts.length} chunks, ~${tokenSum} tokens)`);

      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
          const instances = batchTexts.map(text => ({
            structValue: {
              fields: {
                content: { stringValue: text }
              }
            }
          }));

          // Increased timeout to 5 minutes
          const [response] = await this.client.predict(
            {
              endpoint,
              instances
            },
            { timeout: 300000 }
          );

          const predictions = response.predictions;
          if (!predictions || predictions.length === 0) {
            throw new Error('No predictions returned from API');
          }

          const batchEmbeddings = predictions.map(prediction => {
            const embeddingsField = prediction.structValue?.fields?.embeddings;
            const valuesField = embeddingsField?.structValue?.fields?.values;
            const valuesList = valuesField?.listValue?.values;

            if (!valuesList) {
              throw new Error('No embedding values found in response');
            }

            return valuesList.map(v => v.numberValue || 0);
          });

          allEmbeddings.push(...batchEmbeddings);
          success = true;

          // Rate limiting: wait between batches
          if (i < texts.length) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
          }
        } catch (error: any) {
          attempt++;
          console.error(`     ⚠️ Batch ${batchNum} failed (attempt ${attempt}/${maxRetries}):`, error.message);

          if (attempt < maxRetries) {
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
            console.log(`     ⏳ Retrying in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          } else {
            throw new Error(
              `Failed to process batch ${batchNum} after ${maxRetries} attempts: ${error.message}`
            );
          }
        }
      }
    }

    return allEmbeddings;
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

  getModelName(): string {
    return this.modelName;
  }
}