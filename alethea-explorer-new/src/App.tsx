import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Activity,
  Box,
  Link2,
  Search
} from 'lucide-react';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { BlocksPage } from './pages/BlocksPage';
import { BlockDetailPage } from './pages/BlockDetailPage';
import { ChainsPage } from './pages/ChainsPage';
import { useAPI } from './hooks/useDatabase';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, health } = useAPI();
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to home with chain ID as query parameter
      navigate(`/?chain=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="border-b border-alethea-border bg-alethea-card/30 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="p-2 bg-alethea-primary/20 rounded-lg border border-alethea-primary/30 group-hover:bg-alethea-primary/30 transition-colors">
                <Activity className="w-6 h-6 text-alethea-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-epilogue font-bold text-white tracking-tight-custom">
                  Alethea
                </span>
                <span className="text-sm text-alethea-gray-light font-medium">
                  Network Explorer
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex space-x-1 ml-8">
              <Link
                to="/"
                className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <Link
                to="/blocks"
                className={`nav-link ${isActive('/blocks') || isActive('/block') ? 'active' : ''}`}
              >
                <Box className="w-4 h-4" />
                <span>Blocks</span>
              </Link>

              <Link
                to="/chains"
                className={`nav-link ${isActive('/chains') ? 'active' : ''}`}
              >
                <Link2 className="w-4 h-4" />
                <span>Chains</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-alethea-gray-medium" />
              <input
                type="text"
                placeholder="Search chain ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-3 py-2 bg-alethea-darker/50 border border-alethea-border/50 rounded-lg text-white text-sm placeholder-alethea-gray-medium focus:outline-none focus:border-alethea-primary/50 transition-colors"
              />
            </form>

            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-alethea-darker/50 rounded-lg border border-alethea-border/50">
              <span className="text-xs text-alethea-gray-medium">Network:</span>
              <span className="text-xs text-white font-medium">{health?.network || 'Conway Testnet'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm text-alethea-gray-light">{isConnected ? 'Connected' : 'Connecting...'}</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-alethea-dark flex flex-col">
        <Navigation />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/blocks" element={<BlocksPage />} />
            <Route path="/block/:hash" element={<BlockDetailPage />} />
            <Route path="/chains" element={<ChainsPage />} />
          </Routes>
        </main>

        <Footer />

        {/* Background decorative elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-alethea-primary/5 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>
    </Router>
  );
};

export default App;
