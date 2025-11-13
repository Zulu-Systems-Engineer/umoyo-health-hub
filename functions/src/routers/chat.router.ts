import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';

export const chatRouter = router({
  // chat.query: mutation
  query: publicProcedure
    .input(z.object({
      message: z.string(),
      sessionId: z.string().optional(),
      context: z.object({
        category: z.string().optional(),
        language: z.string().optional(),
        audience: z.string().optional(),
        region: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      // ... your existing logic (Gemini + RAG + Firestore save)
    }),

  // chat.getHistory: query
  getHistory: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      // Emulator-friendly mock for local dev (optional)
      if (process.env.FUNCTIONS_EMULATOR === 'true') {
        const now = new Date();
        return {
          messages: [
            { id: 'user-1', role: 'user', content: 'Hello, can you help?', timestamp: new Date(now.getTime() - 60000) },
            { id: 'assistant-1', role: 'assistant', content: 'Sure! What do you need?', timestamp: new Date(now.getTime() - 30000) },
          ],
        };
      }
      const db = getFirestore();
      const { sessionId, limit } = input;
      const messagesSnapshot = await db
        .collection('conversations')
        .doc(sessionId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      const messages = messagesSnapshot.docs
        .map(doc => {
          const data = doc.data() as any;
          const ts = data.timestamp;
          const timestamp = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date();
          return { ...data, timestamp };
        })
        .reverse();
      return { messages };
    }),
});