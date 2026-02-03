import React from 'react';
import { Activity, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-alethea-border bg-alethea-card/30 backdrop-blur-lg mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-alethea-primary/20 rounded-lg border border-alethea-primary/30">
                <Activity className="w-5 h-5 text-alethea-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-epilogue font-bold text-white tracking-tight-custom">
                  Alethea Explorer
                </span>
              </div>
            </div>
            <p className="text-sm text-alethea-gray-light max-w-xs">
              Blockchain explorer for the Alethea Network - Decentralized Oracle & Prediction Market on Linera.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="/" 
                  className="text-sm text-alethea-gray-light hover:text-alethea-primary transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="/blocks" 
                  className="text-sm text-alethea-gray-light hover:text-alethea-primary transition-colors"
                >
                  Chain Blocks
                </a>
              </li>
              <li>
                <a 
                  href="/chains" 
                  className="text-sm text-alethea-gray-light hover:text-alethea-primary transition-colors"
                >
                  All Chains
                </a>
              </li>
              <li>
                <a 
                  href="/queries" 
                  className="text-sm text-alethea-gray-light hover:text-alethea-primary transition-colors"
                >
                  Prediction Queries
                </a>
              </li>
              <li>
                <a 
                  href="/token" 
                  className="text-sm text-alethea-gray-light hover:text-alethea-primary transition-colors"
                >
                  ALTH Token
                </a>
              </li>
              <li>
                <a 
                  href="/voters" 
                  className="text-sm text-alethea-gray-light hover:text-alethea-primary transition-colors"
                >
                  Voters Leaderboard
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://linera.dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-alethea-gray-light hover:text-alethea-primary transition-colors flex items-center space-x-1"
                >
                  <span>Linera Documentation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/linera-io/linera-protocol" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-alethea-gray-light hover:text-alethea-primary transition-colors flex items-center space-x-1"
                >
                  <Github className="w-4 h-4" />
                  <span>Linera Protocol</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-alethea-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-alethea-gray-medium">
              &copy; {new Date().getFullYear()} Alethea Network Explorer. Built on Linera.
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-alethea-gray-light">Conway Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
