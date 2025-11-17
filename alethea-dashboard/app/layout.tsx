import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { TestnetBanner } from '@/components/TestnetBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Alethea Oracle - Decentralized Truth',
    description: 'Professional dashboard for Alethea Decentralized Oracle on Linera blockchain',
    keywords: ['oracle', 'blockchain', 'linera', 'prediction markets', 'decentralized'],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                {/* Linera Client Import Map */}
                <Script
                    id="linera-importmap"
                    type="importmap"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            imports: {
                                '@linera/client': './node_modules/@linera/client/dist/linera_web.js'
                            }
                        })
                    }}
                />
            </head>
            <body className={inter.className}>
                <TestnetBanner />
                {children}
            </body>
        </html>
    )
}
