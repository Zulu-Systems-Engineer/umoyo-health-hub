import { onRequest } from "firebase-functions/v2/https";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import { appRouter } from "./router"; // main app router combining sub-routers
import { createContext } from "./context";
// Avoid express type dependency; Firebase provides compatible req/res

export const api = onRequest(
  {
    cors: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://umoyo-health-hub.web.app",
      "https://umoyo-health-hub.firebaseapp.com",
    ],
    timeoutSeconds: 120,
  },
  async (req, res) => {
    const originalUrlForCheck = req.url || "";
    let path = req.path || originalUrlForCheck || "";
    const queryIndex = path.indexOf("?");
    if (queryIndex !== -1) path = path.substring(0, queryIndex);

    console.log("[API] Request path:", path, "Method:", req.method);

    // Health endpoint: support both /health and /api/health even with prefixes
    if (path.endsWith("/health") || path.includes("/api/health")) {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // tRPC entrypoint: accept path anywhere (emulator adds project/function prefix)
    // Detect tRPC requests using the raw URL to avoid framework-specific path quirks
    const hasApiTrpc = originalUrlForCheck.includes("/api/trpc");
    const hasTrpc = originalUrlForCheck.includes("/trpc");
    if (hasApiTrpc || hasTrpc) {
      const originalUrl = originalUrlForCheck || "/";
      // Extract the procedure path after either /api/trpc or /trpc
      const match = originalUrl.match(/(?:\/api\/trpc|\/trpc)\/(.*)$/);
      const suffix = match?.[1] ?? "";
      // Ensure single /trpc prefix and remove any accidental leading 'trpc/' in suffix
      const cleanSuffix = suffix.replace(/^trpc\//, "");
      const normalizedUrl = `/trpc/${cleanSuffix}`;

      // Avoid double slashes like '/trpc//chat.getHistory'
      req.url = normalizedUrl.replace(/\/{2,}/g, "/");
      console.log("[API] tRPC normalized url:", req.url);

      const handler = createHTTPHandler({
        router: appRouter,
        createContext,
        // Be explicit for clarity and to avoid default mismatches
        // endpoint: "/trpc", // removed: not a valid option for createHTTPHandler
      });

      await handler(req, res);
      return;
    }

    // Unknown route
    console.log("[API] 404 - Unknown route:", path);
    res.status(404).json({
      error: "Not Found",
      message: "Use /trpc or /health",
      receivedPath: path,
    });
    return;
  }
);