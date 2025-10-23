import React from 'react';

export interface HeatmapAsset {
  id: string;
  symbol: string;
  change: string;
  color: string;
}

interface MarketHeatmapProps {
  assets: HeatmapAsset[];
  onAssetClick?: (asset: HeatmapAsset) => void;
}

const MarketHeatmap: React.FC<MarketHeatmapProps> = ({
  assets,
  onAssetClick
}) => {
  const getTextColor = (color: string) => {
    // Determine text color based on background color
    if (color.includes('green-200') || color.includes('red-200') || color.includes('yellow-200')) {
      return 'text-gray-800';
    }
    return 'text-white';
  };

  const handleAssetClick = (asset: HeatmapAsset) => {
    if (onAssetClick) {
      onAssetClick(asset);
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Heatmap</h3>
      <div className="grid grid-cols-3 gap-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={`heatmap-cell ${asset.color} p-3 rounded text-center cursor-pointer ${getTextColor(asset.color)}`}
            onClick={() => handleAssetClick(asset)}
          >
            <div className="text-xs font-medium">{asset.symbol}</div>
            <div className="text-sm font-bold">{asset.change}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketHeatmap;

