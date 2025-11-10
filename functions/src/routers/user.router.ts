/**
 * User Router
 * Handles user-related endpoints
 */

import { router, publicProcedure } from '../trpc';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const userRouter = router({
  /**
   * Get user profile
   */
  profile: publicProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Get user ID from context (after auth middleware is implemented)
      const userId = (ctx as any)?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        // Create default profile if doesn't exist
        const auth = getAuth();
        const user = await auth.getUser(userId);

        const defaultProfile = {
          id: userId,
          email: user.email,
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          role: 'user' as const,
          preferences: {
            language: 'en',
            region: 'zambia',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.collection('users').doc(userId).set(defaultProfile);
        return defaultProfile;
      }

      return userDoc.data();
    } catch (error: any) {
      console.error('[User Router] Error getting profile:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }),

  /**
   * Update user profile
   */
  updateProfile: publicProcedure
    .input((val: unknown) => {
      // TODO: Add proper Zod schema
      if (typeof val === 'object' && val !== null) {
        return val as {
          displayName?: string;
          preferences?: {
            language?: string;
            region?: string;
          };
        };
      }
      throw new Error('Invalid input');
    })
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = (ctx as any)?.userId;

        if (!userId) {
          throw new Error('User not authenticated');
        }

        const db = getFirestore();
        const updateData = {
          ...input,
          updatedAt: new Date(),
        };

        await db.collection('users').doc(userId).update(updateData);

        const updatedDoc = await db.collection('users').doc(userId).get();
        return updatedDoc.data();
      } catch (error: any) {
        console.error('[User Router] Error updating profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }
    }),

  /**
   * Get user's search history (for future implementation)
   */
  searchHistory: publicProcedure.query(async ({ ctx }) => {
    try {
      const userId = (ctx as any)?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const db = getFirestore();
      const historySnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('searchHistory')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      return historySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error: any) {
      console.error('[User Router] Error getting search history:', error);
      throw new Error(`Failed to get search history: ${error.message}`);
    }
  }),
});
