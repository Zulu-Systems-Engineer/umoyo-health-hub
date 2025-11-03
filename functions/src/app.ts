/**
 * tRPC App Router
 * Main application router configuration
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { chatRouter } from './routers/chat.router';
import { searchRouter } from './routers/search.router';
import { userRouter } from './routers/user.router';
import { verifyAuthToken, extractToken } from './middleware/auth.middleware';
import type { AuthContext } from './middleware/auth.middleware';

/**
 * Context creation function
 * Called for each request to create the context
 */
export async function createContext(opts: { req?: any; res?: any }): Promise<{
  auth?: AuthContext;
  req?: any;
  res?: any;
}> {
  const authHeader = opts.req?.headers?.authorization;
  const token = extractToken(authHeader);

  const ctx: { auth?: AuthContext; req?: any; res?: any } = {
    req: opts.req,
    res: opts.res,
  };

  // If token is provided, verify it
  if (token) {
    try {
      ctx.auth = await verifyAuthToken(token);
    } catch (error) {
      // Auth failed, but we'll allow unauthenticated requests for public endpoints
      console.warn('[Context] Auth verification failed:', error);
    }
  }

  return ctx;
}

// Initialize tRPC
const t = initTRPC.context<typeof createContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
      },
    };
  },
});

/**
 * Public procedure - available to all users (authenticated or not)
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      // Ensure auth is defined in the context
      auth: ctx.auth,
    },
  });
});

/**
 * Router helper
 */
export const router = t.router;

/**
 * Main application router
 */
export const app = router({
  chat: chatRouter,
  search: searchRouter,
  user: userRouter,
});

export type AppRouter = typeof app;
