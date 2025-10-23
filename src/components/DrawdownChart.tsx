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

interface DrawdownChartProps {
  currentDrawdown: string;
  maxDrawdown: string;
}

const DrawdownChart: React.FC<DrawdownChartProps> = ({
  currentDrawdown,
  maxDrawdown
}) => {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Drawdown',
      data: [0, -1.2, -0.8, -2.1, -0.5, -1.8, -0.9, -2.8, -1.4, -0.7, -2.2, -1.2],
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
        ticks: { color: '#6b7280', font: { size: 11 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { 
          color: '#6b7280', 
          font: { size: 11 },
          callback: function(value: any) { 
            return Number(value) + '%'; 
          }
        }
      }
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Drawdown Analysis</h3>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Current: <span className="font-mono text-orange-600">{currentDrawdown}</span>
          </div>
          <div className="text-sm text-gray-600">
            Max: <span className="font-mono text-red-600">{maxDrawdown}</span>
          </div>
        </div>
      </div>
      <div className="chart-container">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default DrawdownChart;






