import React from 'react';

interface SidebarProps {
  activeItem?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem }) => {
  const menuItems = [
    { name: 'Overview', path: '/dashboard', icon: '📊' },
    { name: 'My Bots', path: '/my-bots', icon: '🤖' },
    { name: 'Strategies', path: '/strategies', icon: '⚡' },
    { name: 'Templates', path: '/templates', icon: '📋' },
    { name: 'Bot Builder', path: '/bot-builder', icon: '🔧' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Market Analytics', path: '/market-analytics', icon: '🌍' },
    { name: 'Trading', path: '/trading', icon: '💹' },
    { name: 'Backtesting', path: '/backtesting', icon: '🔄' },
  ];

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <a
              key={item.name}
              href={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeItem === item.name
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

