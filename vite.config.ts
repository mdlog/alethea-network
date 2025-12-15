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
            },
        },
        plugins: [
            react(),
            wasm(),
            topLevelAwait(),
        ],
        define: {
            'import.meta.env.VITE_FAUCET_URL': JSON.stringify(env.VITE_FAUCET_URL || 'https://faucet.testnet-conway.linera.net'),
            'import.meta.env.VITE_CHAIN_ID': JSON.stringify(env.VITE_CHAIN_ID || '208873b668818fc962d8470c68698dc5dff2321720a9bb0d74576d45f4f73c91'),
            'import.meta.env.VITE_REGISTRY_APP_ID': JSON.stringify(env.VITE_REGISTRY_APP_ID || 'b38f15957b0be6bffd6c46a7b8261b82e23ae5b40f7b4c437f8bdea28d283398'),
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
