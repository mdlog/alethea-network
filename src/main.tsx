import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LineraProvider } from './contexts/LineraContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <LineraProvider>
                <App />
            </LineraProvider>
        </BrowserRouter>
    </React.StrictMode>
);
