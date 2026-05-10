import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './Recommendation.module.css';

const Recommendation = ({ recommendation, isLoading, onFetch }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h6 className={styles.title}>ШІ Порадник</h6>
        <button 
          className={styles.refreshBtn} 
          onClick={onFetch}
          disabled={isLoading}
        >
          {isLoading ? '...' : 'Оновити'}
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
            <p>ШІ аналізує ваш стан...</p>
          </div>
        ) : recommendation ? (
          <div className={styles.markdownBody}>
            <ReactMarkdown>{recommendation}</ReactMarkdown>
          </div>
        ) : (
          <p className={styles.emptyText}>
            Натисніть кнопку, щоб отримати персональну пораду на основі вашого настрою 
          </p>
        )}
      </div>
    </div>
  );
};

export default Recommendation;