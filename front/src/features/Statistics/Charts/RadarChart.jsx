import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import { EMOTION_CONFIG } from '../../../constants/emotions.js'; 

import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const RadarChart = ({ history = [] }) => {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null;

    const counts = { happy: 0, surprise: 0, neutral: 0, sad: 0, disgust: 0, fear: 0, angry: 0 };

    history.forEach(item => {
      const emotionKey = (item.dominant_emotion || item.face_emotion || 'neutral').toLowerCase().trim();
      if (counts[emotionKey] !== undefined) {
        counts[emotionKey] += 1;
      }
    });

    const total = history.length;
    const labels = Object.keys(counts);
    const data = labels.map(key => total > 0 ? ((counts[key] / total) * 100).toFixed(1) : 0);

    return {
      labels: labels.map(l => EMOTION_CONFIG[l]?.label || l),
      datasets: [{
        data: data,
        label: 'Емоційний профіль',
        backgroundColor: 'rgba(125, 207, 255, 0.25)',
        borderColor: '#7DCFFF',
        borderWidth: 2,
        pointBackgroundColor: '#7DCFFF',
      }]
    };
  }, [history]);

  if (!chartData) {
    return (
      <div style={{ 
        height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        color: '#8892B0', fontStyle: 'italic'
      }}>
        Аналіз емоційного профілю...
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        grid: { 
          color: 'rgba(255, 255, 255, 0.08)', 
          circular: false 
        },
        angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { 
          display: false, 
          stepSize: 20 
        },
        pointLabels: {
          color: '#8892B0', 
          font: {
            size: 11,
            weight: '700',
            family: "'Manrope', sans-serif",
            letterSpacing: '1px'
          },
          padding: 15 
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(18, 20, 29, 0.9)', 
        titleColor: '#7DCFFF',
        bodyColor: '#E2E8F0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw}%`
        }
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '320px', padding: '10px' }}>
      <Radar data={chartData} options={options} />
    </div>
  );
};

export default RadarChart;