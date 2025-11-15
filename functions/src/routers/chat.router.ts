/**
 * Chat Router
 * Handles chat/RAG query endpoints
 */

import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import type { DocumentSource } from '../services/rag.service';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeServices } from '../init';

// Type definitions
export interface ChatResponse {
  message: {
    id: string;
    role: 'assistant';
    content: string;
    timestamp: Date;
    sources?: DocumentSource[];
  };
  sources: DocumentSource[];
  sessionId: string;
}

// Schema definitions
export const chatQuerySchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),
  context: z.object({
    category: z.string().optional(),
    language: z.string().optional(),
    audience: z.string().optional(),
    region: z.string().optional(),
  }).optional(),
});

// Import services - they use lazy initialization internally
import { ragService } from '../services/rag.service';
import { geminiService } from '../services/gemini.service';
import type { SearchContext } from '../services/rag.service';

export const chatRouter = router({
  /**
   * Query endpoint - Main RAG-powered chat query
   */
  query: publicProcedure
    .input(chatQuerySchema)
    .mutation(async ({ input, ctx }): Promise<ChatResponse> => {
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

        const finalSessionId = sessionId || `session-${Date.now()}`;
        const assistantMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
          content: responseText,
          timestamp: new Date(),
          sources: sources.slice(0, 3), // Include top 3 sources in message
        };

         // 4. Save messages to conversation history (async, don't wait)
         // Ensure Firebase Admin is initialized before using Firestore
         initializeServices();
         const db = getFirestore();
         const userId = ctx.user?.uid || null; // Get user ID if authenticated
         Promise.all([
           // Save user message
           db
             .collection('conversations')
             .doc(finalSessionId)
             .collection('messages')
             .doc(`user-${Date.now()}`)
             .set({
               id: `user-${Date.now()}`,
               role: 'user',
               content: message,
               timestamp: new Date().toISOString(),
             }),
           // Save assistant message
           db
             .collection('conversations')
             .doc(finalSessionId)
             .collection('messages')
             .doc(assistantMessage.id)
             .set({
               ...assistantMessage,
               timestamp: assistantMessage.timestamp.toISOString(),
             }),
           // Update conversation metadata
           db
             .collection('conversations')
             .doc(finalSessionId)
             .set({
               lastMessageAt: new Date().toISOString(),
               userId: userId || null, // Link to user if authenticated
               createdAt: (await db.collection('conversations').doc(finalSessionId).get()).exists 
                 ? undefined 
                 : new Date().toISOString(),
             }, { merge: true }),
         ]).catch(err => {
           console.error('[Chat Router] Error saving conversation history:', err);
           // Don't throw - history saving is non-critical
         });

        // 5. Return response with sources
        return {
          message: assistantMessage,
          sources: sources,
          sessionId: finalSessionId,
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
   * Save conversation message to history
   */
  saveMessage: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      message: z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        timestamp: z.date(),
        sources: z.array(z.any()).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      try {
        // Ensure Firebase Admin is initialized before using Firestore
        initializeServices();
        const db = getFirestore();
        const { sessionId, message } = input;

        // Save message to conversation
        await db
          .collection('conversations')
          .doc(sessionId)
          .collection('messages')
          .doc(message.id)
          .set({
            ...message,
            timestamp: message.timestamp.toISOString(),
          });

        // Update conversation metadata
        const messagesCount = await db
          .collection('conversations')
          .doc(sessionId)
          .collection('messages')
          .count()
          .get();

        await db
          .collection('conversations')
          .doc(sessionId)
          .set({
            lastMessageAt: new Date().toISOString(),
            messageCount: messagesCount.data().count || 0,
          }, { merge: true });

        return { success: true };
      } catch (error: any) {
        console.error('[Chat Router] Error saving message:', error);
        throw new Error(`Failed to save message: ${error.message}`);
      }
    }),

  /**
   * Get conversation history
   */
  getHistory: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      try {
        // Ensure Firebase Admin is initialized before using Firestore
        initializeServices();
        const db = getFirestore();
        const { sessionId, limit } = input;

        const messagesSnapshot = await db
          .collection('conversations')
          .doc(sessionId)
          .collection('messages')
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .get();

        const messages = messagesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          };
        }).reverse(); // Reverse to get chronological order

        return { messages };
      } catch (error: any) {
        console.error('[Chat Router] Error getting history:', error);
        return { messages: [] };
      }
    }),

  /**
   * Get conversation sessions (no auth required)
   */
  getSessions: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      try {
        // Ensure Firebase Admin is initialized before using Firestore
        initializeServices();
        const db = getFirestore();
        const { limit } = input;

        // Get all conversations ordered by last message time
        const sessionsSnapshot = await db
          .collection('conversations')
          .orderBy('lastMessageAt', 'desc')
          .limit(limit)
          .get();

        const sessions = sessionsSnapshot.docs.map(doc => ({
          sessionId: doc.id,
          ...doc.data(),
        }));

        return { sessions };
      } catch (error: any) {
        console.error('[Chat Router] Error getting sessions:', error);
        return { sessions: [] };
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
