import { router, publicProcedure } from './trpc';
import { chatRouter } from './routers/chat.router';
import { searchRouter } from './routers/search.router';
import { ragRouter } from './routers/rag.router';
// Note: userRouter exists but is not registered currently

export const appRouter = router({
  // simple health procedure that mirrors /health endpoint
  health: publicProcedure.query(() => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })),
  chat: chatRouter,
  search: searchRouter,
  rag: ragRouter,
});

export type AppRouter = typeof appRouter;