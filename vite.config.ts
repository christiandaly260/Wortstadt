import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works on GitHub Pages (/Wortstadt/) and any other host.
export default defineConfig({
  base: './',
  plugins: [react()],
})
