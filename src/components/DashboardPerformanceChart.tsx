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

const DashboardPerformanceChart: React.FC = () => {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Portfolio Performance',
      data: [100000, 105200, 108900, 107600, 115400, 118200],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4
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
        ticks: { color: '#6b7280', font: { size: 10 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { 
          color: '#6b7280', 
          font: { size: 10 },
          callback: function(value: any) { 
            return '$' + (Number(value)/1000) + 'K'; 
          }
        }
      }
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
        <div className="text-sm text-green-600 font-mono">+18.2%</div>
      </div>
      <div className="h-48">
        <Line data={data} options={options} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Total Return</div>
          <div className="font-semibold text-gray-900">$18,200</div>
        </div>
        <div>
          <div className="text-gray-500">Win Rate</div>
          <div className="font-semibold text-gray-900">73.2%</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPerformanceChart;


