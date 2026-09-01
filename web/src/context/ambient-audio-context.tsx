'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export type AmbientSoundType = 'rain' | 'wind' | 'fire' | 'stream' | 'bell' | 'night';

export interface AmbientSoundConfig {
  id: AmbientSoundType;
  name: string;
  subName: string;
  icon: string;
  desc: string;
  color: string;
}

export const AMBIENT_SOUNDS: AmbientSoundConfig[] = [
  {
    id: 'rain',
    name: 'Mưa Rơi Mái Đình',
    subName: 'Thính Vũ Lâu',
    icon: '🌧️',
    desc: 'Tiếng mưa rơi tí tách trên mái ngói cổ tự, gột rửa tâm trần, tĩnh tâm an thần.',
    color: 'from-blue-600/20 to-cyan-500/20 border-cyan-500/40 text-cyan-300',
  },
  {
    id: 'wind',
    name: 'Gió Thổi Rừng Trúc',
    subName: 'Trúc Lâm Phong',
    icon: '🍃',
    desc: 'Gió thu xào xạc luồn qua rặng trúc xanh, cảm giác phiêu diêu thoát tục giữa đại ngàn.',
    color: 'from-emerald-600/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
  },
  {
    id: 'fire',
    name: 'Lửa Trại Hang Động',
    subName: 'Động Phủ Ôn Hỏa',
    icon: '🔥',
    desc: 'Than hồng nổ lách tách ấm áp trong đêm trường tu đạo, xua tan hàn khí buốt giá.',
    color: 'from-amber-600/20 to-orange-500/20 border-orange-500/40 text-orange-300',
  },
  {
    id: 'stream',
    name: 'Suối Reo Sơn Cốc',
    subName: 'Linh Tuyền Lạc',
    icon: '🌊',
    desc: 'Dòng suối nguồn róc rách len qua vách đá linh sơn, thanh khiết và tươi mới.',
    color: 'from-sky-600/20 to-blue-500/20 border-sky-500/40 text-sky-300',
  },
  {
    id: 'bell',
    name: 'Chuông Gió Linh Sơn',
    subName: 'Thiền Tự Chung',
    icon: '🔔',
    desc: 'Tiếng chuông thiền ngân vang theo từng cơn gió thoảng, định tâm nhập định.',
    color: 'from-purple-600/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
  },
  {
    id: 'night',
    name: 'Đêm Hè Tĩnh Lặng',
    subName: 'Tịch Mịch Dạ',
    icon: '🦗',
    desc: 'Tiếng dế đêm và côn trùng hòa ca dưới trời sao tĩnh mịch, dễ dàng chìm vào giấc ngủ.',
    color: 'from-indigo-600/20 to-slate-500/20 border-indigo-500/40 text-indigo-300',
  },
];

interface AmbientAudioContextType {
  activeSound: AmbientSoundType | null;
  isPlaying: boolean;
  volume: number;
  setVolume: (v: number) => void;
  toggleSound: (type: AmbientSoundType) => void;
  stopSound: () => void;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

const AmbientAudioContext = createContext<AmbientAudioContextType | undefined>(undefined);

export function AmbientAudioProvider({ children }: { children: React.ReactNode }) {
  const [activeSound, setActiveSound] = useState<AmbientSoundType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.25); // Mặc định 25% vừa phải dưới tiếng MC
  const [modalOpen, setModalOpen] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<{ stop: () => void } | null>(null);

  // Khởi tạo và khôi phục cấu hình từ localStorage
  useEffect(() => {
    try {
      const savedVol = localStorage.getItem('tienton_ambient_vol');
      if (savedVol) {
        setVolumeState(parseFloat(savedVol));
      }
    } catch {
      // Ignored
    }
  }, []);

