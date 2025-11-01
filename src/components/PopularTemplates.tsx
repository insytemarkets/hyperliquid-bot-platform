import React from 'react';

interface PopularTemplate {
  id: string;
  name: string;
  newUsers: number;
  rank: number;
  color: string;
}

const PopularTemplates: React.FC = () => {
  const popularTemplates: PopularTemplate[] = [
    {
      id: '1',
      name: 'Smart DCA',
      newUsers: 127,
      rank: 1,
      color: 'bg-blue-500'
    },
    {
      id: '2',
      name: 'Basic Grid Trading',
      newUsers: 89,
      rank: 2,
      color: 'bg-green-500'
    },
    {
      id: '3',
      name: 'Momentum Breakout',
      newUsers: 67,
      rank: 3,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular This Week</h3>
      <div className="space-y-3">
        {popularTemplates.map((template) => (
          <div key={template.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 ${template.color} rounded flex items-center justify-center text-white text-xs font-bold`}>
                {template.rank}
              </div>
              <span className="text-sm text-gray-900">{template.name}</span>
            </div>
            <span className="text-xs text-gray-500">+{template.newUsers} users</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularTemplates;


