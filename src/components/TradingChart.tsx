import React, { useEffect, useRef } from 'react';

interface TradingChartProps {
  selectedPair: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingChart: React.FC<TradingChartProps> = ({ selectedPair }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    // Clean up previous widget
    if (widgetRef.current) {
      widgetRef.current.remove();
      widgetRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const loadTradingViewWidget = () => {
      if (window.TradingView && containerRef.current) {
        // Convert pair format (BTC-USD -> BTCUSDT for Binance)
        const baseCoin = selectedPair.split('-')[0];
        const symbol = `${baseCoin}USDT`; // Binance uses USDT pairs
        
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${symbol}`, // Use Binance with proper USDT format
          interval: '15',
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerRef.current.id,
          studies: [
            'Volume@tv-basicstudies'
          ],
          overrides: {
            'paneProperties.background': '#ffffff',
            'paneProperties.vertGridProperties.color': '#f0f0f0',
            'paneProperties.horzGridProperties.color': '#f0f0f0',
            'symbolWatermarkProperties.transparency': 90,
            'scalesProperties.textColor': '#666666',
            'mainSeriesProperties.candleStyle.wickUpColor': '#22c55e',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
            'mainSeriesProperties.candleStyle.upColor': '#22c55e',
            'mainSeriesProperties.candleStyle.downColor': '#ef4444',
            'mainSeriesProperties.candleStyle.borderUpColor': '#22c55e',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444'
          },
          disabled_features: [
            'use_localization',
            'volume_force_overlay',
            'header_symbol_search',
            'header_compare',
            'header_undo_redo',
            'header_screenshot'
          ],
          enabled_features: [
            'study_templates'
          ],
          loading_screen: { backgroundColor: "#ffffff" },
          custom_css_url: undefined
        });
      }
    };

    // Load TradingView script if not already loaded
    if (!window.TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = loadTradingViewWidget;
      document.head.appendChild(script);
    } else {
      loadTradingViewWidget();
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          // Widget might already be removed
        }
        widgetRef.current = null;
      }
    };
  }, [selectedPair]);

  // Generate unique ID for the container
  const containerId = `tradingview-chart-${selectedPair.replace('-', '').toLowerCase()}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 lg:h-[600px]">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedPair} Chart
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Powered by TradingView</span>
          </div>
        </div>
      </div>
      
      <div className="relative" style={{ height: 'calc(100% - 73px)' }}>
        <div
          ref={containerRef}
          id={containerId}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
};

export default TradingChart;
