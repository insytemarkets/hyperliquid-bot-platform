import React, { useState, useEffect } from 'react';
import { hyperliquidService } from '../services/hyperliquid';

export interface VolumeData {
  id: string;
  pair: string;
  volume: string;
  percentage: number;
  change24h: string;
  trades: number;
}

interface VolumeAnalysisProps {
  volumeData?: VolumeData[];
}

const VolumeAnalysis: React.FC<VolumeAnalysisProps> = ({ volumeData }) => {
  const [activeTab, setActiveTab] = useState('24h');
  const [realVolumeData, setRealVolumeData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchVolumeData = async () => {
      try {
        setLoading(true);
        const marketData = await hyperliquidService.getMarketOverviewData();
        
        // Convert to VolumeData format
        const topAssets = marketData.topAssets.slice(0, 10); // Top 10 by volume
        const maxVolume = hyperliquidService.parseVolume(topAssets[0]?.volume || '0');
        
        const formattedData: VolumeData[] = topAssets.map((asset, index) => {
          const volumeNum = hyperliquidService.parseVolume(asset.volume);
          const percentage = maxVolume > 0 ? Math.round((volumeNum / maxVolume) * 100) : 0;
          
          // Estimate trades based on volume (rough approximation)
          const avgTradeSize = 5000; // $5K average trade
          const estimatedTrades = Math.round(volumeNum / avgTradeSize);
          
          return {
            id: `${index + 1}`,
            pair: `${asset.coin}-USD`,
            volume: asset.volume,
            percentage,
            change24h: `${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`,
            trades: estimatedTrades,
          };
        });
        
        setRealVolumeData(formattedData);
      } catch (error) {
        console.error('Failed to fetch volume data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVolumeData();
    const interval = setInterval(fetchVolumeData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [activeTab]);
  
  const data = volumeData || realVolumeData;
  
  // Calculate totals
  const totalVolume = data.reduce((sum, item) => {
    return sum + hyperliquidService.parseVolume(item.volume);
  }, 0);
  
  const totalTrades = data.reduce((sum, item) => sum + item.trades, 0);
  const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">Volume Analysis</h3>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
        <div className="flex space-x-2">
          {['24h', '7d', '30d'].map((period) => (
            <button
              key={period}
              onClick={() => setActiveTab(period)}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === period ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      
      {loading && data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading volume data...</div>
      ) : (
        <>
          <div className="space-y-4">
            {data.map((item, index) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900">{item.pair}</div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.change24h.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.change24h}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{item.volume}</div>
                    <div className="text-xs text-gray-500">{item.trades.toLocaleString()} trades</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="volume-bar h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: `hsl(${220 - index * 20}, 70%, 50%)`
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Total Volume</div>
                <div className="font-semibold text-gray-900">
                  {hyperliquidService.formatVolume(totalVolume)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Avg Trade Size</div>
                <div className="font-semibold text-gray-900">
                  {hyperliquidService.formatVolume(avgTradeSize)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VolumeAnalysis;


























