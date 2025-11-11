import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@umoyo/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  optimizeDeps: {
    include: ["@umoyo/shared"],
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: "127.0.0.1",
  },
});