  const setVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem('tienton_ambient_vol', clamped.toString());
    } catch {}

    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        clamped,
        audioCtxRef.current.currentTime,
        0.05
      );
    }
  };

  // Khởi tạo Web Audio Context
  const getOrCreateAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    return { ctx: audioCtxRef.current, masterGain: masterGainRef.current! };
  };

  // Tạo buffer nhiễu trắng (White Noise Buffer)
  const createNoiseBuffer = (ctx: AudioContext, seconds = 5) => {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  // 1. Máy tạo âm thanh Mưa Rơi (Rain Synthesizer)
  const startRain = (ctx: AudioContext, destination: GainNode) => {
    const noiseBuffer = createNoiseBuffer(ctx, 4);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Lọc dải tần mưa
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1000;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 850;
    bandpass.Q.value = 0.6;

    noiseSource.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(destination);
    noiseSource.start();

    // Giọt mưa rải rác
    const interval = setInterval(() => {
      if (ctx.state !== 'running') return;
      try {
        const drop = ctx.createOscillator();
        const dropGain = ctx.createGain();
        drop.frequency.setValueAtTime(1400 + Math.random() * 800, ctx.currentTime);
        drop.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

        dropGain.gain.setValueAtTime(0.04 * Math.random(), ctx.currentTime);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

        drop.connect(dropGain);
        dropGain.connect(destination);
        drop.start();
        drop.stop(ctx.currentTime + 0.06);
      } catch {}
    }, 80);

    return {
      stop: () => {
        clearInterval(interval);
        try {
          noiseSource.stop();
          noiseSource.disconnect();
        } catch {}
      },
    };
  };

  // 2. Máy tạo âm thanh Gió Rừng Trúc (Wind Synthesizer)
  const startWind = (ctx: AudioContext, destination: GainNode) => {
    const noiseBuffer = createNoiseBuffer(ctx, 4);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 3.5;

    // LFO tạo hiệu ứng gió thổi từng cơn
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.18; // 0.18 Hz thổi chậm
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 250; // Biên độ dao động tần số

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSource.connect(filter);
    filter.connect(destination);

    noiseSource.start();
    lfo.start();

    return {
      stop: () => {
        try {
          noiseSource.stop();
          lfo.stop();
          noiseSource.disconnect();
          lfo.disconnect();
        } catch {}
      },
    };
  };

  // 3. Máy tạo âm thanh Lửa Trại (Campfire Synthesizer)
  const startFire = (ctx: AudioContext, destination: GainNode) => {
    // Tiếng rền nền ấm
    const noiseBuffer = createNoiseBuffer(ctx, 3);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 160;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.5;

    noiseSource.connect(lowpass);
    lowpass.connect(rumbleGain);
    rumbleGain.connect(destination);
    noiseSource.start();

    // Tiếng than củi nổ lách tách
    const interval = setInterval(() => {
      if (ctx.state !== 'running') return;
      try {
        const pop = ctx.createBufferSource();
        pop.buffer = createNoiseBuffer(ctx, 0.02);
        const popFilter = ctx.createBiquadFilter();
        popFilter.type = 'highpass';
        popFilter.frequency.value = 1800;

        const popGain = ctx.createGain();
        popGain.gain.setValueAtTime(0.08 * (0.5 + Math.random()), ctx.currentTime);
        popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

        pop.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(destination);

        pop.start();
        pop.stop(ctx.currentTime + 0.02);
      } catch {}
    }, 120 + Math.random() * 200);

    return {
      stop: () => {
        clearInterval(interval);
        try {
          noiseSource.stop();
          noiseSource.disconnect();
        } catch {}
      },
    };
  };

  // 4. Máy tạo âm thanh Suối Reo Sơn Cốc (Mountain Stream Synthesizer)
  const startStream = (ctx: AudioContext, destination: GainNode) => {
    const noiseBuffer = createNoiseBuffer(ctx, 4);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = 650;
    bp1.Q.value = 1.2;

    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.value = 1500;
    bp2.Q.value = 1.0;

    const streamGain = ctx.createGain();
    streamGain.gain.value = 0.45;

    noiseSource.connect(bp1);
    noiseSource.connect(bp2);
    bp1.connect(streamGain);
    bp2.connect(streamGain);
    streamGain.connect(destination);

    noiseSource.start();

    return {
      stop: () => {
        try {
          noiseSource.stop();
          noiseSource.disconnect();
        } catch {}
      },
    };
  };

  // 5. Máy tạo âm thanh Chuông Gió Linh Sơn (Zen Chimes / Bell Synthesizer)
  const startBell = (ctx: AudioContext, destination: GainNode) => {
    // Hòa âm ngũ cung Tiên đạo (A major pentatonic)
    const pitches = [528, 660, 792, 880, 1056, 1320];

    const interval = setInterval(() => {
      if (ctx.state !== 'running') return;
      try {
        const pitch = pitches[Math.floor(Math.random() * pitches.length)];
        const osc = ctx.createOscillator();
        const chimeGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);

        chimeGain.gain.setValueAtTime(0.08, ctx.currentTime);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2);

        osc.connect(chimeGain);
        chimeGain.connect(destination);

        osc.start();
        osc.stop(ctx.currentTime + 3.3);
      } catch {}
    }, 2800);

    return {
      stop: () => {
        clearInterval(interval);
      },
    };
  };

  // 6. Máy tạo âm thanh Đêm Hè (Night Crickets Synthesizer)
  const startNight = (ctx: AudioContext, destination: GainNode) => {
    const interval = setInterval(() => {
      if (ctx.state !== 'running') return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(4500 + Math.random() * 400, ctx.currentTime);

        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } catch {}
    }, 250);

    return {
      stop: () => {
        clearInterval(interval);
      },
    };
  };

  // Bật/Tắt âm thanh
  const toggleSound = (type: AmbientSoundType) => {
    if (activeSound === type && isPlaying) {
      stopSound();
      return;
    }

    stopSound();

    const { ctx, masterGain } = getOrCreateAudioContext();

    let handler: { stop: () => void } | null = null;
    switch (type) {
      case 'rain':
        handler = startRain(ctx, masterGain);
        break;
      case 'wind':
        handler = startWind(ctx, masterGain);
        break;
      case 'fire':
        handler = startFire(ctx, masterGain);
        break;
      case 'stream':
        handler = startStream(ctx, masterGain);
        break;
      case 'bell':
        handler = startBell(ctx, masterGain);
        break;
      case 'night':
        handler = startNight(ctx, masterGain);
        break;
    }

    activeNodesRef.current = handler;
    setActiveSound(type);
    setIsPlaying(true);
  };

  const stopSound = () => {
    if (activeNodesRef.current) {
      activeNodesRef.current.stop();
      activeNodesRef.current = null;
    }
    setActiveSound(null);
    setIsPlaying(false);
  };

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (activeNodesRef.current) {
        activeNodesRef.current.stop();
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <AmbientAudioContext.Provider
      value={{
        activeSound,
        isPlaying,
        volume,
        setVolume,
        toggleSound,
        stopSound,
        modalOpen,
        setModalOpen,
      }}
    >
      {children}
    </AmbientAudioContext.Provider>
  );
}

export function useAmbient() {
  const context = useContext(AmbientAudioContext);
  if (!context) {
    throw new Error('useAmbient must be used within an AmbientAudioProvider');
  }
  return context;
}
