// Lazy imports - these will be loaded at runtime, not during deployment analysis
type VertexAI = any;
type Content = any;
type Firestore = any;
import { config } from '../config';
export interface RAGQueryResult {
  answer: string;
  citations: Array<{
    chunkId: string;
    source: string;
    content: string;
    pageNumber?: number;
    similarity: number;
  }>;
  confidence: number;
  processingTime: number;
}

export interface VectorChunk {
  chunkId: string;
  source: string;
  content: string;
  pageNumber?: number;
  embedding: number[];
}

export class RAGQueryService {
  private vertexAI: VertexAI | null = null;
  private firestore: Firestore | null = null;
  private projectId: string;
  private location: string;

  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || 'umoyo-health-hub';
    this.location = 'us-central1';
    // Don't initialize VertexAI and Firestore in constructor
    // to avoid blocking during Firebase deployment
  }

  /**
   * Lazily initialize VertexAI client only when needed
   */
  private getVertexAI(): any {
    if (!this.vertexAI) {
      const { VertexAI } = require('@google-cloud/vertexai');
      this.vertexAI = new VertexAI({
        project: this.projectId,
        location: this.location
      });
    }
    return this.vertexAI;
  }

  /**
   * Lazily initialize Firestore client only when needed
   */
  private getFirestore(): any {
    if (!this.firestore) {
      const { Firestore } = require('@google-cloud/firestore');
      this.firestore = new Firestore();
    }
    return this.firestore;
  }

  /**
   * Main RAG query method
   */
  async query(
    userQuery: string,
    userRole: 'patient' | 'healthcare-professional',
    conversationHistory?: Content[]
  ): Promise<RAGQueryResult> {
    const startTime = Date.now();

    // Step 1: Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(userQuery);

    // Step 2: Search for similar chunks
    const similarChunks = await this.searchSimilarChunks(queryEmbedding, 5);

    // Step 3: Build grounding context
    const groundingContext = this.buildGroundingContext(similarChunks);

    // Step 4: Generate answer with Gemini
    const answer = await this.generateAnswer(
      userQuery,
      groundingContext,
      userRole,
      conversationHistory
    );

    // Step 5: Extract citations
    const citations = similarChunks.map(chunk => ({
      chunkId: chunk.chunkId,
      source: chunk.source,
      content: chunk.content.substring(0, 200) + '...',
      pageNumber: chunk.pageNumber,
      similarity: chunk.similarity
    }));

    const processingTime = Date.now() - startTime;

    return {
      answer,
      citations,
      confidence: this.calculateConfidence(similarChunks),
      processingTime
    };
  }

  /**
   * Generate embedding for user query
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const { PredictionServiceClient } = require('@google-cloud/aiplatform');
    const client = new PredictionServiceClient();
    
    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/text-embedding-005`;

    const [response] = await client.predict({
      endpoint,
      instances: [{ content: query }]
    });

    const predictions = (response as any).predictions as Array<{ embeddings: { values: number[] } }>;
    return predictions?.[0]?.embeddings?.values || [];
  }

  /**
   * Search Firestore for similar chunks
   */
  private async searchSimilarChunks(
    queryEmbedding: number[],
    topK: number
  ): Promise<Array<VectorChunk & { similarity: number }>> {
    const firestore = this.getFirestore();
    const snapshot = await firestore
      .collection('vectorChunks')
      .get();

    const results = snapshot.docs.map((doc: any) => {
      const chunk = doc.data() as VectorChunk;
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      return { ...chunk, similarity };
    });

    return results
      .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return (normA && normB) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  /**
   * Build grounding context from similar chunks
   */
  private buildGroundingContext(
    chunks: Array<VectorChunk & { similarity: number }>
  ): string {
    return chunks
      .map((chunk, index) => {
        return `[${index + 1}] Source: ${chunk.source}${chunk.pageNumber ? `, Page ${chunk.pageNumber}` : ''}\nContent: ${chunk.content}\n`;
      })
      .join('\n---\n\n');
  }

  /**
   * Generate answer using Gemini with RAG context
   */
  private async generateAnswer(
    query: string,
    groundingContext: string,
    userRole: string,
    conversationHistory?: Content[]
  ): Promise<string> {
    const systemPrompt = userRole === 'patient'
      ? 'You are Umoyo Health Assistant, a helpful medical information service for patients in Zambia. Explain medical concepts in simple, clear language. Always emphasize when to consult healthcare professionals. Use the provided context to answer accurately.'
      : 'You are Umoyo Health Assistant, an evidence-based clinical decision support tool for healthcare professionals in Zambia. Provide accurate, clinically relevant information with proper citations. Use the provided context to give detailed, professional answers.';

    const vertexAI = this.getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: config.gemini.modelName,
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        maxOutputTokens: config.gemini.maxTokens,
        temperature: config.gemini.temperature,
        topP: config.gemini.topP,
        topK: config.gemini.topK
      }
    });

    const prompt = `Context from medical knowledge base:

${groundingContext}

User Question: ${query}

Please provide a comprehensive answer based on the context above. Include citation numbers [1], [2], etc. when referencing specific information from the context.`;

    const chat = model.startChat({
      history: conversationHistory || []
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    
    return response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  }

  /**
   * Calculate confidence score based on similarity scores
   */
  private calculateConfidence(
    chunks: Array<{ similarity: number }>
  ): number {
    if (chunks.length === 0) return 0;
    
    const avgSimilarity = chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length;
    return Math.min(avgSimilarity * 100, 100);
  }
}