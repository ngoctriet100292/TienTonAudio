'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Story, Chapter } from '@/types';
import { api } from '@/lib/api';

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

interface AudioContextType {
  currentStory: Story | null;
  currentChapter: Chapter | null;
  playlist: Chapter[];
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  playChapter: (story: Story, chapter: Chapter, streamUrl?: string, playlist?: Chapter[]) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  playNext: () => void;
  playPrev: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [playlist, setPlaylist] = useState<Chapter[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentChapterRef = useRef<Chapter | null>(null);
  const currentStoryRef = useRef<Story | null>(null);
  const playlistRef = useRef<Chapter[]>([]);
  const playbackSpeedRef = useRef<number>(1.0);

  currentChapterRef.current = currentChapter;
  currentStoryRef.current = currentStory;
  playlistRef.current = playlist;
  playbackSpeedRef.current = playbackSpeed;

  const getStreamUrl = (chapterId: string, speed: number) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    return `${base}/chapters/${chapterId}/stream?speed=${speed}`;
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Đọc tốc độ phát đã lưu trước đó nếu có
    const savedSpeed = localStorage.getItem('tienton_audio_speed');
    if (savedSpeed) {
      const parsed = parseFloat(savedSpeed);
      if (!isNaN(parsed) && PLAYBACK_SPEEDS.includes(parsed)) {
        setPlaybackSpeedState(parsed);
        playbackSpeedRef.current = parsed;
        audio.playbackRate = parsed;
      }
    }

    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeedRef.current;
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      // Ghi nhận hoàn thành nghe chương
      if (currentChapterRef.current) {
        api.saveListeningProgress(
          currentChapterRef.current.id,
          Math.floor(audio.duration || 0),
          true,
          playbackSpeedRef.current
        );
      }
      // Tự động chuyển phát tập tiếp theo trong danh sách nếu có
      handleAutoPlayNext();
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const setPlaybackSpeed = (speed: number) => {
    setPlaybackSpeedState(speed);
    playbackSpeedRef.current = speed;
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    localStorage.setItem('tienton_audio_speed', speed.toString());
  };

  // Đồng bộ tiến độ nghe định kỳ mỗi 20 giây để lưu tu vi và vị trí
  useEffect(() => {
    if (!isPlaying || !currentChapter) return;

    const interval = setInterval(() => {
      if (audioRef.current && audioRef.current.currentTime > 5) {
        api.saveListeningProgress(
          currentChapter.id,
          Math.floor(audioRef.current.currentTime),
          false,
          playbackSpeed
        );
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [isPlaying, currentChapter, playbackSpeed]);

  // Tích hợp Navigator MediaSession API (Điều khiển từ màn hình khóa / tai nghe / Touch Bar)
  useEffect(() => {
    if ('mediaSession' in navigator && currentChapter && currentStory) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentChapter.title,
        artist: currentStory.author_name || 'Tiên Tôn Audio',
        album: currentStory.title,
        artwork: currentStory.cover_image_url
          ? [{ src: currentStory.cover_image_url, sizes: '512x512', type: 'image/jpeg' }]
          : [],
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
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }
  }, [currentChapter, currentStory]);

  const playChapter = (
    story: Story,
    chapter: Chapter,
    streamUrl?: string,
    chapterList?: Chapter[]
  ) => {
    setCurrentStory(story);
    setCurrentChapter(chapter);
    if (chapterList && chapterList.length > 0) {
      setPlaylist(chapterList);
      playlistRef.current = chapterList;
    }

    if (audioRef.current) {
      const url = streamUrl || getStreamUrl(chapter.id, playbackSpeedRef.current);
      audioRef.current.src = url;
      audioRef.current.playbackRate = playbackSpeedRef.current;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((e) => {
          console.warn('Audio playback error:', e);
        });
    }
  };

  const handleAutoPlayNext = () => {
    const list = playlistRef.current;
    const curr = currentChapterRef.current;
    const story = currentStoryRef.current;
    if (!list || list.length === 0 || !curr || !story) return;

    const currentIndex = list.findIndex((c) => c.id === curr.id);
    if (currentIndex !== -1 && currentIndex < list.length - 1) {
      const nextChapter = list[currentIndex + 1];
      playChapter(story, nextChapter, undefined, list);
    }
  };

  const playNext = () => {
    handleAutoPlayNext();
  };

  const playPrev = () => {
    const list = playlistRef.current;
    const curr = currentChapterRef.current;
    const story = currentStoryRef.current;
    if (!list || list.length === 0 || !curr || !story) return;

    const currentIndex = list.findIndex((c) => c.id === curr.id);
    if (currentIndex > 0) {
      const prevChapter = list[currentIndex - 1];
      playChapter(story, prevChapter, undefined, list);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentChapter) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      // Lưu vị trí khi pause
      if (audioRef.current.currentTime > 0) {
        api.saveListeningProgress(
          currentChapter.id,
          Math.floor(audioRef.current.currentTime),
          false,
          playbackSpeed
        );
      }
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
      const newTime = Math.max(
        0,
        Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds)
      );
      seek(newTime);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentStory,
        currentChapter,
        playlist,
        isPlaying,
        duration,
        currentTime,
        playbackSpeed,
        setPlaybackSpeed,
        playChapter,
        togglePlay,
        seek,
        skip,
        playNext,
        playPrev,
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
