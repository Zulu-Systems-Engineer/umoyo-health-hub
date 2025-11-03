/**
 * Chat Router
 * Handles chat/RAG query endpoints
 */

import { router, publicProcedure } from '../app';
import { chatQuerySchema, type ChatResponse } from '@umoyo/shared';
import { ragService } from '../services/rag.service';
import { geminiService } from '../services/gemini.service';
import type { SearchContext } from '../services/rag.service';

export const chatRouter = router({
  /**
   * Query endpoint - Main RAG-powered chat query
   */
  query: publicProcedure
    .input(chatQuerySchema)
    .mutation(async ({ input }): Promise<ChatResponse> => {
      const { message, sessionId, context } = input;

      try {
        // 1. Safety check
        const safetyCheck = await geminiService.checkSafety(message);
        if (!safetyCheck.isSafe) {
          throw new Error(
            `Query blocked for safety reasons: ${safetyCheck.reason || 'Inappropriate content'}`
          );
        }

        // 2. Retrieve relevant documents using RAG service
        const searchContext: SearchContext | undefined = context
          ? {
              category: context.category as any,
              language: context.language as any,
              audience: context.audience as any,
            }
          : undefined;

        const sources = await ragService.searchDocuments(message, searchContext, {
          limit: 5, // Get top 5 most relevant documents
        });

        if (sources.length === 0) {
          return {
            message: {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content:
                "I couldn't find specific information in our medical knowledge base to answer your question. Please consult a qualified healthcare professional for personalized medical advice.",
              timestamp: new Date(),
            },
            sources: [],
            sessionId: sessionId || `session-${Date.now()}`,
          };
        }

        // 3. Generate response using Gemini with context
        const responseText = await geminiService.generateResponse(message, sources);

        // 4. Return response with sources
        return {
          message: {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
            sources: sources.slice(0, 3), // Include top 3 sources in message
          },
          sources: sources,
          sessionId: sessionId || `session-${Date.now()}`,
        };
      } catch (error: any) {
        console.error('[Chat Router] Error processing query:', error);

        // Return error response
        return {
          message: {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content:
              'I apologize, but I encountered an error processing your question. Please try again or consult a healthcare professional for immediate assistance.',
            timestamp: new Date(),
          },
          sources: [],
          sessionId: sessionId || `session-${Date.now()}`,
        };
      }
    }),

  /**
   * Streaming query endpoint (for future implementation)
   */
  queryStream: publicProcedure
    .input(chatQuerySchema)
    .subscription(async function* () {
      // TODO: Implement streaming response
      // This would use tRPC subscriptions or Server-Sent Events
      yield {
        type: 'error' as const,
        message: 'Streaming not yet implemented',
      };
    }),
});
