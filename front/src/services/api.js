const API_BASE_URL = "http://127.0.0.1:8000";
const NLP_BASE_URL = 'http://localhost:8000/nlp';
const VISION_BASE_URL = 'http://localhost:8000/vision';
const VOICE_BASE_URL = 'http://localhost:8000/voice';

export const STREAM_URL = `${VISION_BASE_URL}/video_feed`;

export const emotionApi = {
  getHistory: async (limit = 20) => {
    try {
      const response = await fetch(`${VISION_BASE_URL}/history?limit=${limit}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.warn("Оновлення історії..."); 
      return [];
    }
  },
  
  getStats: async () => {
    try {
      const response = await fetch(`${VISION_BASE_URL}/stats`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn("Оновлення статистики...");
      return null;
    }
  },

  getAiRecommendation: async () => {
    const response = await fetch(`${VISION_BASE_URL}/ai-recommendation`);
    if (!response.ok) throw new Error('Помилка отримання поради');
    return await response.json();
  },

  clearHistory: async () => {
    const response = await fetch(`${VISION_BASE_URL}/history/clear/all`, { method: 'DELETE' });
    return await response.json();
  },

  getAdvice: async () => {
    const response = await fetch(`${VISION_BASE_URL}/ai-advice`, {method: 'GET'});
    return await response.json();
  },

  sendVoiceAnalysis: async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice_record.webm");

    try {
      const response = await fetch(`${VOICE_BASE_URL}/analyze-voice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Помилка аналізу голосу');
      }

      return await response.json(); 
    } catch (error) {
      console.error("Помилка при відправці голосу:", error);
      throw error;
    }
  },

getCombinedHistory: async (limit = 20) => { 
try {
      const response = await fetch(`${VISION_BASE_URL}/combined-history?limit=${limit}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error(`Помилка сервера: ${response.status}`);
        throw new Error('Серверна помилка');
      }

      return await response.json();
    } catch (error) {
      console.error("Помилка отримання мультимодальної історії:", error);
      return []; 
    }
},
  getHistoryByDate: async (date) => {
  const response = await fetch(`${VISION_BASE_URL}/history/date/${date}`);
  if (!response.ok) return [];
  return await response.json();
},
};