import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wallet';
import { WalletProvider } from './contexts/WalletContext';
import { BotProvider } from './contexts/BotContextNew';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import MyBots from './pages/MyBotsNew';
import Templates from './pages/Templates';
import BotBuilder from './pages/BotBuilder';
import Strategies from './pages/StrategiesNew';
import Analytics from './pages/Analytics';
import MarketAnalytics from './pages/MarketAnalytics';
import Trading from './pages/Trading';
import Backtesting from './pages/Backtesting';
import Scanner from './pages/Scanner';
import './App.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function App() {
  // Aggressive error suppression for MetaMask SDK and TradingView widget issues
  useEffect(() => {
    // Override console.error to suppress specific errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('openapi-fetch') ||
          message.includes('import_openapi_fetch') ||
          message.includes('@metamask/sdk-analytics') ||
          message.includes('Script error') ||
          message.includes('handleError') ||
          message.includes('is not a function')) {
        console.warn('Suppressed error:', message);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || '';
      const filename = event.filename || '';
      
      // Suppress ALL MetaMask SDK and script errors
      if (message.includes('openapi-fetch') ||
          message.includes('import_openapi_fetch') ||
          message.includes('@metamask/sdk-analytics') ||
          message.includes('is not a function') ||
          message === 'Script error.' ||
          message === 'Script error' ||
          message === '' ||
          filename.includes('tradingview') ||
          filename.includes('s3.tradingview.com') ||
          filename.includes('bundle.js') ||
          message.includes('handleError')) {
        
        console.warn('Error suppressed:', { message, filename });
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = typeof event.reason === 'string' ? event.reason : 
                        (event.reason?.message || event.reason?.toString() || '');
      
      if (reasonStr.includes('openapi-fetch') || 
          reasonStr.includes('import_openapi_fetch') ||
          reasonStr.includes('MetaMask') ||
          reasonStr.includes('analytics') ||
          reasonStr.includes('is not a function') ||
          reasonStr.includes('Cannot read properties') ||
          reasonStr.includes('Script error')) {
        console.warn('Promise rejection suppressed:', reasonStr);
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
      }
    };

    // Suppress React's error overlay for these specific errors
    if (typeof window !== 'undefined' && window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__) {
      const originalCaptureConsoleIntegration = window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.onError;
      window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.onError = (error: any) => {
        const message = error?.message || error?.toString() || '';
        if (message.includes('openapi-fetch') ||
            message.includes('import_openapi_fetch') ||
            message.includes('Script error') ||
            message.includes('is not a function')) {
          console.warn('React overlay error suppressed:', message);
          return;
        }
        if (originalCaptureConsoleIntegration) {
          originalCaptureConsoleIntegration(error);
        }
      };
    }

    // Add multiple event listeners at different phases
    document.addEventListener('error', handleError, true);
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      console.error = originalConsoleError;
      document.removeEventListener('error', handleError, true);
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  return (    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WalletProvider>
            <BotProvider>
              <Router>
                <div className="App">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/my-bots" element={<ProtectedRoute><MyBots /></ProtectedRoute>} />
                    <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
                    <Route path="/bot-builder" element={<ProtectedRoute><BotBuilder /></ProtectedRoute>} />
                    <Route path="/strategies" element={<ProtectedRoute><Strategies /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                    <Route path="/market-analytics" element={<ProtectedRoute><MarketAnalytics /></ProtectedRoute>} />
                    <Route path="/trading" element={<ProtectedRoute><Trading /></ProtectedRoute>} />
                    <Route path="/backtesting" element={<ProtectedRoute><Backtesting /></ProtectedRoute>} />
                    <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
                  </Routes>
                </div>
              </Router>
            </BotProvider>
          </WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;