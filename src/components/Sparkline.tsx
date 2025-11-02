import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#059669',
  width = 60,
  height = 40
}) => {
  const chartData = {
    labels: data.map(() => ''),
    datasets: [{
      data: data,
      borderColor: color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
      fill: false
    }]
  };

  const options = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    },
    elements: {
      point: { radius: 0 }
    }
  };

  return (
    <div className="price-sparkline" style={{ width, height }}>
      <Line data={chartData} options={options} width={width} height={height} />
    </div>
  );
};

export default Sparkline;




