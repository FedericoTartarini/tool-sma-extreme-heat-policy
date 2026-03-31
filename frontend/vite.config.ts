import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

function normalizeBasePath(basePath?: string): string {
  const trimmedBasePath = basePath?.trim();

  if (!trimmedBasePath || trimmedBasePath === "/") {
    return "/";
  }

  return `/${trimmedBasePath.replace(/^\/+|\/+$/g, "")}/`;
}

const appBasePath = normalizeBasePath(process.env.PAGES_BASE_PATH);

// https://vite.dev/config/
export default defineConfig({
  base: appBasePath,
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: [
        fileURLToPath(new URL("./index.html", import.meta.url)),
        fileURLToPath(new URL("./404.html", import.meta.url)),
      ],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
