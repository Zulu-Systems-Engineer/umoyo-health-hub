/**
 * Vertex AI RAG Engine Service
 * Uses Google's managed RAG system for general medical knowledge
 */

import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';

interface VertexRAGSource {
  title: string;
  snippet: string;
  uri?: string;
}

interface VertexRAGResult {
  answer: string;
  sources: VertexRAGSource[];
  confidence: number;
}

export class VertexRAGService {
  private vertexAI: VertexAI;
  private projectId: string;
  private location: string;
  private ragCorpusId?: string;
  private auth: GoogleAuth;

  constructor(
    projectId: string = process.env.GCP_PROJECT_ID || 'umoyo-health-hub',
    location: string = 'us-central1'
  ) {
    this.projectId = projectId;
    this.location = location;
    this.vertexAI = new VertexAI({ 
      project: projectId, 
      location: location 
    });
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  /**
   * Set the RAG corpus ID to use for queries
   */
  setCorpusId(corpusId: string): void {
    this.ragCorpusId = corpusId;
  }

  /**
   * Create a new RAG corpus using REST API
   */
  async createRAGCorpus(
    displayName: string = 'umoyo-general-medical',
    description: string = 'General medical knowledge base for Umoyo Health Hub'
  ): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/ragCorpora`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          description,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create RAG corpus: ${error}`);
      }

      const corpus = await response.json() as { name: string };
      this.ragCorpusId = corpus.name;
      
      console.log(`✅ Created RAG corpus: ${corpus.name}`);
      return corpus.name;
    } catch (error: any) {
      console.error('Failed to create RAG corpus:', error);
      throw error;
    }
  }

  /**
   * Import documents from GCS into the RAG corpus
   */
  async importDocuments(
    gcsUris: string[],
    chunkSize: number = 1024,
    chunkOverlap: number = 200
  ): Promise<void> {
    if (!this.ragCorpusId) {
      throw new Error('RAG corpus not initialized. Call createRAGCorpus() or setCorpusId() first.');
    }

    try {
      const accessToken = await this.getAccessToken();
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/${this.ragCorpusId}/ragFiles:import`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importRagFilesConfig: {
            gcsSource: {
              uris: gcsUris,
            },
            ragFileChunkingConfig: {
              chunkSize,
              chunkOverlap,
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to import documents: ${error}`);
      }

      console.log(`✅ Imported ${gcsUris.length} documents to Vertex RAG Engine`);
    } catch (error: any) {
      console.error('Failed to import documents:', error);
      throw error;
    }
  }

  /**
   * Query using Google's Vertex AI RAG Engine
   */
  async query(
    question: string,
    maxResults: number = 5
  ): Promise<VertexRAGResult> {
    if (!this.ragCorpusId) {
      throw new Error('RAG corpus not initialized. Call createRAGCorpus() or setCorpusId() first.');
    }

    try {
      const model = this.vertexAI.preview.getGenerativeModel({
        model: 'gemini-1.5-pro',
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: question,
              },
            ],
          },
        ],
        tools: [
          {
            retrieval: {
              vertexRagStore: {
                ragResources: [
                  {
                    ragCorpus: this.ragCorpusId,
                  },
                ],
                similarityTopK: maxResults,
              },
            },
          },
        ],
      });

      const response = result.response;
      const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract grounding metadata (sources)
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const sources = this.extractSources(groundingMetadata);

      // Calculate confidence based on grounding support
      const confidence = this.calculateConfidence(groundingMetadata);

      return {
        answer,
        sources,
        confidence,
      };
    } catch (error: any) {
      console.error('Vertex RAG query failed:', error);
      throw new Error(`Vertex RAG query failed: ${error.message}`);
    }
  }

  /**
   * Extract sources from grounding metadata
   */
  private extractSources(groundingMetadata: any): VertexRAGSource[] {
    if (!groundingMetadata?.retrievalQueries) {
      return [];
    }

    return groundingMetadata.retrievalQueries.map((query: any) => ({
      title: query.source || 'Unknown source',
      snippet: query.text || '',
      uri: query.uri,
    }));
  }

  /**
   * Calculate confidence score based on grounding metadata
   */
  private calculateConfidence(groundingMetadata: any): number {
    if (!groundingMetadata) return 0.5;

    // Check if response is grounded
    const groundingSupport = groundingMetadata.groundingSupport || [];
    const supportRatings = groundingSupport.map((s: any) => s.confidenceScore || 0);

    if (supportRatings.length === 0) return 0.5;

    // Average confidence across all grounding chunks
    const avgConfidence = supportRatings.reduce((a: number, b: number) => a + b, 0) / supportRatings.length;
    return Math.min(Math.max(avgConfidence, 0), 1);
  }

  /**
   * Check if the RAG corpus exists and is ready
   */
  async checkCorpusStatus(): Promise<{ exists: boolean; ready: boolean; fileCount?: number }> {
    if (!this.ragCorpusId) {
      return { exists: false, ready: false };
    }

    try {
      const accessToken = await this.getAccessToken();
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/${this.ragCorpusId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return { exists: false, ready: false };
      }

      const corpus = await response.json() as { state: string; ragFileCount?: number };
      return {
        exists: true,
        ready: corpus.state === 'READY',
        fileCount: corpus.ragFileCount || 0,
      };
    } catch (error) {
      console.error('Failed to check corpus status:', error);
      return { exists: false, ready: false };
    }
  }

  /**
   * Get access token for API calls
   */
  private async getAccessToken(): Promise<string> {
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();
    
    if (!tokenResponse.token) {
      throw new Error('Failed to obtain access token');
    }
    
    return tokenResponse.token;
  }
}

