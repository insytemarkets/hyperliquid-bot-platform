import React, { useState, useEffect, useRef } from 'react';

interface MarketOverviewChartProps {
  activeTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  timeframes: string[];
}

// TradingView symbol mappings for Hyperliquid perps
const SYMBOL_MAP: Record<string, string> = {
  'BTC': 'BINANCE:BTCUSDT',
  'ETH': 'BINANCE:ETHUSDT',
  'SOL': 'BINANCE:SOLUSDT',
  'AVAX': 'BINANCE:AVAXUSDT',
  'MATIC': 'BINANCE:MATICUSDT',
  'LINK': 'BINANCE:LINKUSDT',
  'ARB': 'BINANCE:ARBUSDT',
  'OP': 'BINANCE:OPUSDT',
  'UNI': 'BINANCE:UNIUSDT',
  'AAVE': 'BINANCE:AAVEUSDT',
};

const TIMEFRAME_MAP: Record<string, string> = {
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
  '3M': '3M',
  '1Y': '12M',
  'ALL': 'ALL',
};

const MarketOverviewChart: React.FC<MarketOverviewChartProps> = ({
  activeTimeframe,
  onTimeframeChange,
  timeframes
}) => {
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    const container = containerRef.current;
    container.innerHTML = '';
    
    // Remove old script if exists
    if (scriptRef.current) {
      scriptRef.current.remove();
    }

    try {
      // Create TradingView widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container';
      widgetContainer.style.height = '100%';
      widgetContainer.style.width = '100%';
      
      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetDiv.style.height = 'calc(100% - 32px)';
      widgetDiv.style.width = '100%';
      
      widgetContainer.appendChild(widgetDiv);
      container.appendChild(widgetContainer);

      // Load TradingView widget script with error handling
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      
      // Add error handler for script loading
      script.onerror = (error) => {
        console.warn('TradingView widget failed to load:', error);
        // Show fallback content
        container.innerHTML = `
          <div class="flex items-center justify-center h-full bg-gray-50 rounded-lg">
            <div class="text-center">
              <div class="text-gray-400 mb-2">📊</div>
              <div class="text-sm text-gray-600">Chart temporarily unavailable</div>
              <div class="text-xs text-gray-500 mt-1">TradingView widget failed to load</div>
            </div>
          </div>
        `;
      };
      
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: SYMBOL_MAP[selectedCoin] || 'BINANCE:BTCUSDT',
        interval: TIMEFRAME_MAP[activeTimeframe] || 'D',
        timezone: 'Etc/UTC',
        theme: 'light',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        allow_symbol_change: false,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        gridColor: 'rgba(240, 243, 250, 1)',
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        support_host: 'https://www.tradingview.com',
      });

      widgetContainer.appendChild(script);
      scriptRef.current = script;
    } catch (error) {
      console.warn('Error setting up TradingView widget:', error);
      // Show fallback content
      container.innerHTML = `
        <div class="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <div class="text-center">
            <div class="text-gray-400 mb-2">📊</div>
            <div class="text-sm text-gray-600">Chart temporarily unavailable</div>
            <div class="text-xs text-gray-500 mt-1">Please refresh the page</div>
          </div>
        </div>
      `;
    }

    return () => {
      try {
        if (scriptRef.current) {
          scriptRef.current.remove();
        }
      } catch (error) {
        // Silently handle cleanup errors
        console.warn('Error cleaning up TradingView widget:', error);
      }
    };
  }, [selectedCoin, activeTimeframe]);

  const coinOptions = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'ARB', name: 'Arbitrum' },
    { symbol: 'OP', name: 'Optimism' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'AAVE', name: 'Aave' },
  ];

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Market Chart</h3>
          
          {/* Coin Selector */}
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {coinOptions.map(({ symbol, name }) => (
              <option key={symbol} value={symbol}>
                {symbol} - {name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex space-x-2">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe}
              className={`px-3 py-1 rounded text-sm ${
                activeTimeframe === timeframe ? 'tab-active' : 'tab-inactive'
              }`}
              onClick={() => onTimeframeChange(timeframe)}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>
      
      {/* TradingView Advanced Chart Widget */}
      <div ref={containerRef} className="h-96 w-full" />
      
      <div className="mt-2 text-xs text-gray-400 text-right">
        Powered by TradingView
      </div>
    </div>
  );
};

export default MarketOverviewChart;


