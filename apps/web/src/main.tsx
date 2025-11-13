import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./lib/trpc";
import { getBackendUrl } from "./lib/trpc-client";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Create React Query client with auth headers
const trpcReactClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getBackendUrl(),
      headers: async () => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Get Firebase ID token if user is authenticated
        if (typeof window !== "undefined") {
          try {
            const { auth } = await import("@/lib/firebase");
            if (auth?.currentUser) {
              const token = await auth.currentUser.getIdToken();
              headers["Authorization"] = `Bearer ${token}`;
            }
          } catch (error) {
            // Auth not available or user not logged in - continue without token
            console.debug("No auth token available:", error);
          }
        }

        return headers;
      },
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "omit",
          mode: "cors",
        });
      },
    }),
  ],
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);

