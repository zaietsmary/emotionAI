import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { EMOTION_CONFIG } from '../../../constants/emotions.js'; 

ChartJS.register(ArcElement, Tooltip, Legend);

const SentimentDoughnut = ({ history = [] }) => {
  
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null;

    const counts = { angry: 0, disgust: 0, fear: 0, happy: 0, neutral: 0, sad: 0, surprise: 0 };
    
    history.forEach(item => {
      let emotionKey = 'neutral';
      const source = item.source || 'camera';

      if (source === 'microphone' || item.audio_emotion) {
        emotionKey = (item.audio_emotion || item.text_emotion || 'neutral').toLowerCase().trim();
      } else if (item.top_emotions && Object.keys(item.top_emotions).length > 0) {
        emotionKey = Object.keys(item.top_emotions)[0].toLowerCase().trim();
      } else {
        const raw = item.face_emotion || item.dominant_emotion || 'neutral';
        emotionKey = raw.toLowerCase().trim();
      }

      if (counts[emotionKey] !== undefined) counts[emotionKey]++;
    });

    const activeLabels = Object.keys(counts).filter(key => counts[key] > 0);
    const dataValues = activeLabels.map(key => counts[key]);
    const backgroundColors = activeLabels.map(key => EMOTION_CONFIG[key]?.color || '#cccccc');

    return {
      labels: activeLabels,
      data: dataValues,
      colors: backgroundColors,
      maxIdx: dataValues.indexOf(Math.max(...dataValues)),
      activeKeys: activeLabels
    };
  }, [history]);

  if (!chartData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#7DCFFF', fontStyle: 'italic', fontWeight: '700' }}>
        АНАЛІЗУЄМО...
      </div>
    );
  }

  const dominantKey = chartData.activeKeys[chartData.maxIdx];
  const dominantLabel = EMOTION_CONFIG[dominantKey]?.label || dominantKey;
  const dominantColor = EMOTION_CONFIG[dominantKey]?.color || '#7DCFFF';

  const data = {
    labels: chartData.labels.map(l => EMOTION_CONFIG[l.toLowerCase()]?.label || l), 
    datasets: [{
      data: chartData.data,
      backgroundColor: chartData.colors, 
      borderWidth: 0,
      hoverOffset: 15,
      cutout: '75%', 
      borderRadius: 6,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom', 
        labels: {
          color: '#7DCFFF', 
          padding: 25,
          usePointStyle: true,
          font: { size: 11, weight: '700', family: "'Manrope', sans-serif" }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(18, 20, 29, 0.95)', 
        titleColor: '#7DCFFF',
        bodyColor: '#E2E8F0',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return ` ${context.label}: ${percentage}%`;
          }
        }
      }
    },
    animation: { animateScale: true, animateRotate: true, duration: 1500 }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '300px', padding: '10px' }}>
      <Doughnut data={data} options={options} />
      <div style={{ position: 'absolute', top: '41%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#7DCFFF', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2.5px', opacity: 0.7 }}>
          Домінує
        </p>
        <p style={{ margin: 0, fontSize: '1.8rem', color: dominantColor, fontWeight: '900', textShadow: `0 0 20px ${dominantColor}66` }}>
          {dominantLabel}
        </p>
      </div>
    </div>
  );
};

export default SentimentDoughnut;