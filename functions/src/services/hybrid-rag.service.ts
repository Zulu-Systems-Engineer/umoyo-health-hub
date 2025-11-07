/**
 * Hybrid RAG Service
 * Combines results from Vertex AI RAG and Custom RAG systems
 */

import { VertexRAGService } from './vertex-rag.service';
import { RAGQueryService } from './rag-query.service';
import { QueryRouterService, RAGStrategy } from './query-router.service';
import { Content } from '@google-cloud/vertexai';

interface HybridRAGResult {
  answer: string;
  sources: Array<{
    title: string;
    snippet: string;
    source: 'vertex' | 'custom';
    confidence?: number;
    uri?: string;
  }>;
  strategyUsed: RAGStrategy;
  confidence: number;
  processingTime: number;
  fallbackUsed?: boolean;
}

export class HybridRAGService {
  private vertexRAG: VertexRAGService;
  private customRAG: RAGQueryService;
  private router: QueryRouterService;

  constructor() {
    this.vertexRAG = new VertexRAGService();
    this.customRAG = new RAGQueryService();
    this.router = new QueryRouterService();
    
    // Set the Vertex RAG corpus ID from environment
    const corpusId = process.env.VERTEX_RAG_CORPUS_ID;
    if (corpusId) {
      this.vertexRAG.setCorpusId(corpusId);
    }
  }

  /**
   * Main query method that intelligently routes to the best RAG system
   */
  async query(
    userQuery: string,
    userRole: 'patient' | 'healthcare-professional',
    conversationHistory?: Content[]
  ): Promise<HybridRAGResult> {
    const startTime = Date.now();

    // Step 1: Analyze query and determine strategy
    let analysis = this.router.analyzeQuery(userQuery);
    
    // Adjust strategy based on user role
    analysis = this.router.adjustStrategyForRole(analysis, userRole);

    console.log(`[Hybrid RAG] Strategy: ${analysis.strategy} (confidence: ${analysis.confidence})`);
    console.log(`[Hybrid RAG] Reasoning: ${analysis.reasoning}`);

    let result: HybridRAGResult;

    try {
      // Step 2: Execute based on strategy
      switch (analysis.strategy) {
        case 'vertex':
          result = await this.queryVertex(userQuery, startTime);
          break;
        case 'custom':
          result = await this.queryCustom(userQuery, userRole, conversationHistory, startTime);
          break;
        case 'hybrid':
          result = await this.queryHybrid(userQuery, userRole, conversationHistory, startTime);
          break;
      }

      return result;
    } catch (error: any) {
      console.error(`[Hybrid RAG] Primary strategy failed: ${error.message}`);
      
      // Fallback logic
      return await this.handleFallback(userQuery, userRole, conversationHistory, analysis.strategy, startTime, error);
    }
  }

