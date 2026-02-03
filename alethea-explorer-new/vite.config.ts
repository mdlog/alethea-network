import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        // Proxy to local Linera service for application GraphQL
        '/chains': {
          target: 'http://localhost:8080',
          changeOrigin: true
        },
        // Proxy for root Linera GraphQL (blocks, chains queries)
        '/linera': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/linera/, '')
        }
      }
    }
  }
})
