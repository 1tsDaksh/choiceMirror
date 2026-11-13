import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "tests/e2e/**",
    ],
  },
});
