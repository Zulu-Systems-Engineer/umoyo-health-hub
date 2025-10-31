import { router, publicProcedure } from "../app";

export const userRouter = router({
  profile: publicProcedure.query(async () => {
    // TODO: Implement user profile retrieval
    // Get user profile from Firestore based on auth token
    throw new Error("Not implemented yet");
  }),
});

