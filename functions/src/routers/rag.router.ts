import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../app';
import { RAGQueryService } from '../services/rag-query.service';
import { TRPCError } from '@trpc/server';

const ragQueryService = new RAGQueryService();

export const ragRouter = router({
  
  // Public query endpoint (rate-limited for patients)
  query: publicProcedure
    .input(z.object({
      message: z.string().min(3).max(500),
      conversationId: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await ragQueryService.query(
          input.message,
          'patient'
        );

        return result;
      } catch (error) {
        console.error('RAG query error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process query'
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
      if (!ctx.auth || ctx.auth.role !== 'healthcare-professional') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Professional access required'
        });
      }

      try {
        const result = await ragQueryService.query(
          input.message,
          'healthcare-professional'
        );

        return result;
      } catch (error) {
        console.error('RAG professional query error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process query'
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
    })
});