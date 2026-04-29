"use client";

import { useEffect, useRef, useState } from "react";

export type Track = {
  id: string;
  name: string;
  url: string;
};

export function useMusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !tracks.length) return;

    const currentTrack = tracks[currentIndex];
    if (!currentTrack) return;

    audio.src = currentTrack.url;

    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentIndex, tracks, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handleEnded() {
      const activeAudio = audioRef.current;
      if (!activeAudio) return;

      if (loop) {
        activeAudio.currentTime = 0;
        void activeAudio.play();
        return;
      }

      if (!tracks.length) {
        setIsPlaying(false);
        return;
      }

      if (shuffle) {
        const randomIndex = Math.floor(Math.random() * tracks.length);
        setCurrentIndex(randomIndex);
        return;
      }

      setCurrentIndex((previousIndex) => {
        if (previousIndex >= tracks.length - 1) {
          setIsPlaying(false);
          return previousIndex;
        }

        return previousIndex + 1;
      });
    }

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [tracks, shuffle, loop]);

  function playPause() {
    const audio = audioRef.current;
    if (!audio || !tracks.length) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);
      });
  }

  function loadTrack(index: number) {
    if (!tracks[index]) return;

    setCurrentIndex(index);
    setIsPlaying(true);
  }

  function next() {
    if (!tracks.length) return;

    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentIndex(randomIndex);
      setIsPlaying(true);
      return;
    }

    setCurrentIndex((previousIndex) => (previousIndex + 1) % tracks.length);
    setIsPlaying(true);
  }

  function prev() {
    if (!tracks.length) return;

    setCurrentIndex(
      (previousIndex) => (previousIndex - 1 + tracks.length) % tracks.length
    );
    setIsPlaying(true);
  }

  function addTrack(file: File) {
    const track: Track = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.mp3$/i, ""),
      url: URL.createObjectURL(file),
    };

    setTracks((previousTracks) => [...previousTracks, track]);
  }

  function removeTrack(id: string) {
    setTracks((previousTracks) => {
      const indexToRemove = previousTracks.findIndex((track) => track.id === id);

      if (indexToRemove === -1) return previousTracks;

      const nextTracks = previousTracks.filter((track) => track.id !== id);

      if (!nextTracks.length) {
        const audio = audioRef.current;

        audio?.pause();

        if (audio) {
          audio.src = "";
        }

        setCurrentIndex(0);
        setIsPlaying(false);

        return nextTracks;
      }

      if (indexToRemove === currentIndex) {
        audioRef.current?.pause();
        setIsPlaying(false);

        const safeNextIndex =
          currentIndex >= nextTracks.length
            ? nextTracks.length - 1
            : currentIndex;

        setCurrentIndex(Math.max(0, safeNextIndex));
      } else if (indexToRemove < currentIndex) {
        setCurrentIndex((previousIndex) => Math.max(0, previousIndex - 1));
      }

      return nextTracks;
    });
  }

  return {
    tracks,
    currentIndex,
    isPlaying,
    shuffle,
    loop,
    setShuffle,
    setLoop,
    playPause,
    loadTrack,
    next,
    prev,
    addTrack,
    removeTrack,
  };
}