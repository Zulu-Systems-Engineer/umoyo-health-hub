import {Request, Response} from 'express';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { getAuth } from 'firebase-admin/auth';
import { initializeServices } from './init';

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
  // Ensure Firebase Admin is initialized before using Auth
  initializeServices();
  
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
      // Token is invalid or expired, but we don't throw - just leave user as null
      // This allows public endpoints to work without auth
      console.error('Error verifying token:', error);
    }
  }

  return {
    req,
    res,
    user,
  };
}

