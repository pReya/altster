import { useCallback, useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import * as player from "@/lib/spotify/player";

export function useSpotifyPlayer() {
  const {
    currentTrack,
    isPlaying,
    playbackType,
    progress,
    volume,
    error,
    isLoading,
    setCurrentTrack,
    setIsPlaying,
    setPlaybackType,
    setProgress,
    setVolume,
    setError,
    setIsLoading,
    clearError,
    reset,
  } = usePlayerStore();

  const { accessToken } = useAuthStore();

  // Play a track by ID
  const play = useCallback(
    async (trackId: string) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await player.playTrack(trackId, accessToken);

        setCurrentTrack(result.track);
        setPlaybackType(result.type);
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to play track");
        setIsLoading(false);
      }
    },
    [
      accessToken,
      volume,
      setCurrentTrack,
      setPlaybackType,
      setIsPlaying,
      setError,
      setIsLoading,
      clearError,
    ],
  );

  // Pause playback
  const pause = useCallback(async () => {
    try {
      await player.pause();
      setIsPlaying(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause playback");
    }
  }, [setIsPlaying, setError]);

  // Resume playback
  const resume = useCallback(async () => {
    try {
      await player.resume();
      setIsPlaying(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to resume playback",
      );
    }
  }, [setIsPlaying, setError]);

  // Stop playback
  const stop = useCallback(() => {
    player.stopPlayback();
    reset();
  }, [reset]);

  // Change volume
  const changeVolume = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      player.setPreviewVolume(newVolume);
    },
    [setVolume],
  );

  // Update progress for preview playback
  useEffect(() => {
    if (playbackType === "preview" && isPlaying) {
      const unsubscribe = player.onPreviewProgress((current) => {
        setProgress(current);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [playbackType, isPlaying, setProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      player.disconnectPlayer();
    };
  }, []);

  return {
    currentTrack,
    isPlaying,
    playbackType,
    progress,
    volume,
    error,
    isLoading,
    play,
    pause,
    resume,
    stop,
    changeVolume,
    clearError,
  };
}
