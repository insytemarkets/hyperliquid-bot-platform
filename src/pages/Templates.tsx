import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TemplateCard, { Template } from '../components/TemplateCard';
import TemplatePreview from '../components/TemplatePreview';
import MyTemplates from '../components/MyTemplates';
import PopularTemplates from '../components/PopularTemplates';

const Templates: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All Templates');
  const [activeDifficulties, setActiveDifficulties] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Sort by Popularity');

  // Mock template data
  const templates: Template[] = [
    {
      id: '1',
      name: 'Basic Grid Trading',
      description: 'A straightforward grid trading strategy that places buy and sell orders at regular intervals around the current price.',
      category: 'Grid Trading',
      difficulty: 'Beginner',
      avgReturn: '+15.2%',
      riskLevel: 'Medium',
      popularity: 4,
      users: 1247,
      icon: 'grid',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: '2',
      name: 'Smart DCA',
      description: 'Intelligent DCA strategy that adjusts purchase intervals based on market volatility and price trends.',
      category: 'DCA',
      difficulty: 'Beginner',
      avgReturn: '+22.8%',
      riskLevel: 'Low',
      popularity: 5,
      users: 2891,
      icon: 'dca',
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: '3',
      name: 'Momentum Breakout',
      description: 'Advanced momentum strategy that identifies and trades breakouts using multiple technical indicators and volume analysis.',
      category: 'Momentum',
      difficulty: 'Intermediate',
      avgReturn: '+31.5%',
      riskLevel: 'High',
      popularity: 3,
      users: 743,
      icon: 'momentum',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: '4',
      name: 'Cross-Exchange Arbitrage',
      description: 'Sophisticated arbitrage strategy that exploits price differences across multiple exchanges with automated risk management.',
      category: 'Arbitrage',
      difficulty: 'Expert',
      avgReturn: '+18.7%',
      riskLevel: 'Low',
      popularity: 2,
      users: 189,
      icon: 'arbitrage',
      gradient: 'from-teal-500 to-teal-600'
    }
  ];

  const categories = [
    'All Templates',
    'Grid Trading',
    'DCA',
    'Momentum',
    'Mean Reversion',
    'Arbitrage',
    'Scalping',
    'Custom'
  ];

  const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = activeCategory === 'All Templates' || template.category === activeCategory;
    const matchesDifficulty = activeDifficulties.length === 0 || activeDifficulties.includes(template.difficulty);
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  const handleDifficultyToggle = (difficulty: string) => {
    setActiveDifficulties(prev => 
      prev.includes(difficulty) 
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const handleTemplatePreview = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (template: Template) => {
    console.log('Using template:', template.name);
    // TODO: Navigate to bot creation with template
  };

  const handleCustomizeAndDeploy = (template: Template, parameters: any) => {
    console.log('Customizing and deploying template:', template.name, 'with parameters:', parameters);
    // TODO: Create bot with template and parameters
  };

  const handleEditTemplate = (templateId: string) => {
    console.log('Edit template:', templateId);
    // TODO: Navigate to template editor
  };

  const handleViewAllTemplates = () => {
    console.log('View all my templates');
    // TODO: Navigate to my templates page
  };

  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'difficulty-beginner';
      case 'Intermediate':
        return 'difficulty-intermediate';
      case 'Advanced':
        return 'difficulty-advanced';
      case 'Expert':
        return 'difficulty-expert';
      default:
        return 'difficulty-beginner';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Templates" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="Templates" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
            {/* Header Section */}
            <div className="card rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Strategy Templates</h2>
                  <p className="text-sm text-gray-500">Pre-built trading strategies ready to deploy</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search templates..." 
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <select 
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option>Sort by Popularity</option>
                    <option>Sort by Performance</option>
                    <option>Sort by Date</option>
                    <option>Sort by Difficulty</option>
                  </select>
                </div>
              </div>
              
              {/* Category Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                {categories.map((category) => (
                  <div 
                    key={category}
                    className={`category-filter ${activeCategory === category ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(category)}
                  >
                    {category}
                  </div>
                ))}
              </div>
              
              {/* Difficulty Filters */}
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span>Difficulty:</span>
                  <div className="flex space-x-1">
                    {difficulties.map((difficulty) => (
                      <button 
                        key={difficulty}
                        className={`difficulty-badge ${getDifficultyClass(difficulty)} ${
                          activeDifficulties.includes(difficulty) ? '' : 'opacity-50'
                        }`}
                        onClick={() => handleDifficultyToggle(difficulty)}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Templates Grid */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onPreview={handleTemplatePreview}
                      onUseTemplate={handleUseTemplate}
                    />
                  ))}
                </div>

                {/* Load More */}
                <div className="text-center mt-8">
                  <button className="btn-secondary px-6 py-3 rounded-lg font-medium">
                    Load More Templates
                  </button>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Template Preview */}
                <TemplatePreview
                  template={selectedTemplate}
                  onCustomizeAndDeploy={handleCustomizeAndDeploy}
                />

                {/* My Templates */}
                <MyTemplates
                  onEditTemplate={handleEditTemplate}
                  onViewAllTemplates={handleViewAllTemplates}
                />

                {/* Popular Templates */}
                <PopularTemplates />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Templates;
