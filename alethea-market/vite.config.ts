import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
    plugins: [
        react(),
        wasm(),
        topLevelAwait(),
        // Middleware to ensure CORS headers are set on all responses including workers
        {
            name: 'cors-headers',
            configureServer(server) {
                // Apply middleware early to catch all requests including worker scripts
                server.middlewares.use((req, res, next) => {
                    // Set CORS headers for all responses (including worker scripts and WASM files)
                    // This is critical for Web Workers that use SharedArrayBuffer
                    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
                    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
                    // For same-origin resources, set Cross-Origin-Resource-Policy
                    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
                    next();
                });
            },
        },
    ],
    optimizeDeps: {
        exclude: ['@linera/client', '@linera/signer'],
    },
    server: {
        port: 4004,
        strictPort: true,
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        proxy: {
            '/chains': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
                configure: (proxy, _options) => {
                    proxy.on('proxyRes', (proxyRes, req, res) => {
                        // Ensure CORS headers are set
                        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
                        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
                        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
                    });
                },
            },
            '/faucet': {
                target: 'https://faucet.testnet-conway.linera.net',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/faucet/, ''),
            },
        },
    },
    build: {
        target: 'esnext',
    },
});
