/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FAUCET_URL: string;
    readonly VITE_CHAIN_ID: string;
    readonly VITE_MARKET_APP_ID: string;
    readonly VITE_REGISTRY_APP_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
