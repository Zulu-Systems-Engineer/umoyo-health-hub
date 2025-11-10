/**
 * Main App Router
 * Combines all sub-routers into the main application router
 */

import { router } from './trpc';
import { chatRouter } from './routers/chat.router';
import { searchRouter } from './routers/search.router';
import { userRouter } from './routers/user.router';
import { ragRouter } from './routers/rag.router';

export const appRouter = router({
  chat: chatRouter,
  search: searchRouter,
  user: userRouter,
  rag: ragRouter,
});

export type AppRouter = typeof appRouter;
