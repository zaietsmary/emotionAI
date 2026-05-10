import React from 'react';
import styles from './EmotionHistory.module.css';

const EmotionHistory = ({ history, isLoading, onClear }) => {
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h6 className={styles.title}>Історія аналізу емоцій</h6>
        <button className={styles.clearBtn} onClick={onClear} title="Очистити історію">
          Очистити
        </button>
      </div>

      <div className={styles.content}>
        {isLoading && (!history || history.length === 0) ? (
          <div className={styles.loader}>Завантаження історії...</div>
        ) : history && history.length > 0 ? (
          <div className={styles.list}>
            {history.map((log, index) => (
              <div key={log.id || log._id || index} className={styles.item}>
                <span className={styles.time}>{formatTime(log.timestamp)}</span>
                
<div className={styles.tags}>
  
  {(log.source === 'fusion' || log.source === 'camera') && log.emotions_map && (
    Object.entries(log.emotions_map).map(([emo, val]) => (
      <span key={emo} className={`${styles.tag} ${styles[emo.toLowerCase()]}`}>
        {log.source === 'fusion' ? '🧠' : '👤'} {emo}: {(val * 100).toFixed(0)}%
      </span>
    ))
  )}

  {log.source === 'voice' && (
    <>
      <span className={`${styles.tag} ${styles[(log.audio_emotion || 'neutral').toLowerCase()]}`}>
        🎤 {log.audio_emotion || 'Neutral'} (Tone)
      </span>

      {log.text_emotion && (
        <span className={`${styles.tag} ${styles[log.text_emotion.toLowerCase()]}`}>
          📝 {log.text_emotion} (Text)
        </span>
      )}
      
    </>
  )}
  
</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              Історія порожня. <br/> 
              Запустіть аналіз для формування Top-3 емоцій!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmotionHistory;