'use client';
import { useAuth } from '@/context/auth-context';
import { platform } from '@/lib/platform';
import { useStoredState } from '@/lib/use-stored-state';

import { api } from '@/lib/api';
import { Chapter, Story } from '@/types';
import React, { createContext, useContext, useEffect, useEffectEvent, useRef, useState } from 'react';

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export interface SleepTimerState {
  isActive: boolean;
  mode: 'duration' | 'end_of_chapter';
  remainingSeconds: number;
  label: string;
}

export interface LastPlayedSession {
  story: Story;
  chapter: Chapter;
  playlist?: Chapter[];
  currentTime: number;
  duration: number;
  savedAt: number;
}

interface AudioContextType {
  currentStory: Story | null;
  currentChapter: Chapter | null;
  playlist: Chapter[];
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  playChapter: (
    story: Story,
    chapter: Chapter,
    streamUrl?: string,
    playlist?: Chapter[],
    startTime?: number
  ) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  playNext: () => void;
  playPrev: () => void;
  sleepTimer: SleepTimerState | null;
  setSleepTimer: (option: number | 'end_of_chapter') => void;
  cancelSleepTimer: () => void;
  lastPlayedSession: LastPlayedSession | null;
  resumeLastPlayed: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({children}:{children:React.ReactNode}) {
 const {user}=useAuth();
 return <AudioSession key={user?.id||'guest'}>{children}</AudioSession>;
}
function AudioSession({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const accountId = user?.id || 'guest';
  const playRequest = useRef({id:0});
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [playlist, setPlaylist] = useState<Chapter[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useStoredState<number>('tienton_audio_speed', 1, (raw) => { const speed = Number(raw); return PLAYBACK_SPEEDS.includes(speed) ? speed : 1; });
  const [lastPlayedSession, setLastPlayedSession] = useStoredState<LastPlayedSession | null>(`tienton_last_played:${accountId}`, null);

  // Sleep Timer state
  const [sleepTimer, setSleepTimerState] = useState<SleepTimerState | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentChapterRef = useRef<Chapter | null>(null);
  const currentStoryRef = useRef<Story | null>(null);
  const playlistRef = useRef<Chapter[]>([]);
  const playbackSpeedRef = useRef<number>(1.0);
  const sleepTimerRef = useRef<SleepTimerState | null>(null);

  const getStreamUrl = (chapterId: string, speed: number) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${base}/chapters/${chapterId}/stream?speed=${speed}${tokenParam}`;
  };

  // Hàm lưu phiên nghe dở vào localStorage
  const saveSession = (
    story: Story,
    chapter: Chapter,
    time: number,
    dur: number,
    pList?: Chapter[]
  ) => {
    try {
      const session: LastPlayedSession = {
        story,
        chapter,
        playlist: pList || playlistRef.current,
        currentTime: Math.floor(time),
        duration: Math.floor(dur || chapter.duration_seconds || 0),
        savedAt: Date.now(),
      };
      setLastPlayedSession(session);
    } catch { }
  };

  const setSleepTimer = (option: number | 'end_of_chapter') => {
    if (option === 'end_of_chapter') {
      setSleepTimerState({
        isActive: true,
        mode: 'end_of_chapter',
        remainingSeconds: 0,
        label: 'Hết tập này',
      });
    } else {
      const secs = option * 60;
      setSleepTimerState({
        isActive: true,
        mode: 'duration',
        remainingSeconds: secs,
        label: `${option} phút`,
      });
    }
  };

  const cancelSleepTimer = () => {
    setSleepTimerState(null);
  };

  const setPlaybackSpeed = (speed: number) => {
    setPlaybackSpeedState(speed);
    playbackSpeedRef.current = speed;
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const playChapter = async (
    story: Story,
    chapter: Chapter,
    streamUrl?: string,
    chapterList?: Chapter[],
    startTime?: number
  ) => {
    const requestId = ++playRequest.current.id;
    const playbackAccount = localStorage.getItem('access_token');
    if (startTime === undefined && playbackAccount) {
      try {
        const saved = await platform<{position_seconds?:number;is_completed?:boolean}>(`/users/chapters/${chapter.id}/progress`);
        startTime = saved.is_completed ? 0 : saved.position_seconds || 0;
      } catch (error) { console.warn('Không tải được tiến độ nghe',error); }
    }
    if (requestId !== playRequest.current.id) return;
    setCurrentStory(story);
    setCurrentChapter(chapter);
    if (chapterList && chapterList.length > 0) {
      setPlaylist(chapterList);
      playlistRef.current = chapterList;
    }

    if (!audioRef.current) return;

    let targetUrl = streamUrl;
    if (!targetUrl) {
      try {
        const streamData = await api.getSignedStreamUrl(chapter.id, '320kbps', playbackSpeedRef.current);
        const resolved = streamData.stream_url;
        if (resolved) {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
          targetUrl = new URL(resolved, new URL(apiBase, window.location.origin)).toString();
        }
      } catch (err: unknown) {
        console.warn('Could not fetch signed stream url, falling back to direct redirect stream:', err);
      }
    }

    if (!targetUrl) {
      targetUrl = getStreamUrl(chapter.id, playbackSpeedRef.current);
    }

    if (requestId !== playRequest.current.id) return;
    audioRef.current.src = targetUrl;
    audioRef.current.playbackRate = playbackSpeedRef.current;

    const applyStartTime = () => {
      if (startTime && startTime > 0 && audioRef.current) {
        try {
          if (Math.abs(audioRef.current.currentTime - startTime) > 1) {
            audioRef.current.currentTime = startTime;
            setCurrentTime(startTime);
          }
        } catch (e) {
          console.warn('Could not seek to startTime:', e);
        }
      }
    };

    const handleLoadedData = () => {
      applyStartTime();
      audioRef.current?.removeEventListener('loadedmetadata', handleLoadedData);
      audioRef.current?.removeEventListener('canplay', handleLoadedData);
    };
    audioRef.current.addEventListener('loadedmetadata', handleLoadedData);
    audioRef.current.addEventListener('canplay', handleLoadedData);

    try {
      await audioRef.current.play();
      if (requestId !== playRequest.current.id) return;
      applyStartTime();
      setIsPlaying(true);
      saveSession(
        story,
        chapter,
        startTime || 0,
        audioRef.current?.duration || chapter.duration_seconds || 0,
        chapterList
      );
    } catch (e: unknown) {
      console.warn('Audio playback error:', e);
      setIsPlaying(false);
      if (e instanceof Error && e.name === 'NotSupportedError') {
        alert('Tập này chưa có file audio khả dụng hoặc định dạng không được trình duyệt hỗ trợ.');
      }
    }
  };

  const resumeLastPlayed = () => {
    if (!lastPlayedSession) return;
    playChapter(
      lastPlayedSession.story,
      lastPlayedSession.chapter,
      undefined,
      lastPlayedSession.playlist && lastPlayedSession.playlist.length > 0
        ? lastPlayedSession.playlist
        : [lastPlayedSession.chapter],
      lastPlayedSession.currentTime
    );
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
        const cur = audioRef.current.currentTime;
        const dur = audioRef.current.duration || currentChapter.duration_seconds || 0;
        api.saveListeningProgress(
          currentChapter.id,
          Math.floor(cur),
          false,
          playbackSpeed,
          currentStory?.id
        );
        if (currentStory) {
          saveSession(currentStory, currentChapter, cur, dur);
        }
      }
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((e: unknown) => {
          console.warn('Resume playback error:', e);
          setIsPlaying(false);
          if (e instanceof Error && e.name === 'NotSupportedError') {
            alert('Không thể phát audio: Tệp audio chưa sẵn sàng hoặc không được hỗ trợ.');
          }
        });
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

  const onAudioEnded = useEffectEvent(handleAutoPlayNext);
  const persistCurrentSession = useEffectEvent(saveSession);
  const onMediaSkip = useEffectEvent(skip);
  const onMediaPrevious = useEffectEvent(playPrev);
  const onMediaNext = useEffectEvent(playNext);
  const onMediaSeek = useEffectEvent(seek);

  useEffect(() => {
    currentChapterRef.current = currentChapter;
    currentStoryRef.current = currentStory;
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
    playlistRef.current = playlist;
    playbackSpeedRef.current = playbackSpeed;
    sleepTimerRef.current = sleepTimer;
  }, [currentChapter, currentStory, playlist, playbackSpeed, sleepTimer]);

  useEffect(() => {
    const requests = playRequest.current;
    const audio = new Audio();
    audioRef.current = audio;

    audio.onerror = () => {
      console.warn('Audio element error code:', audio.error?.code, audio.error?.message);
      setIsPlaying(false);
    };

    audio.playbackRate = playbackSpeedRef.current;

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
          playbackSpeedRef.current,
          currentStoryRef.current?.id
        );
      }

      // Kiểm tra Sleep Timer nếu chọn "Dừng khi hết tập"
      if (sleepTimerRef.current?.mode === 'end_of_chapter') {
        setSleepTimerState(null);
        return;
      }

      // Tự động chuyển phát tập tiếp theo trong danh sách nếu có
      onAudioEnded();
    };

    return () => {
      ++requests.id;
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    const flush = () => {
      const chapter = currentChapterRef.current; const audio = audioRef.current;
      const token=localStorage.getItem('access_token');
      if(!token || !chapter || !audio || !Number.isFinite(audio.currentTime) || audio.currentTime<=0)return;
      const base=process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
      void fetch(`${base}/chapters/progress`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({chapter_id:chapter.id,story_id:currentStoryRef.current?.id,last_position_seconds:Math.floor(audio.currentTime),is_completed:audio.ended,playback_speed:playbackSpeedRef.current})}).catch(()=>{});
    };
    const hidden=()=>{if(document.visibilityState==='hidden')flush();};
    window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
    return ()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);};
  },[]);

  // Sleep Timer Countdown Ticker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sleepTimer?.isActive && sleepTimer?.mode === 'duration') {
      timer = setInterval(() => {
        setSleepTimerState((prev) => {
          if (!prev) return null;
          if (prev.remainingSeconds <= 1) {
            // Hết giờ hẹn: Tắt nhạc
            if (audioRef.current) {
              audioRef.current.pause();
            }
            setIsPlaying(false);
            return null;
          }
          return {
            ...prev,
            remainingSeconds: prev.remainingSeconds - 1,
          };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sleepTimer?.isActive, sleepTimer?.mode]);

  // Tự động lưu tiến trình nghe mỗi 15 giây lên server & localStorage
  useEffect(() => {
    if (!isPlaying || !currentChapter || !currentStory) return;

    const interval = setInterval(() => {
      if (audioRef.current && audioRef.current.currentTime > 0) {
        const cur = audioRef.current.currentTime;
        const dur = audioRef.current.duration || currentChapter.duration_seconds || 0;
        api.saveListeningProgress(
          currentChapter.id,
          Math.floor(cur),
          false,
          playbackSpeed,
          currentStory.id
        );
        persistCurrentSession(currentStory, currentChapter, cur, dur);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isPlaying, currentChapter, currentStory, playbackSpeed]);

  // Tích hợp Navigator MediaSession API (Điều khiển từ màn hình khóa / tai nghe Bluetooth / Apple Watch)
  useEffect(() => {
    if ('mediaSession' in navigator && currentChapter && currentStory) {
      const cover = currentStory.cover_image_url || '';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentChapter.title,
        artist: currentStory.author_name || 'Tiên Tôn Audio',
        album: `${currentStory.title} • Chuẩn Studio 320kbps`,
        artwork: cover
          ? [
            { src: cover, sizes: '96x96', type: 'image/jpeg' },
            { src: cover, sizes: '128x128', type: 'image/jpeg' },
            { src: cover, sizes: '192x192', type: 'image/jpeg' },
            { src: cover, sizes: '256x256', type: 'image/jpeg' },
            { src: cover, sizes: '384x384', type: 'image/jpeg' },
            { src: cover, sizes: '512x512', type: 'image/jpeg' },
          ]
          : [],
      });

      if ('playbackState' in navigator.mediaSession) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current
          ?.play()
          .then(() => setIsPlaying(true))
          .catch((e) => {
            console.warn('MediaSession play error:', e);
            setIsPlaying(false);
          });
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        onMediaSkip(-skipTime);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        onMediaSkip(skipTime);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => onMediaPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => onMediaNext());
      navigator.mediaSession.setActionHandler('stop', () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      });

      if ('setActionHandler' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && details.seekTime !== null) {
              onMediaSeek(details.seekTime);
            }
          });
        } catch {
          // seekto optional fallback
        }
      }
    }
  }, [currentChapter, currentStory, isPlaying]);

  // Cập nhật vị trí MediaSession positionState thời gian thực
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: playbackSpeed,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      } catch { }
    }
  }, [currentTime, duration, playbackSpeed]);

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
        sleepTimer,
        setSleepTimer,
        cancelSleepTimer,
        lastPlayedSession,
        resumeLastPlayed,
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
