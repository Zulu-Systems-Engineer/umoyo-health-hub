import type { Request, Response } from 'express';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { getAuth } from 'firebase-admin/auth';

interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: string;
}

export type Context = {
  req: Request;
  res: Response;
  user: AuthenticatedUser | null;
};

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  // Get user from Firebase Auth token if present
  let user: AuthenticatedUser | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      user = {
        uid: decodedToken.uid,
        email: decodedToken.email ?? undefined,
        role: (decodedToken as Record<string, unknown>)?.role as string | undefined ?? 'patient',
      };
    } catch (error) {
      console.error('Error verifying token:', error);
    }
  }

  return {
    req,
    res,
    user,
  };
}

