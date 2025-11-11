import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { HybridRAGService } from '../services/hybrid-rag.service';
import { TRPCError } from '@trpc/server';

// Lazy initialization: only create service when first accessed
let hybridRAGService: HybridRAGService | null = null;

function getHybridRAGService(): HybridRAGService {
  if (!hybridRAGService) {
    hybridRAGService = new HybridRAGService();
  }
  return hybridRAGService;
}

export const ragRouter = router({
  
  // Public query endpoint (uses intelligent routing)
  query: publicProcedure
    .input(z.object({
      message: z.string().min(3).max(500),
      conversationId: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        const service = getHybridRAGService();
        const result = await service.query(
          input.message,
          'patient'
        );

        return {
          answer: result.answer,
          sources: result.sources,
          confidence: result.confidence,
          processingTime: result.processingTime,
          strategyUsed: result.strategyUsed,
          fallbackUsed: result.fallbackUsed,
        };
      } catch (error: any) {
        console.error('RAG query error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to process query'
        });
      }
    }),

  // Professional query endpoint (no auth required)
  professionalQuery: publicProcedure
    .input(z.object({
      message: z.string().min(3).max(1000),
      conversationId: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        const service = getHybridRAGService();
        const result = await service.query(
          input.message,
          'healthcare-professional'
        );

        return {
          answer: result.answer,
          sources: result.sources,
          confidence: result.confidence,
          processingTime: result.processingTime,
          strategyUsed: result.strategyUsed,
          fallbackUsed: result.fallbackUsed,
        };
      } catch (error: any) {
        console.error('RAG professional query error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to process query'
        });
      }
    }),

  // Get vector database statistics
  getVectorStats: publicProcedure
    .query(async () => {
      try {
        const { Firestore } = require('@google-cloud/firestore');
        const firestore = new Firestore();
        
        // Try to get metadata first
        const metadataDoc = await firestore
          .collection('vectorDB')
          .doc('metadata')
          .get();

        if (metadataDoc.exists) {
          const metadata = metadataDoc.data();
          // Ensure it matches the expected format
          return {
            embeddingModel: metadata?.embeddingModel || 'text-embedding-005',
            dimensions: metadata?.dimensions || 768,
            totalDocuments: metadata?.totalDocuments || 0,
            totalChunks: metadata?.totalChunks || 0,
            updatedAt: metadata?.updatedAt || Date.now(),
          };
        }

        // If metadata doesn't exist, calculate from actual data
        const chunksSnapshot = await firestore
          .collection('vectorChunks')
          .get();

        const documentIds = new Set<string>();
        chunksSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.documentId) {
            documentIds.add(data.documentId);
          }
        });

        return {
          embeddingModel: 'text-embedding-005',
          dimensions: 768,
          totalDocuments: documentIds.size,
          totalChunks: chunksSnapshot.size,
          updatedAt: Date.now(),
        };
      } catch (error: any) {
        console.error('Error getting vector stats:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get vector stats: ${error.message}`,
        });
      }
    }),

  // Health check for both RAG systems
  healthCheck: publicProcedure
    .query(async () => {
      try {
        const service = getHybridRAGService();
        const health = await service.healthCheck();
        return {
          status: 'ok',
          systems: health,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error('Health check failed:', error);
        return {
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    })
});