import { useState, useEffect, useCallback } from 'react';
import { Howl } from 'howler';

// Sound configuration
const SOUNDS = {
  login: '/sounds/login.wav',
  logout: '/sounds/logout.mp3',
  success: '/sounds/success.mp3',
};

// Create Howl instances
const soundInstances = {
  login: null,
  logout: null,
  success: null,
};

// Initialize sounds on first user interaction
let audioInitialized = false;

const initializeAudio = () => {
  if (audioInitialized) return;
  
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
    // Load mute state from localStorage
    const saved = localStorage.getItem('uiSoundsMuted');
    return saved === 'true';
  });

  // Initialize audio on first user interaction
  const initAudio = useCallback(() => {
    initializeAudio();
  }, []);

  // Play a specific sound
  const playSound = useCallback((soundName) => {
    if (isMuted) return;

    try {
      initAudio();

      const sound = soundInstances[soundName];
      if (sound) {
        // Howl's play() doesn't return a promise in older versions
        // Use on('error') handler instead
        sound.once('playerror', (id, error) => {
          console.warn(`Sound playback failed for ${soundName}:`, error);
        });
        sound.play();
      }
    } catch (error) {
      console.warn(`Sound initialization failed for ${soundName}:`, error);
    }
  }, [isMuted, initAudio]);

  // Toggle mute state
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem('uiSoundsMuted', newMutedState);
    
    // Update volume for all sounds
    Object.values(soundInstances).forEach(sound => {
      if (sound) {
        sound.volume(newMutedState ? 0 : 0.3);
      }
    });
  }, [isMuted]);

  // Convenience methods
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
