import React, { useRef, useState, useMemo } from 'react'; 
import html2canvas from 'html2canvas';
import RadarChart from './Charts/RadarChart'; 
import SentimentDoughnut from './Charts/DoughnutChart';
import EmotionBubbleChart from './Charts/EmotionBubbleChart';
import EmotionHistory from './EmotionHistory';
import styles from './Statistics.module.css';
import { DownloadIcon } from '../../components/icons/themeIcons.jsx';

const Statistics = ({ stats, history, isLoading, onClear, onFetchHistory, view }) => {
  const hasData = stats && Object.keys(stats).length > 0;
  const hasHistory = history && history.length > 0;

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const dashboardRef = useRef(null);

const visibleHistory = useMemo(() => {
  if (!history) return [];
  
  const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (sorted.length > 500) {
    const step = Math.ceil(sorted.length / 500);
    return sorted.filter((_, index) => index % step === 0);
  }

  return sorted;
}, [history]);

  const dynamicStats = useMemo(() => {
    if (!visibleHistory || visibleHistory.length === 0) {
      return stats || { labels: [], datasets: [{ data: [] }] };
    }

    const emotionSums = {};
    let totalWeight = 0;

    visibleHistory.forEach(item => {
      const mapToUse = item.emotions_map || item.top_emotions; 
      if (mapToUse && typeof mapToUse === 'object') {
        Object.entries(mapToUse).forEach(([emo, value]) => {
          const normalizedEmo = emo.toLowerCase().trim();
          emotionSums[normalizedEmo] = (emotionSums[normalizedEmo] || 0) + value;
          totalWeight += value;
        });
      }
      else if (item.source === 'microphone' || item.audio_emotion) {
        const audioEmo = item.audio_emotion?.toLowerCase().trim();
        const textEmo = item.text_emotion?.toLowerCase().trim();

        if (audioEmo) {
          emotionSums[audioEmo] = (emotionSums[audioEmo] || 0) + 1;
          totalWeight += 1;
        }
        if (textEmo && textEmo !== audioEmo) {
          emotionSums[textEmo] = (emotionSums[textEmo] || 0) + 0.5;
          totalWeight += 0.5;
        }
      }
      else {
        const singleEmo = item.face_emotion || item.dominant_emotion;
        if (singleEmo) {
          const normalizedEmo = singleEmo.toLowerCase().trim();
          emotionSums[normalizedEmo] = (emotionSums[normalizedEmo] || 0) + 1;
          totalWeight += 1;
        }
      }
    });

    const labels = Object.keys(emotionSums);
    const data = labels.map(label => 
      totalWeight > 0 ? (emotionSums[label] / totalWeight) : 0
    );

    return {
      labels: labels,
      datasets: [{
        label: 'Розподіл емоцій (Мультимодально)',
        data: data,
      }]
    };
  }, [visibleHistory, stats]);

  const handleDownloadReport = async () => {
    if (!dashboardRef.current) return;
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Emotional-AI-Report-${selectedDate}.png`;
      link.click();
    } catch (err) {
      console.error("Помилка при створенні звіту:", err);
    }
  };

  return (
    <div className={styles.container}>
      {view === 'chart' && (
        <>
          <div className={styles.actionsBar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            
<div className={styles.dateSelectorContainer}>
  <label className={styles.dateLabel}>
    Аналіз за день:
  </label>
  <input 
    type="date" 
    className={styles.datePicker}
    value={selectedDate}
    max={new Date().toISOString().split('T')[0]}
    onChange={(e) => {
      const newDate = e.target.value;
      setSelectedDate(newDate);
      onFetchHistory(newDate);
    }}
  />
</div>

            <button 
              className={styles.downloadBtn} 
              onClick={handleDownloadReport}
              disabled={!hasHistory}
            >
              <DownloadIcon size={20} /> Завантажити звіт
            </button>
          </div>

          <div className={styles.dashboardGrid} ref={dashboardRef}>
            
            <div className={`${styles.card} ${styles.fullWidth}`}>
              <div className={styles.chartWrapper}>
                {hasHistory ? (
                  <EmotionBubbleChart key={history.length} history={visibleHistory} />
                ) : (
                  <div className={styles.noData}>Даних за цей день не знайдено 🎥🎤</div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.chartWrapper}>
                {hasHistory ? (
  <RadarChart history={visibleHistory} /> 
) : (
  <div className={styles.noData}>Даних за цей день не знайдено 🎥🎤</div>
)}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.chartWrapper}>
                {hasHistory ? (
                  <SentimentDoughnut history={visibleHistory} /> 
) : (
  <div className={styles.noData}>Даних за цей день не знайдено 🎥🎤</div>
)}
              </div>
            </div>

          </div>
        </>
      )}

      {view === 'list' && (
        <div className={styles.historySection}>
          <EmotionHistory history={history} isLoading={isLoading} onClear={onClear} onFetch={onFetchHistory} />
        </div>
      )}
    </div>
  );
};

export default Statistics;