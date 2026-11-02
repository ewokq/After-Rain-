import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/After-Rain-/",
  plugins: [react()],
  resolve: {
    alias: {
      "grok/canvas": fileURLToPath(new URL("./src/grok-canvas.ts", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
