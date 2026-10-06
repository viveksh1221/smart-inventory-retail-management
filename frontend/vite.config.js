import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend CORS sirf http://localhost:5173 allow karta hai, isliye port fixed hai.
export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort: true } });
