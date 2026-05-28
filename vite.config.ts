import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    https: {
      cert: fs.readFileSync("100.66.208.60.pem"),
      key: fs.readFileSync("100.66.208.60-key.pem"),
    },
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
