import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
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

  // Professional query endpoint (requires authentication)
  professionalQuery: protectedProcedure
    .input(z.object({
      message: z.string().min(3).max(1000),
      conversationId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user is authenticated and has professional role
      if (!ctx.user || ctx.user.role !== 'healthcare-professional') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Professional access required'
        });
      }

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
  getVectorStats: protectedProcedure
    .query(async () => {
      const { Firestore } = require('@google-cloud/firestore');
      const firestore = new Firestore();
      
      const metadata = await firestore
        .collection('vectorDB')
        .doc('metadata')
        .get();

      return metadata.exists ? metadata.data() : null;
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