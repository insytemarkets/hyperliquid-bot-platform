import React from 'react';

interface StrategyFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  activeRiskLevels: string[];
  onRiskLevelToggle: (riskLevel: string) => void;
  activePerformanceLevels: string[];
  onPerformanceLevelToggle: (performanceLevel: string) => void;
}

const StrategyFilters: React.FC<StrategyFiltersProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  activeCategory,
  onCategoryChange,
  activeRiskLevels,
  onRiskLevelToggle,
  activePerformanceLevels,
  onPerformanceLevelToggle
}) => {
  const categories = [
    'All Strategies',
    'Grid Trading',
    'DCA',
    'Momentum',
    'Mean Reversion',
    'Arbitrage',
    'Scalping',
    'Swing Trading'
  ];

  const riskLevels = [
    { name: 'Low', color: 'bg-green-100 text-green-700' },
    { name: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { name: 'High', color: 'bg-red-100 text-red-700' }
  ];

  const performanceLevels = [
    { name: 'Excellent', color: 'bg-green-100 text-green-700' },
    { name: 'Good', color: 'bg-blue-100 text-blue-700' },
    { name: 'Average', color: 'bg-gray-100 text-gray-700' }
  ];

  return (
    <div className="card rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Strategy Library</h2>
          <p className="text-sm text-gray-500">Discover and deploy proven trading strategies</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search strategies..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="performance">Sort by Performance</option>
            <option value="risk">Sort by Risk</option>
            <option value="popularity">Sort by Popularity</option>
            <option value="date">Sort by Date</option>
            <option value="return">Sort by Return</option>
          </select>
        </div>
      </div>
      
      {/* Category Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {categories.map((category) => (
          <div 
            key={category}
            className={`filter-chip ${activeCategory === category ? 'active' : ''}`}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </div>
        ))}
      </div>
      
      {/* Risk and Performance Filters */}
      <div className="flex items-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <span>Risk Level:</span>
          <div className="flex space-x-1">
            {riskLevels.map((risk) => (
              <button 
                key={risk.name}
                className={`px-2 py-1 rounded text-xs transition-opacity ${risk.color} ${
                  activeRiskLevels.includes(risk.name) ? 'opacity-100' : 'opacity-50'
                }`}
                onClick={() => onRiskLevelToggle(risk.name)}
              >
                {risk.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span>Performance:</span>
          <div className="flex space-x-1">
            {performanceLevels.map((performance) => (
              <button 
                key={performance.name}
                className={`px-2 py-1 rounded text-xs transition-opacity ${performance.color} ${
                  activePerformanceLevels.includes(performance.name) ? 'opacity-100' : 'opacity-50'
                }`}
                onClick={() => onPerformanceLevelToggle(performance.name)}
              >
                {performance.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyFilters;


