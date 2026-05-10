import React, { useMemo } from 'react';
import { Bubble } from 'react-chartjs-2';
import {
  Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend, CategoryScale
} from 'chart.js';
import { EMOTION_CONFIG } from '../../../constants/emotions';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, CategoryScale);

const yAxisMapping = {
  'happy': 7, 'surprise': 6, 'neutral': 5, 'sad': 4, 'disgust': 3, 'fear': 2, 'angry': 1
};

const EmotionBubbleChart = ({ history = [] }) => {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return { datasets: [] };

    const labels = history.map(item => 
      new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );

    const bubbleData = history.map((item, index) => {
      let emotionKey = 'neutral';
      let confidence = 0.5;
      let source = item.source || 'camera';

      if (source === 'microphone' || item.audio_emotion) {
        emotionKey = (item.audio_emotion || item.text_emotion || 'neutral').toLowerCase().trim();
        confidence = item.confidence || 0.85;
        source = 'microphone';
      } 
      else if (item.top_emotions && Object.keys(item.top_emotions).length > 0) {
        emotionKey = Object.keys(item.top_emotions)[0].toLowerCase().trim();
        confidence = item.top_emotions[Object.keys(item.top_emotions)[0]] || 0.8;
      } 
      else {
        const raw = item.face_emotion || item.dominant_emotion || 'neutral';
        emotionKey = raw.toLowerCase().trim();
        confidence = item.confidence || 0.7;
      }

      const yValue = yAxisMapping[emotionKey] !== undefined ? yAxisMapping[emotionKey] : 5;
      const config = EMOTION_CONFIG[emotionKey] || { color: '#999', label: emotionKey };

      return {
        x: index,
        y: yValue,
        r: Math.min(confidence * 14, 12),
        label: config.label,
        color: config.color,
        confidence: confidence,
        source: source
      };
    });

    return {
      labels,
      datasets: [{
        data: bubbleData,
        backgroundColor: bubbleData.map(d => `${d.color}66`), 
        borderColor: bubbleData.map(d => d.color),
        borderWidth: 2,
        hoverBackgroundColor: bubbleData.map(d => d.color),
      }]
    };
  }, [history]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'category',
        labels: chartData.labels,
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
          color: '#7DCFFF', 
          font: { 
            family: "'Manrope', sans-serif", 
            size: 9, 
            weight: '800' 
          },
          padding: 10
        },
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.03)',
          drawBorder: false
        }
      },
      y: {
        min: 0, max: 8,
        ticks: {
          stepSize: 1,
          color: '#7DCFFF',
          font: { 
            weight: '800', 
            size: 10, 
            family: "'Manrope', sans-serif" 
          },
          padding: 15,
          callback: (value) => {
            const key = Object.keys(yAxisMapping).find(k => yAxisMapping[k] === value);
            // Додаємо letterSpacing через пробіли або просто робимо UPPERCASE
            return key ? (EMOTION_CONFIG[key]?.label || key).toUpperCase().split('').join(' ') : '';
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.06)', 
          drawBorder: false
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(18, 20, 29, 0.95)',
        titleColor: '#7DCFFF',
        bodyColor: '#E2E8F0',
        borderColor: 'rgba(125, 207, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const d = ctx.raw;
            const srcIcon = d.source === 'microphone' ? '🎤' : '👤';
            return ` ${srcIcon} ${d.label}: ${Math.round(d.confidence * 100)}%`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '350px', width: '100%', padding: '15px' }}>
      <Bubble data={chartData} options={options} />
    </div>
  );
};

export default EmotionBubbleChart;