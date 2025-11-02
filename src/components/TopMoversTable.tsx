import React, { useState, useMemo } from 'react';
import Sparkline from './Sparkline';

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  price: string;
  change24h: string;
  changeAmount: string;
  volume: string;
  sparklineData: number[];
  color: string;
  icon: string;
  iconBg: string;
}

type SortField = 'name' | 'price' | 'change24h' | 'volume';
type SortDirection = 'asc' | 'desc';

interface TopMoversTableProps {
  assets: Asset[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
}

const TopMoversTable: React.FC<TopMoversTableProps> = ({
  assets,
  activeTab,
  onTabChange,
  tabs
}) => {
  const [sortField, setSortField] = useState<SortField>('change24h');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Show 20 assets per page instead of 6

  // Sorting function
  const sortedAssets = useMemo(() => {
    const sorted = [...assets].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = parseFloat(a.price.replace(/[$,]/g, ''));
          bValue = parseFloat(b.price.replace(/[$,]/g, ''));
          break;
        case 'change24h':
          aValue = parseFloat(a.change24h.replace(/[%+]/g, ''));
          bValue = parseFloat(b.change24h.replace(/[%+]/g, ''));
          break;
        case 'volume':
          aValue = parseVolumeForSort(a.volume);
          bValue = parseVolumeForSort(b.volume);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [assets, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssets = sortedAssets.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const parseVolumeForSort = (volume: string): number => {
    const num = parseFloat(volume.replace(/[$,BMK]/g, ''));
    if (volume.includes('B')) return num * 1e9;
    if (volume.includes('M')) return num * 1e6;
    if (volume.includes('K')) return num * 1e3;
    return num;
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
      </svg>
    );
  };
  const getChangeClass = (change: string) => {
    if (change.startsWith('+')) return 'profit';
    if (change.startsWith('-')) return 'loss';
    return 'neutral';
  };

  const getChangeAmountClass = (change: string) => {
    if (change.startsWith('+')) return 'text-green-600';
    if (change.startsWith('-')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Top Movers</h3>
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === tab ? 'tab-active' : 'tab-inactive'
              }`}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('name')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Asset</span>
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('price')}
                      className="flex items-center space-x-1 hover:text-gray-700 ml-auto"
                    >
                      <span>Price</span>
                      {getSortIcon('price')}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('change24h')}
                      className="flex items-center space-x-1 hover:text-gray-700 ml-auto"
                    >
                      <span>24h Change</span>
                      {getSortIcon('change24h')}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('volume')}
                      className="flex items-center space-x-1 hover:text-gray-700 ml-auto"
                    >
                      <span>Volume</span>
                      {getSortIcon('volume')}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    7d Trend
                  </th>
                </tr>
              </thead>
          <tbody>
            {paginatedAssets.map((asset) => (
              <tr key={asset.id} className="table-row border-b border-gray-100">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${asset.iconBg} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                      {asset.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{asset.name}</div>
                      <div className="text-xs text-gray-500">{asset.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-mono text-gray-900">
                  {asset.price}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className={`${getChangeClass(asset.change24h)} font-mono`}>
                    {asset.change24h}
                  </div>
                  <div className={`text-xs ${getChangeAmountClass(asset.changeAmount)}`}>
                    {asset.changeAmount}
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-mono text-gray-600">
                  {asset.volume}
                </td>
                <td className="py-4 px-4 text-right">
                  <Sparkline 
                    data={asset.sparklineData} 
                    color={asset.color}
                    width={60}
                    height={40}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedAssets.length)} of {sortedAssets.length} assets
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm border rounded ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopMoversTable;
































