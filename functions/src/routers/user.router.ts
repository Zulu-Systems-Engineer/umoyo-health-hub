/**
 * User Router
 * Handles user-related endpoints
 * Note: This router is not currently registered in the main app router
 * since authentication has been removed for simplification.
 */

import {router, publicProcedure} from "../trpc";
import {z} from "zod";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

// --- Zod Schemas ---

/**
 * Zod schema for the User's role
 */
const UserRoleSchema = z.enum(["patient", "healthcare-professional"]);

/**
 * Zod schema for User preferences
 */
const UserPreferencesSchema = z.object({
  language: z.string(),
  region: z.string(),
});

/**
 * Zod schema for the main UserProfile object.
 * This is the "source of truth" for a user's data structure.
 */
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(), // Firebase email can be missing
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  role: UserRoleSchema,
  preferences: UserPreferencesSchema,
  // Use z.string() for ISO date strings, which is what we store
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Infer the TypeScript type from the Zod schema
 */
export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Zod schema for a Firestore Timestamp.
 * We use .custom() to validate it's an instance of Timestamp.
 */
const FirestoreTimestampSchema = z.custom<Timestamp>(
  (val) => val instanceof Timestamp,
  "Invalid Firestore Timestamp"
);

/**
 * Zod schema for search history data *as it exists in Firestore*.
 * Note the timestamp is a FirestoreTimestampSchema.
 */
const SearchHistoryDocDataSchema = z.object({
  query: z.string(),
  timestamp: FirestoreTimestampSchema,
});

/**
 * Zod schema for search history data *as returned by the API*.
 * Note the timestamp is now a z.string().
 */
const SearchHistoryApiItemSchema = z.object({
  id: z.string(),
  query: z.string(),
  timestamp: z.string().datetime(), // We will return an ISO string
});

// --- User Router ---

export const userRouter = router({
  /**
   * Get user profile
   * Uses .output() to validate the return data.
   * Note: Requires userId as input since auth is removed
   */
  profile: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(UserProfileSchema) // Enforce the return type
    .query(async ({input}) => {
      try {
        const {userId} = input;

        const db = getFirestore();
        const userDocRef = db.collection("users").doc(userId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
          // Create default profile if it doesn't exist
          const defaultProfile: UserProfile = {
            id: userId,
            email: null,
            displayName: null,
            photoURL: null,
            role: "patient",
            preferences: {
              language: "en",
              region: "zambia",
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await userDocRef.set(defaultProfile);
          return defaultProfile; // This is validated by .output()
        }

        // Parse data from Firestore to ensure it matches our schema
        return UserProfileSchema.parse(userDoc.data());
      } catch (error: any) {
        console.error("[User Router] Error getting profile:", error);
        // Let tRPC handle the error formatting
        throw new Error(`Failed to get user profile: ${error.message}`);
      }
    }),

  /**
   * Update user profile
   */
  updateProfile: publicProcedure
    .input(z.object({
      userId: z.string(),
      // Allow null to be explicitly passed to clear the name
      displayName: z.string().nullable().optional(),
      preferences: z.object({
        language: z.string().optional(),
        region: z.string().optional(),
      }).optional(),
      role: UserRoleSchema.optional(),
    }))
    .output(UserProfileSchema) // Also validate the output
    .mutation(async ({input}) => {
      try {
        const {userId, ...updateFields} = input;
        const db = getFirestore();
        const userDocRef = db.collection("users").doc(userId);

        // Build an update object that uses dot notation for nested fields
        // This prevents overwriting the entire 'preferences' object
        const updateData: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };

        // Use 'in' operator to check if key was provided, even if value is null
        if ("displayName" in updateFields) {
          updateData.displayName = updateFields.displayName;
        }
        if ("role" in updateFields) {
          updateData.role = updateFields.role;
        }
        // Use dot notation for nested objects
        if (updateFields.preferences?.language !== undefined) {
          updateData["preferences.language"] =
            updateFields.preferences.language;
        }
        if (updateFields.preferences?.region !== undefined) {
          updateData["preferences.region"] = updateFields.preferences.region;
        }

        await userDocRef.update(updateData);

        const updatedDoc = await userDocRef.get();
        // Parse and return the updated data
        return UserProfileSchema.parse(updatedDoc.data());
      } catch (error: any) {
        console.error("[User Router] Error updating profile:", error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }
    }),

  /**
   * Get user's search history
   */
  searchHistory: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .output(z.array(SearchHistoryApiItemSchema)) // Validate the list output
    .query(async ({input}) => {
      try {
        const {userId} = input;
        const db = getFirestore();

        const historySnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("searchHistory")
          .orderBy("timestamp", "desc")
          .limit(50)
          .get();

        // Parse and transform the data
        return historySnapshot.docs.map((doc) => {
          // 1. Parse the raw Firestore data (which has a Timestamp object)
          const docData = SearchHistoryDocDataSchema.parse(doc.data());

          // 2. Transform into the API shape (with an ISO string)
          return {
            id: doc.id,
            query: docData.query,
            timestamp: docData.timestamp.toDate().toISOString(),
          };
        });
      } catch (error: any) {
        console.error("[User Router] Error getting search history:", error);
        throw new Error(`Failed to get search history: ${error.message}`);
      }
    }),
});
