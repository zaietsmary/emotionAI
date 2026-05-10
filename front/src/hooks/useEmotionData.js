import { useState, useCallback } from 'react';
import { emotionApi } from '../services/api';

export const useEmotionData = (isStreaming, sessionStartTime) => {
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLiveEmotion, setCurrentLiveEmotion] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

const fetchData = useCallback(async (dateOverride = null) => {
    const dateToFetch = dateOverride || selectedDate;
    
    try {
      const [totalHistory, dailyData, statsData] = await Promise.all([

        emotionApi.getCombinedHistory(20).catch(() => null),
        emotionApi.getHistoryByDate(dateToFetch).catch(() => null),
        emotionApi.getStats().catch(() => null)
      ]);

      if (Array.isArray(totalHistory)) {
        setHistory(totalHistory);
        if (isStreaming && totalHistory.length > 0) {
          const latest = [...totalHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
          const latestTime = new Date(latest.timestamp).getTime();
          setCurrentLiveEmotion(sessionStartTime && latestTime > sessionStartTime ? latest : null);
        }
      }

      if (Array.isArray(dailyData)) {
        setChartData(dailyData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      }

      if (statsData) setStats(statsData);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isStreaming, sessionStartTime, selectedDate]);

  return { 
    history, chartData, stats, isLoading, currentLiveEmotion, 
    selectedDate, setSelectedDate,
    fetchData, setHistory, setChartData, setStats, setCurrentLiveEmotion 
  };
};