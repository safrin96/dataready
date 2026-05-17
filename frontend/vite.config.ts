import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // The app includes optional shader + 3D visuals that are lazy-loaded.
    // Keep build output readable by raising the warning threshold and splitting vendors.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-three/fiber") || id.includes("@react-three/drei") || id.includes("three")) {
            return "r3f-vendor";
          }
          if (id.includes("@shadergradient")) {
            return "shadergradient-vendor";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
