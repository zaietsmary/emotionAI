import React, { useEffect, useState, useRef } from 'react';
import styles from './VideoStream.module.css';
import { STREAM_URL } from '../../services/api';
import { CameraIcon } from '../../components/icons/themeIcons';

const VideoStream = ({ isStreaming, onStart, onStop }) => {

  const [isImageLoading, setIsImageLoading] = useState(true);
  const [streamSrc, setStreamSrc] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
  if (isStreaming) {
    setIsImageLoading(true);
    setStreamSrc(`${STREAM_URL}?t=${Date.now()}`);
  } else {
    setStreamSrc(null);
    
    if (imgRef.current) {
      imgRef.current.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      imgRef.current.removeAttribute('src');
    }

    try {
      window.stop(); 
    } catch (e) {}
  }

  return () => {
    setStreamSrc(null);
  };
}, [isStreaming]);

  const handleLoad = () => {
    console.log("Stream received.");
    setIsImageLoading(false);
  };

  const handleError = () => {
    console.error("Error connecting to stream.");
    setIsImageLoading(false);
  };

return (
    <div className={styles.videoContainerWrapper}> 
      <div className={styles.container}>
        {isStreaming ? (
          <>
            {isImageLoading && (
              <div className={styles.loadingOverlay}>
                <CameraIcon size={48} color="#7DCFFF" />
                <div className={styles.spinner} style={{ marginTop: '10px' }}></div>
                <p>Підключення до камери...</p>
                <small>Ініціалізація нейромережі та захоплення пристрою</small>
              </div>
            )}
            
            <img 
              ref={imgRef}
              src={streamSrc} 
              alt="Emotion AI Stream" 
              className={styles.video}
              onLoad={handleLoad} 
              onError={handleError}
            />
          </>
        ) : (
          <div className={styles.placeholder}>
            <CameraIcon size={54} color="#7DCFFF" /> 
            <h3>Камера вимкнена</h3>
            <p>Натисніть кнопку нижче, щоб почати</p>
          </div>
        )}
      </div>

      {/* КНОПКИ ТЕПЕР ТУТ */}
      {!isStreaming ? (
        <button onClick={onStart} className={`${styles.btnMain} ${styles.btnStart}`}>
          Запустити камеру
        </button>
      ) : (
        <button onClick={onStop} className={`${styles.btnMain} ${styles.btnStop}`}>
          Зупинити камеру
        </button>
      )}
    </div>
  );
};

export default VideoStream;