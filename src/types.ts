export type Screen = 'auth' | 'home' | 'ai-space' | 'connect' | 'game' | 'mindful-care' | 'vitals-check' | 'stats' | 'stress-index' | 'puff-zen';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  isSponsored?: boolean;
}
