import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Automatically set base path for GitHub Pages based on standard repo name
  base: process.env.GITHUB_ACTIONS ? '/starmap/' : '/',
})
