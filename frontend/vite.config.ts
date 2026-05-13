import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const devApiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["localhost", "127.0.0.1", ".pseudolab-devfactory.com", ".ts.net"],
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        target: devApiProxyTarget,
        changeOrigin: true,
      },
      "/docs": {
        target: devApiProxyTarget,
        changeOrigin: true,
      },
      "/openapi.json": {
        target: devApiProxyTarget,
        changeOrigin: true,
      },
      "/health": {
        target: devApiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
