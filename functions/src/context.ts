import {Request, Response} from 'express';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export type Context = {
  req: Request;
  res: Response;
};

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  return {
    req,
    res,
  };
}

