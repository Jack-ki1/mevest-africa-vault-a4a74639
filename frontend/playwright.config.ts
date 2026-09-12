import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./frontend/e2e",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
  },
});