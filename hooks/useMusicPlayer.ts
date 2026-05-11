"use client";

import { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { loadMusicLibrary, saveMusicLibrary } from "@/lib/music-storage";

export type Track = {
  id: string;
  name: string;
  path: string;
};

function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function useMusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(false);
  const [ready, setReady] = useState(false);

  const [volumeLevel, setVolumeLevel] = useState(0);
  const [bassLevel, setBassLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.volume = volume;
    audioRef.current = audio;

    function handleLoadedMetadata() {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    }

    function handleTimeUpdate() {
      setCurrentTime(audio.currentTime);
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.pause();

      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      void audioContextRef.current?.close().catch(() => undefined);

      audioRef.current = null;
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, []);

  function stopAnalyserLoop() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setVolumeLevel(0);
    setBassLevel(0);
    setFrequencyData([]);
  }

  function setupAnalyser() {
    const audio = audioRef.current;
    if (!audio) return;

    if (analyserRef.current && sourceRef.current && audioContextRef.current) {
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      // @ts-expect-error browser prefix fallback
      window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);

    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.35;

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }

  async function resumeAnalyser() {
    try {
      setupAnalyser();

      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
    } catch {
      // Player should still work even if analyser fails.
    }
  }

  function startAnalyserLoop() {
    if (animationFrameRef.current !== null) return;

    const dataArray = new Uint8Array(512);

    function tick() {
      const analyser = analyserRef.current;
      const audio = audioRef.current;

      if (!analyser || !audio) {
        animationFrameRef.current = null;
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      let total = 0;
      let bassTotal = 0;

      const bassStart = 1;
      const bassEnd = 24;

      for (let i = 0; i < dataArray.length; i++) {
        total += dataArray[i];

        if (i >= bassStart && i <= bassEnd) {
          bassTotal += dataArray[i];
        }
      }

      const volumeAverage = total / dataArray.length / 255;
      const bass = bassTotal / (bassEnd - bassStart + 1) / 255;

      setCurrentTime(audio.currentTime);
      setVolumeLevel(Math.min(1, volumeAverage * 1.65));
      setBassLevel(Math.min(1, bass * 2.8));
      setFrequencyData(Array.from(dataArray));

      animationFrameRef.current = window.requestAnimationFrame(tick);
    }

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }

  async function playAudio() {
    const audio = audioRef.current;
    if (!audio || !tracks.length) return;

    try {
      await resumeAnalyser();
      await audio.play();

      setIsPlaying(true);
      startAnalyserLoop();
    } catch {
      setIsPlaying(false);
      stopAnalyserLoop();
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTracks() {
      const savedTracks = await loadMusicLibrary();

      if (cancelled) return;

      setTracks(savedTracks);
      setReady(true);
    }

    void loadTracks();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveMusicLibrary(tracks);
  }, [ready, tracks]);

  useEffect(() => {
    async function loadAudioSource() {
      const audio = audioRef.current;
      if (!audio || tracks.length === 0) return;

      const track = tracks[currentIndex];
      if (!track) return;

      stopAnalyserLoop();
      setCurrentTime(0);
      setDuration(0);

      if (isTauri()) {
        const path = await import("@tauri-apps/api/path");

        const appDataDir = await path.appDataDir();
        const fullPath = await path.join(appDataDir, track.path);

        audio.src = convertFileSrc(fullPath);
      } else {
        audio.src = track.path;
      }

      audio.load();

      if (isPlaying) {
        void playAudio();
      }
    }

    void loadAudioSource();
  }, [currentIndex, tracks]);

  useEffect(() => {
    if (!isPlaying) {
      audioRef.current?.pause();
      stopAnalyserLoop();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const audioElement = audio;

    function handleEnded() {
      if (loop) {
        audioElement.currentTime = 0;
        setCurrentTime(0);
        void playAudio();
        return;
      }

      if (!tracks.length) {
        setIsPlaying(false);
        return;
      }

      if (shuffle) {
        setCurrentIndex(Math.floor(Math.random() * tracks.length));
        setIsPlaying(true);
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

    audioElement.addEventListener("ended", handleEnded);

    return () => {
      audioElement.removeEventListener("ended", handleEnded);
    };
  }, [tracks, shuffle, loop]);

  function playPause() {
    const audio = audioRef.current;
    if (!audio || !tracks.length) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      stopAnalyserLoop();
      return;
    }

    void playAudio();
  }

  function seek(nextTime: number) {
    const audio = audioRef.current;
    if (!audio) return;

    const safeTime = Math.min(Math.max(nextTime, 0), duration || 0);

    audio.currentTime = safeTime;
    setCurrentTime(safeTime);
  }

  function setVolume(nextVolume: number) {
    const safeVolume = Math.min(Math.max(nextVolume, 0), 1);

    setVolumeState(safeVolume);

    if (audioRef.current) {
      audioRef.current.volume = safeVolume;
    }
  }

  function loadTrack(index: number) {
    if (!tracks[index]) return;

    setCurrentIndex(index);
    setIsPlaying(true);
  }

  function pauseMusic() {
    audioRef.current?.pause();
    setIsPlaying(false);
    stopAnalyserLoop();
  }

  function next() {
    if (!tracks.length) return;

    if (shuffle) {
      setCurrentIndex(Math.floor(Math.random() * tracks.length));
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

  async function addTrack(file: File) {
    const newTrack: Track = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.mp3$/i, ""),
      path: "",
    };

    if (!isTauri()) {
      newTrack.path = URL.createObjectURL(file);
      setTracks((previousTracks) => [...previousTracks, newTrack]);
      return newTrack;
    }

    const fs = await import("@tauri-apps/plugin-fs");

    await fs.mkdir("music", {
      baseDir: fs.BaseDirectory.AppData,
      recursive: true,
    });

    const safeFileName = file.name.replace(/[^\w.-]/g, "_");
    const storedFileName = `${crypto.randomUUID()}-${safeFileName}`;
    const storedPath = `music/${storedFileName}`;

    const contents = new Uint8Array(await file.arrayBuffer());

    await fs.writeFile(storedPath, contents, {
      baseDir: fs.BaseDirectory.AppData,
    });

    newTrack.path = storedPath;

    setTracks((previousTracks) => [...previousTracks, newTrack]);

    return newTrack;
  }

  function renameTrack(id: string, nextName: string) {
    const cleanName = nextName.trim();
    if (!cleanName) return;

    setTracks((previousTracks) =>
      previousTracks.map((track) =>
        track.id === id ? { ...track, name: cleanName } : track
      )
    );
  }

  async function removeTrack(id: string) {
    const trackToRemove = tracks.find((track) => track.id === id);

    if (trackToRemove && isTauri()) {
      try {
        const fs = await import("@tauri-apps/plugin-fs");

        await fs.remove(trackToRemove.path, {
          baseDir: fs.BaseDirectory.AppData,
        });
      } catch {
        // Still remove from library if file delete fails.
      }
    }

    setTracks((previousTracks) => {
      const indexToRemove = previousTracks.findIndex((track) => track.id === id);
      const nextTracks = previousTracks.filter((track) => track.id !== id);

      if (indexToRemove === -1) return previousTracks;

      if (!nextTracks.length) {
        const audio = audioRef.current;

        audio?.pause();

        if (audio) {
          audio.src = "";
        }

        setCurrentIndex(0);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        stopAnalyserLoop();

        return nextTracks;
      }

      if (indexToRemove === currentIndex) {
        audioRef.current?.pause();
        setIsPlaying(false);
        stopAnalyserLoop();

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
    ready,
    tracks,
    currentIndex,
    isPlaying,
    shuffle,
    loop,
    volumeLevel,
    bassLevel,
    frequencyData,
    duration,
    currentTime,
    volume,
    pauseMusic,
    setShuffle,
    setLoop,
    setVolume,
    seek,
    playPause,
    loadTrack,
    next,
    prev,
    addTrack,
    renameTrack,
    removeTrack,
  };
}