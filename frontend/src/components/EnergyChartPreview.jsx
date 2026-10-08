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
import { Sun, BatteryCharging, Zap } from 'lucide-react';

// Register Chart.js modules
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

export default function EnergyChartPreview() {
  const hours = [
    '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
    '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
  ];

  // Synthetic 24-hr curves showcasing microgrid simulation preview
  const solarGeneration = [0.0, 0.0, 0.0, 0.4, 2.8, 5.6, 7.2, 6.4, 3.8, 0.9, 0.0, 0.0];
  const aggregateDemand = [1.8, 1.4, 1.2, 2.5, 4.2, 3.8, 4.0, 3.6, 4.8, 6.5, 5.2, 3.0];

  const data = {
    labels: hours,
    datasets: [
      {
        label: 'Solar PV Generation (kW)',
        data: solarGeneration,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#06b6d4',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Aggregate Demand (kW)',
        data: aggregateDemand,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: {
            family: 'Inter',
            size: 12,
          },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Inter',
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Inter',
            size: 11,
          },
        },
        title: {
          display: true,
          text: 'Power (kW)',
          color: '#64748b',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">Digital Twin Synthetic Telemetry</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
              Software Emulated
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulated 24-hour generation & consumption profile (Zero physical hardware required)
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Sun className="w-3.5 h-3.5 text-cyan-400" />
            <span>PV Peak: 7.2 kW</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Max Load: 6.5 kW</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 mt-4 w-full">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
