import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc, trpcClient } from "./lib/trpc";
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

// Create React Query client for hooks
const trpcReactClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getBackendUrl(),
      headers: () => ({
        "Content-Type": "application/json",
      }),
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

