/**
 * tRPC Configuration
 * Defines the tRPC instance and procedure builders
 */

import { initTRPC } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure is now the same as public procedure (no auth required)
export const protectedProcedure = t.procedure;

