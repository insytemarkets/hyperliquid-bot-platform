import React from 'react';

interface Activity {
  id: string;
  type: 'trade' | 'bot_created' | 'bot_paused' | 'bot_completed';
  message: string;
  timestamp: string;
  amount?: string;
}

const RecentActivity: React.FC = () => {
  const activities: Activity[] = [
    {
      id: '1',
      type: 'trade',
      message: 'ETH Grid Master executed buy order',
      timestamp: '2 minutes ago',
      amount: '+$45.67'
    },
    {
      id: '2',
      type: 'bot_created',
      message: 'New bot "AVAX Scalper" created',
      timestamp: '15 minutes ago'
    },
    {
      id: '3',
      type: 'bot_paused',
      message: 'SOL Scalper paused due to high volatility',
      timestamp: '1 hour ago'
    },
    {
      id: '4',
      type: 'bot_completed',
      message: 'BTC DCA Pro completed DCA cycle',
      timestamp: '2 hours ago',
      amount: '+$234.12'
    }
  ];

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'trade':
        return 'bg-green-500';
      case 'bot_created':
        return 'bg-blue-500';
      case 'bot_paused':
        return 'bg-red-500';
      case 'bot_completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`w-2 h-2 ${getActivityColor(activity.type)} rounded-full mt-2`}></div>
            <div className="flex-1">
              <div className="text-sm text-gray-900">{activity.message}</div>
              <div className="text-xs text-gray-500">
                {activity.timestamp}
                {activity.amount && (
                  <span className="profit ml-2">{activity.amount}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;




