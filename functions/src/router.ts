import { initTRPC } from '@trpc/server';
import { Context } from './context';
import { chatRouter } from './routers/chat.router';
import { searchRouter } from './routers/search.router';
import { userRouter } from './routers/user.router';
import { ragRouter } from './routers/rag.router';

const t = initTRPC.context<Context>().create();

type RouterFactory = typeof t.router;
type ProcedureBuilder = typeof t.procedure;

export const router: RouterFactory = t.router;
export const publicProcedure: ProcedureBuilder = t.procedure;

export const protectedProcedure: ProcedureBuilder = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error('Unauthorized');
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Main app router
export const appRouter: ReturnType<typeof router> = router({
  chat: chatRouter,
  search: searchRouter,
  user: userRouter,
  rag: ragRouter,
});

export type AppRouter = typeof appRouter;

