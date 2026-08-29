'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Story, Chapter } from '@/types';

interface AudioContextType {
  currentStory: Story | null;
  currentChapter: Chapter | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  playChapter: (story: Story, chapter: Chapter, streamUrl?: string) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.onended = () => setIsPlaying(false);

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Tích hợp Navigator MediaSession API (Điều khiển từ màn hình khóa / tai nghe / Touch Bar)
  useEffect(() => {
    if ('mediaSession' in navigator && currentChapter && currentStory) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentChapter.title,
        artist: currentStory.author_name || 'Tiên Tôn Audio',
        album: currentStory.title,
        artwork: currentStory.cover_image_url ? [
          { src: currentStory.cover_image_url, sizes: '512x512', type: 'image/jpeg' }
        ] : [],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => skip(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => skip(10));
    }
  }, [currentChapter, currentStory]);

  const playChapter = (story: Story, chapter: Chapter, streamUrl?: string) => {
    setCurrentStory(story);
    setCurrentChapter(chapter);

    if (audioRef.current) {
      const url = streamUrl || `http://localhost:8080/api/v1/chapters/${chapter.id}/stream`;
      audioRef.current.src = url;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Audio playback error (waiting for user gesture or stream url):', e);
      });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentChapter) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
      seek(newTime);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentStory,
        currentChapter,
        isPlaying,
        duration,
        currentTime,
        playChapter,
        togglePlay,
        seek,
        skip,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within an AudioProvider');
  return ctx;
}
