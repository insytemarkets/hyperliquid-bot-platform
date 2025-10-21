import React from 'react';

export interface NewsItem {
  id: string;
  title: string;
  timestamp: string;
  borderColor: string;
}

interface NewsFeedProps {
  newsItems: NewsItem[];
  onNewsClick?: (newsItem: NewsItem) => void;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ newsItems, onNewsClick }) => {
  const handleNewsClick = (newsItem: NewsItem) => {
    if (onNewsClick) {
      onNewsClick(newsItem);
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Market News</h3>
      <div className="space-y-3">
        {newsItems.map((item) => (
          <div 
            key={item.id}
            className={`border-l-4 ${item.borderColor} pl-3 cursor-pointer hover:bg-gray-50 p-2 rounded-r transition-colors`}
            onClick={() => handleNewsClick(item)}
          >
            <div className="text-sm text-gray-900 font-medium">{item.title}</div>
            <div className="text-xs text-gray-500">{item.timestamp}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
