import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import MarketsPage from './pages/MarketsPage';
import MarketDetailPage from './pages/MarketDetailPage';
import HowItWorksPage from './pages/HowItWorksPage';

function App() {
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Header />
            <main className="flex-1">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/markets" element={<MarketsPage />} />
                    <Route path="/markets/:id" element={<MarketDetailPage />} />
                    <Route path="/how-it-works" element={<HowItWorksPage />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App;
