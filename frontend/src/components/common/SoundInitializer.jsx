import { useEffect } from 'react';
import { useSound } from '../../utils/useSound';
import { initToastSound } from '../../utils/toast';

const SoundInitializer = () => {
  const { playSuccess } = useSound();

  useEffect(() => {
    // Initialize toast sound with playSuccess function
    initToastSound(playSuccess);
  }, [playSuccess]);

  return null;
};

export default SoundInitializer;
