import { ExternalLink } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black/20 py-6">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-400">
                        Prediction Market Demo powered by{' '}
                        <a
                            href="https://alethea.network"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                        >
                            Alethea Oracle
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <a
                            href="http://localhost:4002"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Oracle Dashboard <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-gray-600">|</span>
                        <span className="text-xs text-gray-500">Built on Linera</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
