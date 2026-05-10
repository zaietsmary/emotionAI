import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './Advice.module.css';

const Advice = ({ advice, isLoading, onFetch }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h6>Порада</h6>
        <button onClick={onFetch} disabled={isLoading}>
          {isLoading ? '...' : 'Оновити'}
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <p>Завантаження...</p>
        ) : advice ? ( 
          <div className={styles.markdownBody}>
            <ReactMarkdown>{advice}</ReactMarkdown>
          </div>
        ) : (
          <p>Натисніть кнопку для поради</p>
        )}
      </div>
    </div>
  );
};

export default Advice;