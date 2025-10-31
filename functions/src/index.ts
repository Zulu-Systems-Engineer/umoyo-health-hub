import { initializeApp } from "firebase-admin/app";
import { app } from "./app";
import type { AppRouter } from "./app";

initializeApp();

export { app };
export type { AppRouter };

// TODO: Set up tRPC HTTP endpoint using Firebase Cloud Functions
// This will require Express adapter or similar for tRPC integration

