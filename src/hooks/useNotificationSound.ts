import { useCallback, useRef } from "react";

type SoundType = "success" | "error" | "info";

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = "sine") => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // Fade in and out for smoother sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn("Audio playback failed:", error);
    }
  }, [getAudioContext]);

  const playSuccess = useCallback(() => {
    // Pleasant ascending chime for success
    playTone(523.25, 0.15); // C5
    setTimeout(() => playTone(659.25, 0.15), 100); // E5
    setTimeout(() => playTone(783.99, 0.25), 200); // G5
  }, [playTone]);

  const playError = useCallback(() => {
    // Descending tones for error
    playTone(440, 0.2, "square"); // A4
    setTimeout(() => playTone(349.23, 0.3, "square"), 150); // F4
  }, [playTone]);

  const playInfo = useCallback(() => {
    // Simple notification ping
    playTone(880, 0.1); // A5
    setTimeout(() => playTone(880, 0.15), 120); // A5
  }, [playTone]);

  const play = useCallback((type: SoundType) => {
    switch (type) {
      case "success":
        playSuccess();
        break;
      case "error":
        playError();
        break;
      case "info":
        playInfo();
        break;
    }
  }, [playSuccess, playError, playInfo]);

  return { play, playSuccess, playError, playInfo };
}