  /**
   * Query using Vertex RAG only
   */
  private async queryVertex(query: string, startTime: number): Promise<HybridRAGResult> {
    const vertexResult = await this.vertexRAG.query(query, 5);

    return {
      answer: vertexResult.answer,
      sources: vertexResult.sources.map(s => ({
        title: s.title,
        snippet: s.snippet,
        source: 'vertex' as const,
        uri: s.uri,
      })),
      strategyUsed: 'vertex',
      confidence: vertexResult.confidence,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Query using Custom RAG only
   */
  private async queryCustom(
    query: string,
    userRole: 'patient' | 'healthcare-professional',
    conversationHistory: Content[] | undefined,
    startTime: number
  ): Promise<HybridRAGResult> {
    const customResult = await this.customRAG.query(query, userRole, conversationHistory);

    return {
      answer: customResult.answer,
      sources: customResult.citations.map(c => ({
        title: c.source,
        snippet: c.content,
        source: 'custom' as const,
        confidence: c.similarity,
      })),
      strategyUsed: 'custom',
      confidence: customResult.confidence,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Query using both systems and merge results
   */
  private async queryHybrid(
    query: string,
    userRole: 'patient' | 'healthcare-professional',
    conversationHistory: Content[] | undefined,
    startTime: number
  ): Promise<HybridRAGResult> {
    // Execute both queries in parallel
    const [vertexResult, customResult] = await Promise.allSettled([
      this.vertexRAG.query(query, 3),
      this.customRAG.query(query, userRole, conversationHistory),
    ]);

    // Handle results
    const vertexData = vertexResult.status === 'fulfilled' ? vertexResult.value : null;
    const customData = customResult.status === 'fulfilled' ? customResult.value : null;

    if (!vertexData && !customData) {
      throw new Error('Both RAG systems failed');
    }

    // Merge sources from both systems
    const mergedSources = [];
    
    if (vertexData) {
      mergedSources.push(
        ...vertexData.sources.map(s => ({
          title: s.title,
          snippet: s.snippet,
          source: 'vertex' as const,
          uri: s.uri,
        }))
      );
    }

    if (customData) {
      mergedSources.push(
        ...customData.citations.map(c => ({
          title: c.source,
          snippet: c.content,
          source: 'custom' as const,
          confidence: c.similarity,
        }))
      );
    }

    // Prioritize the answer from the more confident system
    let answer: string;
    let confidence: number;

    if (vertexData && customData) {
      if (vertexData.confidence >= customData.confidence) {
        answer = vertexData.answer;
        confidence = (vertexData.confidence + customData.confidence) / 2;
      } else {
        answer = customData.answer;
        confidence = (vertexData.confidence + customData.confidence) / 2;
      }
    } else if (vertexData) {
      answer = vertexData.answer;
      confidence = vertexData.confidence * 0.8; // Reduce confidence since only one system worked
    } else {
      answer = customData!.answer;
      confidence = customData!.confidence * 0.8;
    }

    return {
      answer,
      sources: mergedSources,
      strategyUsed: 'hybrid',
      confidence,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Handle fallback when primary strategy fails
   */
  private async handleFallback(
    query: string,
    userRole: 'patient' | 'healthcare-professional',
    conversationHistory: Content[] | undefined,
    failedStrategy: RAGStrategy,
    startTime: number,
    originalError: Error
  ): Promise<HybridRAGResult> {
    console.log(`[Hybrid RAG] Attempting fallback from ${failedStrategy}`);

    try {
      // If Vertex failed, try Custom
      if (failedStrategy === 'vertex') {
        const customResult = await this.queryCustom(query, userRole, conversationHistory, startTime);
        return {
          ...customResult,
          fallbackUsed: true,
          confidence: customResult.confidence * 0.7, // Reduce confidence for fallback
        };
      }

      // If Custom failed, try Vertex
      if (failedStrategy === 'custom') {
        const vertexResult = await this.queryVertex(query, startTime);
        return {
          ...vertexResult,
          fallbackUsed: true,
          confidence: vertexResult.confidence * 0.7,
        };
      }

      // If hybrid failed, try just Custom (more reliable)
      const customResult = await this.queryCustom(query, userRole, conversationHistory, startTime);
      return {
        ...customResult,
        fallbackUsed: true,
        confidence: customResult.confidence * 0.6,
      };
    } catch (fallbackError: any) {
      console.error(`[Hybrid RAG] Fallback also failed: ${fallbackError.message}`);
      
      // Return a helpful error message
      return {
        answer: "I apologize, but I'm unable to process your query at the moment due to technical difficulties. Please try rephrasing your question or contact a healthcare professional for immediate assistance.",
        sources: [],
        strategyUsed: failedStrategy,
        confidence: 0,
        processingTime: Date.now() - startTime,
        fallbackUsed: true,
      };
    }
  }

  /**
   * Check health of both RAG systems
   */
  async healthCheck(): Promise<{
    vertex: { available: boolean; corpusReady: boolean };
    custom: { available: boolean };
  }> {
    const [vertexStatus, customStatus] = await Promise.allSettled([
      this.vertexRAG.checkCorpusStatus(),
      this.customRAG.query('health check', 'patient'),
    ]);

    return {
      vertex: {
        available: vertexStatus.status === 'fulfilled',
        corpusReady: vertexStatus.status === 'fulfilled' && vertexStatus.value.ready,
      },
      custom: {
        available: customStatus.status === 'fulfilled',
      },
    };
  }
}

