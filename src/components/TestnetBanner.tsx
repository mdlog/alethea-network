import { AlertTriangle, ExternalLink } from 'lucide-react';

export default function TestnetBanner() {
    return (
        <div className="bg-amber-50 border-b border-amber-200">
            <div className="container mx-auto px-4 py-2">
                <div className="flex items-center justify-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span>You are on Linera Testnet Conway</span>
                    <a
                        href="https://faucet.testnet-conway.linera.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-amber-700 hover:text-amber-900 underline"
                    >
                        Get testnet tokens
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>
    );
}
