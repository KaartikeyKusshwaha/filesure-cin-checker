import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { apiPlugin } from "./server/dev-plugin";

export default defineConfig(({ mode }) => ({
  plugins: [react(), apiPlugin(loadEnv(mode, process.cwd(), "FILESURE_"))],
}));
