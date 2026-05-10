import { 
  HappyIcon, SadIcon, AngryIcon, 
  NeutralIcon, SurpriseIcon, FearIcon, DisgustIcon 
} from '../components/icons/Emoji.jsx';

export const EMOTION_CONFIG = {
  'happy': { label: 'Щастя', emoji: HappyIcon, color: '#9ECE6A' },
  'sad': { label: 'Сум', emoji: SadIcon, color: '#7DCFFF' },
  'angry': { label: 'Гнів', emoji: AngryIcon, color: '#F7768E' },
  'neutral': { label: 'Спокій', emoji: NeutralIcon, color: '#BB9AF7' },
  'surprise': { label: 'Здивування', emoji: SurpriseIcon, color: '#E0AF68' },
  'fear': { label: 'Страх', emoji: FearIcon, color: '#9AA5CE' },
  'disgust': { label: 'Огида', emoji: DisgustIcon, color: '#CF649A' }
};