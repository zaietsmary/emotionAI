import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import VideoStream from './features/VideoStream/VideoStream';
import Statistics from './features/Statistics/Statistics';
import Recommendation from './features/Recommendation/Recommendation';
import Advice from './features/Statistics/Advice';
import VoiceStream from './features/VoiceStream/VoiceStream';

import { useEmotionData } from './hooks/useEmotionData';
import { emotionApi } from './services/api';
import { EMOTION_CONFIG } from './constants/emotions.js';
import { NeutralIcon } from './components/icons/Emoji.jsx';
import { HistoryIcon, DashboardIcon, AIIcon } from './components/icons/themeIcons.jsx';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('history');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const [aiReport, setAiReport] = useState({ text: '', isLoading: false });
  const [quickTip, setQuickTip] = useState({ text: '', isLoading: false });
  const [voiceAnalysis, setVoiceAnalysis] = useState({ transcription: '', advice: '', isLoading: false });

const { 
  history, chartData, stats, isLoading, currentLiveEmotion, 
  selectedDate, setSelectedDate, 
  fetchData, setHistory, setChartData, setStats, setCurrentLiveEmotion 
} = useEmotionData(isStreaming, sessionStartTime);

const handleDateChange = (newDate) => {
  setSelectedDate(newDate);
  fetchData(newDate);     
};

  const handleStartStream = () => {
    setQuickTip({ text: "", isLoading: false });
    setSessionStartTime(Date.now());
    setIsStreaming(true);
    setTimeout(fetchQuickTip, 7000);
  };

  const handleStopStream = () => {
    setIsStreaming(false);
    setCurrentLiveEmotion(null);
    setQuickTip({ text: "", isLoading: false });
    setSessionStartTime(null);
  };

  const fetchQuickTip = async (isBackground = false) => {
    if (!isBackground) {
      setQuickTip(prev => ({ ...prev, isLoading: true }));
    }
    
    try {
      const data = await emotionApi.getAdvice();
      setQuickTip({ 
        text: data.advice || data.recommendation || "Даних замало...", 
        isLoading: false 
      });
    } catch (error) {
      setQuickTip({ text: "Не вдалося завантажити пораду.", isLoading: false });
    }
  };

  const fetchFullReport = async () => {
    setAiReport({ text: '', isLoading: true });
    try {
      const data = await emotionApi.getAiRecommendation();
      setAiReport({ text: data.recommendation, isLoading: false });
    } catch (error) {
      setAiReport({ text: "⚠️ Помилка отримання звіту.", isLoading: false });
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Видалити всю історію? Це дію неможливо скасувати.")) return;
    try {
      await emotionApi.clearHistory();
      setHistory([]); 
      setChartData([]); 
      setStats(null); 
      setCurrentLiveEmotion(null);
    } catch (error) { 
      console.error("Помилка очищення:", error); 
    }
  };

  const handleVoiceComplete = (data) => {
    setVoiceAnalysis({ 
      transcription: data.transcription, 
      advice: data.ai_recommendation, 
      isLoading: false 
    });
    setActiveTab('ai');
    setTimeout(fetchData, 1200);
  };

  useEffect(() => {
    fetchData(); 

    let intervalId;
    if (isStreaming) {
      intervalId = setInterval(() => {
        fetchData();
        fetchQuickTip(true); 
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isStreaming, fetchData]);

const emoKey = (currentLiveEmotion?.dominant_emotion || 'neutral').toLowerCase();
  const emoUI = EMOTION_CONFIG[emoKey] || { 
    label: 'Аналіз...', 
    emoji: NeutralIcon, 
    color: 'transparent' 
  };

  let displayPct = '';
  if (currentLiveEmotion) {
    if (currentLiveEmotion.confidence) {
      displayPct = `${Math.round(currentLiveEmotion.confidence * 100)}%`;
    } else if (currentLiveEmotion.emotions_map && currentLiveEmotion.emotions_map[emoKey]) {
      displayPct = `${Math.round(currentLiveEmotion.emotions_map[emoKey] * 100)}%`;
    }
  }

  return (
    <div className="app-layout">
      <Header isSystemActive={isStreaming || isRecording} />
      
      <div className={`dashboard-container ${activeTab !== 'history' ? "full-page" : ""}`}>
        <main className="main-content">
          
          <section className="left-panel" style={{ display: activeTab === 'history' ? 'flex' : 'none' }}>
            <div className="card video-card">
              <div className="video-wrapper">
                <VideoStream 
                  isStreaming={isStreaming} 
                  onStart={handleStartStream} 
                  onStop={handleStopStream} 
                />
                
                {isStreaming && currentLiveEmotion && (
                  <div className="emotion-overlay" style={{ borderLeftColor: emoUI.color }}>
                    <span className="emotion-emoji">
                       {typeof emoUI.emoji === 'function' ? <emoUI.emoji size={44} /> : emoUI.emoji}
                    </span>
<div className="emotion-info">
  <span className="emotion-name" style={{ color: emoUI.color }}>{emoUI.label}</span>
  <span className="emotion-pct">
    {displayPct}
  </span>
</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card voice-card">
              <VoiceStream 
                onAnalysisComplete={handleVoiceComplete} 
                setIsRecording={setIsRecording} 
              />
            </div>
          </section>

          <section className={`right-panel ${activeTab !== 'history' ? "full-width" : ""}`}>
            <div className="card tabs-card">
              <nav className="tabNavigation">
                <TabBtn id="history" active={activeTab} set={setActiveTab} Icon={HistoryIcon} label="Історія" />
                <TabBtn id="chart" active={activeTab} set={setActiveTab} Icon={DashboardIcon} label="Графік" />
                <TabBtn id="ai" active={activeTab} set={setActiveTab} Icon={AIIcon} label="ШІ Аналіз" />
              </nav>

              <div className="tabContent">
                {activeTab === 'history' && (
                  <Statistics 
                    history={history} 
                    isLoading={isLoading} 
                    onClear={handleClearHistory} 
                    onFetchHistory={fetchData} 
                    view="list" 
                  />
                )}
                {activeTab === 'chart' && (
  <Statistics 
    stats={stats} 
    history={chartData} 
    isLoading={isLoading} 
    onFetchHistory={handleDateChange} 
    selectedDate={selectedDate} 
    view="chart" 
  />
)}
                {activeTab === 'ai' && (
                  <Recommendation 
                    recommendation={voiceAnalysis.advice || aiReport.text} 
                    isLoading={aiReport.isLoading || voiceAnalysis.isLoading} 
                    onFetch={fetchFullReport} 
                  />
                )}
              </div>
            </div>

            {activeTab === 'history' && (
              <div className="advice-section">
                <Advice 
                  advice={
                    isStreaming && !quickTip.text 
                      ? "Аналізую ваш емоційний фон..." 
                      : (!isStreaming && !quickTip.text 
                          ? "Почніть сеанс для отримання порад" 
                          : quickTip.text)
                  } 
                  isLoading={quickTip.isLoading} 
                  onFetch={fetchQuickTip} 
                />
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

const TabBtn = ({ id, active, set, Icon, label }) => (
  <button 
    className={active === id ? 'activeTab' : 'tabBtn'} 
    onClick={() => set(id)}
  >
    <Icon size={18} /> {label}
  </button>
);

export default App;