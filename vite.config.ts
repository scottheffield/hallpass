import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// One dev server for the React app and the Worker API.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
});
