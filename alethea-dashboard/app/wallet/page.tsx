'use client';

import WalletConnect from '@/components/WalletConnect';

export default function WalletPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Wallet Connection</h1>
        <WalletConnect />
      </div>
    </div>
  );
}