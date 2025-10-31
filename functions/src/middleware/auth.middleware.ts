import { getAuth } from "firebase-admin/auth";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Middleware to validate Firebase Authentication token
 */
export async function validateAuthToken(
  token: string | undefined
): Promise<DecodedIdToken | null> {
  if (!token) {
    return null;
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Auth validation error:", error);
    return null;
  }
}

/**
 * Creates a tRPC middleware for authentication
 */
export function createAuthMiddleware() {
  // TODO: Implement tRPC authentication middleware
  // This will be used to protect authenticated routes
  throw new Error("Auth middleware not implemented yet");
}

