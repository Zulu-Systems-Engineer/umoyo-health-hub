import { initTRPC } from '@trpc/server';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';

export type Context = {
  req: CreateHTTPContextOptions['req'];
  res: CreateHTTPContextOptions['res'];
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure;