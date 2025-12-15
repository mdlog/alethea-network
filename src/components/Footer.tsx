import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* About */}
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <img src="/logo.png" alt="Alethea" className="w-10 h-10 rounded-lg" />
                            <h3 className="font-bold text-gray-900 text-lg">Alethea Oracle</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Decentralized oracle protocol with power-based voter selection on Linera blockchain.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">Protocol</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/voters" className="text-gray-600 hover:text-blue-600 transition-colors">
                                    Voters
                                </Link>
                            </li>
                            <li>
                                <Link to="/queries" className="text-gray-600 hover:text-blue-600 transition-colors">
                                    Queries
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">Resources</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/docs" className="text-gray-600 hover:text-blue-600 transition-colors">
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/mdlog/alethea-network"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-blue-600 transition-colors"
                                >
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://linera.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-blue-600 transition-colors"
                                >
                                    Linera
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Network Status */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">Network</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span>Linera Conway Testnet</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                        © {new Date().getFullYear()} Alethea Oracle. Built on Linera Blockchain.
                    </p>
                </div>
            </div>
        </footer>
    );
}
