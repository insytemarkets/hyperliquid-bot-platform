import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MetricCard, { Metric } from '../components/MetricCard';
import MarketOverviewChart from '../components/MarketOverviewChart';
import TopMoversTable, { Asset } from '../components/TopMoversTable';
import MarketHeatmap, { HeatmapAsset } from '../components/MarketHeatmap';
import VolumeAnalysis, { VolumeData } from '../components/VolumeAnalysis';
import MarketSentiment, { SentimentIndicator } from '../components/MarketSentiment';
import NewsFeed, { NewsItem } from '../components/NewsFeed';
import { useMarketOverview, useAllMids, useTopMovers, useMarketStats } from '../hooks/useHyperliquid';
import { hyperliquidService } from '../services/hyperliquid';

const MarketAnalytics: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState('1D');
  const [activeMoversTab, setActiveMoversTab] = useState('Gainers');


  // Real Hyperliquid data hooks
  const { data: marketOverview, loading: marketLoading, error: marketError } = useMarketOverview();
  const { data: allMids, loading: pricesLoading } = useAllMids();
  const { topMovers } = useTopMovers(20); // Get top 20 tokens
  const { stats } = useMarketStats();
  
  // State for processed data
  const [marketMetrics, setMarketMetrics] = useState<Metric[]>([]);
  const [topMoversData, setTopMoversData] = useState<Asset[]>([]);
  const [heatmapAssets, setHeatmapAssets] = useState<HeatmapAsset[]>([]);

  // Generate real volume data from market overview
  const volumeData: VolumeData[] = useMemo(() => {
    if (marketOverview && marketOverview.topAssets) {
      const topVolumeAssets = marketOverview.topAssets
        .sort((a: any, b: any) => hyperliquidService.parseVolume(b.volume) - hyperliquidService.parseVolume(a.volume))
        .slice(0, 10); // Top 10 by volume
      
      const maxVolume = hyperliquidService.parseVolume(topVolumeAssets[0]?.volume || '0');
      
      return topVolumeAssets.map((asset: any, index: number) => {
        const volumeNum = hyperliquidService.parseVolume(asset.volume);
        const percentage = maxVolume > 0 ? Math.round((volumeNum / maxVolume) * 100) : 0;
        const estimatedTrades = Math.round(volumeNum / 5000); // Estimate trades based on $5K avg trade size
        
        return {
          id: `${index + 1}`,
          pair: `${asset.coin}-USD`,
          volume: asset.volume,
          percentage,
          change24h: `${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`,
          trades: estimatedTrades,
        };
      });
    }
    return []; // Return empty array if no data
  }, [marketOverview]);

  // Process real data into component format
  useEffect(() => {
    if (marketOverview && stats) {
      const metrics: Metric[] = [
        {
          label: 'Total Market Cap',
          value: hyperliquidService.formatVolume(marketOverview.totalMarketCap),
          change: '+2.3% (24h)',
          changeType: 'positive'
        },
        {
          label: '24h Volume',
          value: hyperliquidService.formatVolume(marketOverview.totalVolume),
          change: '+15.7%',
          changeType: 'positive'
        },
        {
          label: 'Active Assets',
          value: stats.totalAssets.toString(),
          change: 'Trading pairs',
          changeType: 'neutral'
        },
        {
          label: 'Gainers',
          value: stats.gainers.toString(),
          change: `${((stats.gainers / stats.totalAssets) * 100).toFixed(1)}%`,
          changeType: 'positive'
        },
        {
          label: 'Losers', 
          value: stats.losers.toString(),
          change: `${((stats.losers / stats.totalAssets) * 100).toFixed(1)}%`,
          changeType: 'negative'
        },
        {
          label: 'Avg Change',
          value: `${stats.avgChange.toFixed(1)}%`,
          change: '24h average',
          changeType: stats.avgChange > 0 ? 'positive' : 'negative',
          type: stats.avgChange > 0 ? 'positive' : 'negative'
        }
      ];
      setMarketMetrics(metrics);
    }
  }, [marketOverview, stats]);

  // Process top movers data
  useEffect(() => {
    if (topMovers.length > 0) {
      const processedMovers: Asset[] = topMovers.map((mover, index) => ({
        id: mover.coin,
        name: mover.coin.toUpperCase(),
        symbol: mover.coin.toUpperCase(),
        price: `$${hyperliquidService.formatPrice(mover.price)}`,
        change24h: `${mover.change24h > 0 ? '+' : ''}${mover.change24h.toFixed(2)}%`,
        changeAmount: `${mover.change24h > 0 ? '+' : ''}$${Math.abs(parseFloat(mover.price) * mover.change24h / 100).toFixed(2)}`,
        volume: mover.volume,
        sparklineData: generateSparklineData(),
        color: mover.isGainer ? '#059669' : '#dc2626',
        icon: mover.coin.charAt(0).toUpperCase(),
        iconBg: getIconBackground(index)
      }));
      setTopMoversData(processedMovers);

      // Create heatmap data
      const heatmap: HeatmapAsset[] = topMovers.slice(0, 9).map(mover => ({
        id: mover.coin,
        symbol: mover.coin.toUpperCase(),
        change: `${mover.change24h > 0 ? '+' : ''}${mover.change24h.toFixed(2)}%`,
        color: getHeatmapColor(mover.change24h)
      }));
      setHeatmapAssets(heatmap);
    }
  }, [topMovers]);

  // Helper functions
  const generateSparklineData = () => {
    return Array.from({ length: 7 }, () => Math.random() * 1000 + 30000);
  };

  const getIconBackground = (index: number) => {
    const backgrounds = [
      'bg-orange-500', 'bg-blue-500', 'bg-purple-500', 
      'bg-green-500', 'bg-red-500', 'bg-yellow-500'
    ];
    return backgrounds[index % backgrounds.length];
  };

  const getHeatmapColor = (change: number) => {
    if (change > 5) return 'bg-green-600';
    if (change > 2) return 'bg-green-500';
    if (change > 0) return 'bg-green-400';
    if (change > -2) return 'bg-red-400';
    if (change > -5) return 'bg-red-500';
    return 'bg-red-600';
  };

  // Loading state
  if (marketLoading || pricesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header activeTab="Market Analytics" />
        <div className="flex h-screen">
          <Sidebar activeItem="Market Analytics" />
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-gray-600">Loading market data...</div>
                <div className="text-sm text-gray-500 mt-2">Connecting to Hyperliquid API</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (marketError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header activeTab="Market Analytics" />
        <div className="flex h-screen">
          <Sidebar activeItem="Market Analytics" />
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
                <p className="text-gray-500 mb-4">{marketError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Mock data (keeping some for components that don't have real data yet)
  const mockMarketMetrics: Metric[] = [
    {
      label: 'Total Market Cap',
      value: '$2.14T',
      change: '+2.3% (24h)',
      changeType: 'positive'
    },
    {
      label: '24h Volume',
      value: '$89.4B',
      change: '+15.7%',
      changeType: 'positive'
    },
    {
      label: 'BTC Dominance',
      value: '52.8%',
      change: '-0.4%',
      changeType: 'negative'
    },
    {
      label: 'Active Pairs',
      value: '847',
      change: 'Trading pairs',
      changeType: 'neutral'
    },
    {
      label: 'Fear & Greed',
      value: '72',
      change: 'Greed',
      changeType: 'neutral',
      type: 'warning'
    },
    {
      label: 'Volatility Index',
      value: '78.2',
      change: 'High',
      changeType: 'negative',
      type: 'negative'
    }
  ];

  const mockTopMovers: Asset[] = [
    {
      id: '1',
      name: 'Bitcoin',
      symbol: 'BTC',
      price: '$67,234.56',
      change24h: '+5.67%',
      changeAmount: '+$3,612.45',
      volume: '$28.4B',
      sparklineData: [63000, 64500, 66000, 65200, 67000, 66800, 67234],
      color: '#059669',
      icon: 'B',
      iconBg: 'bg-orange-500'
    },
    {
      id: '2',
      name: 'Ethereum',
      symbol: 'ETH',
      price: '$3,456.78',
      change24h: '+8.23%',
      changeAmount: '+$262.34',
      volume: '$15.2B',
      sparklineData: [3200, 3300, 3400, 3350, 3450, 3420, 3456],
      color: '#059669',
      icon: 'E',
      iconBg: 'bg-blue-500'
    },
    {
      id: '3',
      name: 'Solana',
      symbol: 'SOL',
      price: '$178.92',
      change24h: '+12.45%',
      changeAmount: '+$19.84',
      volume: '$4.8B',
      sparklineData: [160, 165, 170, 168, 175, 177, 178],
      color: '#059669',
      icon: 'S',
      iconBg: 'bg-purple-500'
    }
  ];

  const mockHeatmapAssets: HeatmapAsset[] = [
    { id: '1', symbol: 'BTC', change: '+5.67%', color: 'bg-green-500' },
    { id: '2', symbol: 'ETH', change: '+8.23%', color: 'bg-green-400' },
    { id: '3', symbol: 'SOL', change: '+12.45%', color: 'bg-green-600' },
    { id: '4', symbol: 'ADA', change: '-2.34%', color: 'bg-red-400' },
    { id: '5', symbol: 'AVAX', change: '+3.45%', color: 'bg-green-300' },
    { id: '6', symbol: 'DOT', change: '-4.56%', color: 'bg-red-500' },
    { id: '7', symbol: 'LINK', change: '+1.23%', color: 'bg-green-200' },
    { id: '8', symbol: 'UNI', change: '-1.78%', color: 'bg-red-300' },
    { id: '9', symbol: 'MATIC', change: '+6.89%', color: 'bg-green-500' }
  ];

  const sentimentIndicators: SentimentIndicator[] = [
    {
      id: '1',
      label: 'Fear & Greed Index',
      value: '72',
      percentage: 75,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      description: 'Greed - Market showing optimism',
      trend: 'up' as const
    },
    {
      id: '2',
      label: 'Social Sentiment',
      value: 'Bullish',
      percentage: 80,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      description: 'Positive social media sentiment',
      trend: 'up' as const
    },
    {
      id: '3',
      label: 'Volatility',
      value: 'High',
      percentage: 83,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      description: 'Elevated market volatility',
      trend: 'neutral' as const
    }
  ];

  const newsItems: NewsItem[] = [
    {
      id: '1',
      title: 'Bitcoin ETF sees $2.1B inflow',
      timestamp: '15 minutes ago',
      borderColor: 'border-green-500'
    },
    {
      id: '2',
      title: 'Ethereum upgrade scheduled for Q2',
      timestamp: '1 hour ago',
      borderColor: 'border-blue-500'
    },
    {
      id: '3',
      title: 'Fed signals potential rate cuts',
      timestamp: '3 hours ago',
      borderColor: 'border-orange-500'
    },
    {
      id: '4',
      title: 'Solana DeFi TVL hits new high',
      timestamp: '6 hours ago',
      borderColor: 'border-purple-500'
    }
  ];

  const timeframes = ['1D', '7D', '30D', '1Y'];
  const moversTabs = ['Gainers', 'Losers', 'Volume'];

  const handleAssetClick = (asset: HeatmapAsset) => {
    console.log('Asset clicked:', asset.symbol);
    // TODO: Navigate to asset detail page or show modal
  };

  const handleNewsClick = (newsItem: NewsItem) => {
    console.log('News clicked:', newsItem.title);
    // TODO: Open news article or show details
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Market Analytics" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="Market Analytics" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          {/* Market Overview Metrics */}
          <div className="p-6 bg-white border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {(marketMetrics.length > 0 ? marketMetrics : mockMarketMetrics).map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Chart Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Market Overview Chart */}
                <MarketOverviewChart
                  activeTimeframe={activeTimeframe}
                  onTimeframeChange={setActiveTimeframe}
                  timeframes={timeframes}
                />

                {/* Top Movers */}
                <TopMoversTable
                  assets={topMoversData.length > 0 ? topMoversData : mockTopMovers}
                  activeTab={activeMoversTab}
                  onTabChange={setActiveMoversTab}
                  tabs={moversTabs}
                />
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Market Heatmap */}
                <MarketHeatmap
                  assets={heatmapAssets.length > 0 ? heatmapAssets : mockHeatmapAssets}
                  onAssetClick={handleAssetClick}
                />

                {/* Volume Analysis */}
                <VolumeAnalysis volumeData={volumeData.length > 0 ? volumeData : undefined} />

                {/* Market Sentiment */}
                <MarketSentiment indicators={sentimentIndicators} />

                {/* News Feed */}
                <NewsFeed
                  newsItems={newsItems}
                  onNewsClick={handleNewsClick}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MarketAnalytics;






