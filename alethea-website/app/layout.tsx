import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Alethea Network - Decentralized Oracle Infrastructure",
    description: "Decentralized committee oracle with reputation-weighted voting, optimized for Linera's parallel execution model. Build prediction markets with secure voting on Linera Protocol.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
