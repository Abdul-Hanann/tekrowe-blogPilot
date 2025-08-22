import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Get API URL from environment with fallback
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000'
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    define: {
      // Make environment variables available at build time
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
  }
})
