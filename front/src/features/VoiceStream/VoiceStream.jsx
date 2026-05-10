import React, { useState, useRef } from 'react';
import styles from './VoiceStream.module.css';
import { emotionApi } from '../../services/api';
import { MicrophoneIcon } from '../../components/icons/themeIcons';

const VoiceStream = ({ onAnalysisComplete, setIsRecording: setExternalRecording }) => {
  const [isLocalRecording, setIsLocalRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      setIsLocalRecording(true);
      if (setExternalRecording) setExternalRecording(true); 

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToServer(audioBlob);
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Помилка доступу до мікрофона:", err);
      setIsLocalRecording(false);
      if (setExternalRecording) setExternalRecording(false);
      alert("Будь ласка, дозвольте доступ до мікрофона");
    }
  };

  const stopRecording = () => {
    setIsLocalRecording(false);
    if (setExternalRecording) setExternalRecording(false); 

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendAudioToServer = async (blob) => {
    setIsProcessing(true);
    try {
      const result = await emotionApi.sendVoiceAnalysis(blob);
      if (onAnalysisComplete) onAnalysisComplete(result);
    } catch (err) {
      console.error("Помилка аналізу:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      {isProcessing ? (
        /* СТАН ОБРОБКИ (Whisper) */
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Whisper аналізує голос...</p>
        </div>
      ) : isLocalRecording ? (
        /* СТАН ЗАПИСУ */
        <div className={styles.activeRecording}>
          <button onClick={stopRecording} className={styles.roundStopButton}>
            <div className={styles.pulseRing}></div>
            <MicrophoneIcon size={26} color="#12141D" />
          </button>
          <div className={styles.statusText}>
            <p className={styles.recordingText}>Слухаю вас...</p>
            <small>Натисніть, щоб зупинити</small>
          </div>
        </div>
      ) : (
        <div className={styles.placeholder}>
          <button onClick={startRecording} className={styles.roundStartButton}>
            <MicrophoneIcon size={26} color="#12141D" />
          </button>
          <div className={styles.statusText}>
            <p>Почати говорити</p>
            <small>Голосовий аналіз емоцій</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceStream;