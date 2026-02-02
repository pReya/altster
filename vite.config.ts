import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // basicSsl({
    //   /** name of certification */
    //   name: "test",
    //   /** custom trust domains */
    //   domains: ["d75d7ac458d1.ngrok-free.app"],
    //   /** custom certification directory */
    //   certDir: "/Users/moritz/.devServer/cert",
    // }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ["d75d7ac458d1.ngrok-free.app"],
    port: 5173,
    host: true, // Allow mobile device access via network IP
  },
});
