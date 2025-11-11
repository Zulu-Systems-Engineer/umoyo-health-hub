/**
 * Main App Router
 * Combines all sub-routers into the main application router
 */

import { router } from './trpc';
import { chatRouter } from './routers/chat.router';
import { searchRouter } from './routers/search.router';
import { ragRouter } from './routers/rag.router';

export const appRouter = router({
  chat: chatRouter,
  search: searchRouter,
  rag: ragRouter,
});

export type AppRouter = typeof appRouter;
