import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    globals: true,
    environmentMatchGlobs: [
      ["__tests__/components/**", "jsdom"],
      ["__tests__/hooks/**", "jsdom"],
      ["__tests__/pages/**", "jsdom"],
    ],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
