import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Integration tests hit a real hosted Supabase dev project over the
    // network — sequential and unhurried on purpose, not a CI-speed suite.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
