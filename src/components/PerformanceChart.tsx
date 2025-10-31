import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceChartProps {
  title: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title,
  activeTab,
  onTabChange,
  tabs
}) => {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Portfolio',
      data: [100000, 105200, 108900, 107600, 115400, 118200, 121800, 119500, 124300, 127800, 125600, 132400],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6
    }, {
      label: 'Benchmark',
      data: [100000, 102000, 104100, 103500, 107200, 109800, 111500, 110200, 113600, 115900, 114800, 118200],
      borderColor: '#6b7280',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [5, 5],
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top' as const,
        align: 'end' as const
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 12 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { 
          color: '#6b7280', 
          font: { size: 12 },
          callback: function(value: any) { 
            return '$' + (Number(value)/1000) + 'K'; 
          }
        }
      }
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
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
      <div className="chart-container large">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default PerformanceChart;















