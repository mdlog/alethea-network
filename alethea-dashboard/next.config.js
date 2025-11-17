/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        domains: ['localhost'],
    },
    env: {
        NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
        NEXT_PUBLIC_REGISTRY_ID: process.env.NEXT_PUBLIC_REGISTRY_ID,
        NEXT_PUBLIC_ALETHEA_REGISTRY_ID: process.env.NEXT_PUBLIC_ALETHEA_REGISTRY_ID,
        NEXT_PUBLIC_REGISTRY_URL: process.env.NEXT_PUBLIC_REGISTRY_URL,
        NEXT_PUBLIC_MARKET_CHAIN_ID: process.env.NEXT_PUBLIC_MARKET_CHAIN_ID,
        NEXT_PUBLIC_MARKET_CHAIN_URL: process.env.NEXT_PUBLIC_MARKET_CHAIN_URL,
        NEXT_PUBLIC_VOTER_URL: process.env.NEXT_PUBLIC_VOTER_URL,
        NEXT_PUBLIC_VOTER_TEMPLATE_ID: process.env.NEXT_PUBLIC_VOTER_TEMPLATE_ID,
        NEXT_PUBLIC_VOTER_1_ID: process.env.NEXT_PUBLIC_VOTER_1_ID,
        NEXT_PUBLIC_VOTER_2_ID: process.env.NEXT_PUBLIC_VOTER_2_ID,
        NEXT_PUBLIC_VOTER_3_ID: process.env.NEXT_PUBLIC_VOTER_3_ID,
    },
}

module.exports = nextConfig
