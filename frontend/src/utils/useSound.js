import { useState, useCallback } from 'react';

const SOUNDS = {
  login: '/sounds/login.wav',
  logout: '/sounds/logout.mp3',
  success: '/sounds/success.mp3',
};

const soundInstances = {
  login: null,
  logout: null,
  success: null,
};

let audioInitialized = false;
let howlModulePromise;

function loadHowler() {
  if (!howlModulePromise) {
    howlModulePromise = import('howler');
  }
  return howlModulePromise;
}

const initializeAudio = async () => {
  if (audioInitialized) return;

  const { Howl } = await loadHowler();

  soundInstances.login = new Howl({
    src: [SOUNDS.login],
    volume: 0.3,
  });

  soundInstances.logout = new Howl({
    src: [SOUNDS.logout],
    volume: 0.3,
  });

  soundInstances.success = new Howl({
    src: [SOUNDS.success],
    volume: 0.3,
  });

  audioInitialized = true;
};

export const useSound = () => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('uiSoundsMuted');
    return saved === 'true';
  });

  const initAudio = useCallback(() => {
    initializeAudio().catch(() => {});
  }, []);

  const playSound = useCallback((soundName) => {
    if (isMuted) return;

    initializeAudio()
      .then(() => {
        const sound = soundInstances[soundName];
        if (sound) {
          sound.once('playerror', (id, error) => {
            console.warn(`Sound playback failed for ${soundName}:`, error);
          });
          sound.play();
        }
      })
      .catch(() => {});
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem('uiSoundsMuted', newMutedState);

    Object.values(soundInstances).forEach((sound) => {
      if (sound) {
        sound.volume(newMutedState ? 0 : 0.3);
      }
    });
  }, [isMuted]);

  const playLogin = useCallback(() => playSound('login'), [playSound]);
  const playLogout = useCallback(() => playSound('logout'), [playSound]);
  const playSuccess = useCallback(() => playSound('success'), [playSound]);

  return {
    isMuted,
    toggleMute,
    playLogin,
    playLogout,
    playSuccess,
    playSound,
  };
};
