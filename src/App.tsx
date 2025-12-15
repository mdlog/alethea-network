import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import VotersPage from './pages/VotersPage';
import QueriesPage from './pages/QueriesPage';
import ProfilePage from './pages/ProfilePage';
import TokenPage from './pages/TokenPage';
import DocsPage from './pages/DocsPage';

function App() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />
            <main className="container mx-auto px-4 py-8 flex-1">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/voters" element={<VotersPage />} />
                    <Route path="/queries" element={<QueriesPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/token" element={<TokenPage />} />
                    <Route path="/docs" element={<DocsPage />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App;
