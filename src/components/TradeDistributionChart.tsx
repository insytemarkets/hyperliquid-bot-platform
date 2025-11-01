import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TradeDistributionChartProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
}

const TradeDistributionChart: React.FC<TradeDistributionChartProps> = ({
  activeTab,
  onTabChange,
  tabs
}) => {
  const data = {
    labels: ['-5%', '-4%', '-3%', '-2%', '-1%', '0%', '1%', '2%', '3%', '4%', '5%'],
    datasets: [{
      label: 'Trade Count',
      data: [5, 8, 12, 18, 25, 15, 35, 42, 28, 18, 12],
      backgroundColor: [
        '#ef4444', '#ef4444', '#ef4444', '#ef4444', '#ef4444', 
        '#10b981', '#10b981', '#10b981', '#10b981', '#10b981', '#10b981'
      ],
      borderColor: [
        '#dc2626', '#dc2626', '#dc2626', '#dc2626', '#dc2626',
        '#059669', '#059669', '#059669', '#059669', '#059669', '#059669'
      ],
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 11 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { 
          color: '#6b7280', 
          font: { size: 11 }
        }
      }
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Trade Distribution</h3>
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
      <div className="chart-container">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default TradeDistributionChart;




























