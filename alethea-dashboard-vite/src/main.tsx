import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LineraProvider } from './contexts/LineraContext';
import { TokenProvider } from './contexts/TokenContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <LineraProvider>
                <TokenProvider>
                    <App />
                </TokenProvider>
            </LineraProvider>
        </BrowserRouter>
    </React.StrictMode>
);
