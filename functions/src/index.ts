import { onRequest } from "firebase-functions/v2/https";

export const api = onRequest((req, res) => {
  res.json({ message: "Hello from Gen 2" });
});
