import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  activeItem?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'Overview' }) => {
  const menuItems = [
    {
      name: 'Overview',
      path: '/dashboard',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
      )
    },
    {
      name: 'My Bots',
      path: '/my-bots',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
        </svg>
      )
    },
    {
      name: 'Bot Builder',
      path: '/bot-builder',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M12 6V4l-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h8a2 2 0 002-2V8l-4-2z"/>
        </svg>
      )
    },
    {
      name: 'Templates',
      path: '/templates',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M12 6V4l-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h8a2 2 0 002-2V8l-4-2z"/>
        </svg>
      )
    },
    {
      name: 'Strategies',
      path: '/strategies',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      )
    },
    {
      name: 'Backtesting',
      path: '/backtesting',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
        </svg>
      )
    },
    {
      name: 'Trading',
      path: '/trading',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zM4 14a2 2 0 002 2h8a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4z"/>
        </svg>
      )
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
        </svg>
      )
    },
    {
      name: 'Market Analytics',
      path: '/market-analytics',
      icon: (
        <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
        </svg>
      )
    }
  ];

  return (
    <aside className="w-64 sidebar overflow-y-auto">
      <div className="p-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`sidebar-item flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                activeItem === item.name ? 'active' : ''
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700 mt-8">
        <div className="space-y-3">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Quick Stats</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Running</span>
              <span className="text-green-400 font-mono">8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Paused</span>
              <span className="text-yellow-400 font-mono">3</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Stopped</span>
              <span className="text-red-400 font-mono">1</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

