import React from 'react';

interface Performer {
  id: string;
  name: string;
  strategy: string;
  return: string;
  trades: number;
  type: 'positive' | 'negative';
}

interface TopPerformersProps {
  performers: Performer[];
}

const TopPerformers: React.FC<TopPerformersProps> = ({ performers }) => {
  const getBackgroundClass = (type: string) => {
    return type === 'positive' ? 'bg-green-50' : 'bg-red-50';
  };

  const getReturnClass = (type: string) => {
    return type === 'positive' ? 'profit' : 'loss';
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
      <div className="space-y-3">
        {performers.map((performer) => (
          <div 
            key={performer.id}
            className={`flex items-center justify-between p-3 ${getBackgroundClass(performer.type)} rounded-lg`}
          >
            <div>
              <div className="font-medium text-sm text-gray-900">{performer.name}</div>
              <div className="text-xs text-gray-500">{performer.strategy}</div>
            </div>
            <div className="text-right">
              <div className={`font-mono text-sm ${getReturnClass(performer.type)}`}>
                {performer.return}
              </div>
              <div className="text-xs text-gray-500">{performer.trades} trades</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPerformers;

