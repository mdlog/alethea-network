import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        server: {
            port: 4002,
            strictPort: true,
            host: '0.0.0.0',
            allowedHosts: ['alethea.network', '.alethea.network', 'localhost', '.loca.lt'],
            headers: {
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',
            },
            proxy: {
                '/chains': {
                    target: 'http://localhost:8080',
                    changeOrigin: true,
                },
                '/api': {
                    target: 'http://localhost:8080',
                    changeOrigin: true,
                },
                '/graphql': {
                    target: 'http://localhost:8080',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/graphql/, ''),
                },
                '/inbox': {
                    target: 'http://localhost:8080',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/inbox/, ''),
                },
            },
        },
        plugins: [
            react(),
            wasm(),
            topLevelAwait(),
        ],
        define: {
            // Environment variables are automatically loaded from .env.local
            // No need to define them here - Vite handles VITE_* prefixed vars automatically
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            }
        },
        optimizeDeps: {
            exclude: ['@linera/client', '@linera/signer'],
        },
        build: {
            target: 'esnext',
        },
    };
});
