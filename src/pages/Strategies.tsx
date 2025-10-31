import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StrategyCard, { Strategy } from '../components/StrategyCard';
import StrategyFilters from '../components/StrategyFilters';

const Strategies: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('performance');
  const [activeCategory, setActiveCategory] = useState('All Strategies');
  const [activeRiskLevels, setActiveRiskLevels] = useState<string[]>([]);
  const [activePerformanceLevels, setActivePerformanceLevels] = useState<string[]>([]);

  // Real strategy data - Intelligent Multi-Timeframe Breakout
  const strategies: Strategy[] = [
    {
      id: 'multi_timeframe_breakout',
      name: 'Intelligent Multi-Timeframe Breakout',
      description: 'Advanced strategy that monitors 5m/15m/30m highs with dynamic risk management, volume analysis, and momentum scoring. Long-only quick scalps with tier-based entries.',
      category: 'Breakout',
      performance: 'Excellent',
      thirtyDayReturn: '+24.3%',
      winRate: '78.5%',
      maxDrawdown: '-3.1%',
      riskLevel: 'Medium',
      riskPercentage: 65,
      complexity: 4,
      users: 1,
      icon: 'breakout',
      gradient: 'from-emerald-500 to-emerald-600'
    }
  ];

  const handleRiskLevelToggle = (riskLevel: string) => {
    setActiveRiskLevels(prev => 
      prev.includes(riskLevel) 
        ? prev.filter(level => level !== riskLevel)
        : [...prev, riskLevel]
    );
  };

  const handlePerformanceLevelToggle = (performanceLevel: string) => {
    setActivePerformanceLevels(prev => 
      prev.includes(performanceLevel) 
        ? prev.filter(level => level !== performanceLevel)
        : [...prev, performanceLevel]
    );
  };

  const filteredStrategies = useMemo(() => {
    let filtered = strategies.filter(strategy => {
      // Category filter
      const matchesCategory = activeCategory === 'All Strategies' || strategy.category === activeCategory;
      
      // Search filter
      const matchesSearch = strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           strategy.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           strategy.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Risk level filter
      const matchesRisk = activeRiskLevels.length === 0 || activeRiskLevels.includes(strategy.riskLevel);
      
      // Performance filter
      const matchesPerformance = activePerformanceLevels.length === 0 || activePerformanceLevels.includes(strategy.performance);
      
      return matchesCategory && matchesSearch && matchesRisk && matchesPerformance;
    });

    // Sort strategies
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          const performanceOrder = { 'Excellent': 4, 'Good': 3, 'Average': 2, 'Poor': 1, 'Risky': 0 };
          return performanceOrder[b.performance] - performanceOrder[a.performance];
        case 'risk':
          const riskOrder = { 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4 };
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        case 'popularity':
          return b.users - a.users;
        case 'return':
          const aReturn = parseFloat(a.thirtyDayReturn.replace('%', ''));
          const bReturn = parseFloat(b.thirtyDayReturn.replace('%', ''));
          return bReturn - aReturn;
        case 'date':
          // Mock sort by date (newest first)
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });

    return filtered;
  }, [strategies, searchTerm, activeCategory, activeRiskLevels, activePerformanceLevels, sortBy]);

  const handlePreview = (strategy: Strategy) => {
    console.log('Preview strategy:', strategy.name);
    // TODO: Open strategy preview modal or navigate to preview page
  };

  const handleDeploy = (strategy: Strategy) => {
    console.log('Deploy strategy:', strategy.name);
    // Navigate to bot builder with the strategy pre-selected
    window.location.href = `/bot-builder?strategy=${strategy.id}`;
  };

  const handleImportStrategy = () => {
    console.log('Import strategy');
    // TODO: Open import dialog
  };

  const handleCreateStrategy = () => {
    console.log('Create new strategy');
    // TODO: Navigate to strategy builder
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Strategies" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="Strategies" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
            {/* Filters and Search */}
            <StrategyFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortBy={sortBy}
              onSortChange={setSortBy}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              activeRiskLevels={activeRiskLevels}
              onRiskLevelToggle={handleRiskLevelToggle}
              activePerformanceLevels={activePerformanceLevels}
              onPerformanceLevelToggle={handlePerformanceLevelToggle}
            />

            {/* Results Summary */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredStrategies.length} of {strategies.length} strategies
                  {activeCategory !== 'All Strategies' && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {activeCategory}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
                    onClick={handleImportStrategy}
                  >
                    Import Strategy
                  </button>
                  <button 
                    className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
                    onClick={handleCreateStrategy}
                  >
                    Create Strategy
                  </button>
                </div>
              </div>
            </div>

            {/* Strategy Grid */}
            {filteredStrategies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStrategies.map((strategy) => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    onPreview={handlePreview}
                    onDeploy={handleDeploy}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies found</h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your filters or search terms to find strategies.
                </p>
                <button 
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('All Strategies');
                    setActiveRiskLevels([]);
                    setActivePerformanceLevels([]);
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Load More */}
            {filteredStrategies.length > 0 && (
              <div className="text-center mt-8">
                <button className="btn-secondary px-6 py-3 rounded-lg font-medium">
                  Load More Strategies
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Strategies;

