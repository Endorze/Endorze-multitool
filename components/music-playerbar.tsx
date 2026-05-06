"use client";

import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music4,
} from "lucide-react";
import { useMusic } from "@/providers/MusicProvider";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function MusicPlayerBar() {
  const {
    tracks,
    currentIndex,
    isPlaying,
    playPause,
    next,
    prev,
    shuffle,
    loop,
    setShuffle,
    setLoop,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
  } = useMusic();

  const currentTrack = tracks[currentIndex];
  const progressValue = duration > 0 ? currentTime : 0;

  return (
    <div className="music-dock fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line)] px-4 py-3 backdrop-blur-xl">
      <div className="grid items-center gap-4 lg:grid-cols-[1fr_minmax(360px,620px)_1fr]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="music-cover">
            <Music4 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {currentTrack ? currentTrack.name : "No track selected"}
            </p>
            <p className="truncate text-xs theme-faint">
              {currentTrack ? "Local MP3" : "Upload music in the Music tab"}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShuffle(!shuffle)}
              className={`music-control-btn ${
                shuffle ? "music-control-active" : ""
              }`}
              aria-label="Toggle shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={prev}
              className="music-control-btn"
              aria-label="Previous track"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={playPause}
              className="music-control-main"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={next}
              className="music-control-btn"
              aria-label="Next track"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setLoop(!loop)}
              className={`music-control-btn ${loop ? "music-control-active" : ""}`}
              aria-label="Toggle loop"
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
            <span className="text-right text-xs tabular-nums theme-faint">
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progressValue}
              disabled={!currentTrack || duration <= 0}
              onChange={(event) => seek(Number(event.target.value))}
              className="h-1 w-full cursor-pointer accent-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Seek track"
            />

            <span className="text-xs tabular-nums theme-faint">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="hidden items-center justify-end gap-3 lg:flex">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2">
            {volume === 0 ? (
              <VolumeX className="h-4 w-4 theme-faint" />
            ) : (
              <Volume2 className="h-4 w-4 theme-faint" />
            )}

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="h-1 w-28 cursor-pointer accent-indigo-400"
              aria-label="Volume"
            />

            <span className="w-9 text-right text-xs tabular-nums theme-faint">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}