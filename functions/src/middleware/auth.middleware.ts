/**
 * Auth Middleware
 * Handles Firebase Authentication verification
 */

import { getAuth } from 'firebase-admin/auth';
import { TRPCError } from '@trpc/server';

export interface AuthContext {
  userId: string;
  email?: string;
  role?: string;
}

/**
 * Verify Firebase ID token and extract user info
 */
export async function verifyAuthToken(token: string): Promise<AuthContext> {
  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return {
      userId: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user',
    };
  } catch (error: any) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: `Invalid authentication token: ${error.message}`,
    });
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
