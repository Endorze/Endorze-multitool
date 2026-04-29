"use client";

import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  Music4,
} from "lucide-react";
import { useMusic } from "@/providers/MusicProvider";

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
  } = useMusic();

  const currentTrack = tracks[currentIndex];

  return (
    <div className="music-dock fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line)] px-4 py-3 backdrop-blur-xl">
      <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
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

        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShuffle(!shuffle)}
            className={`music-control-btn ${shuffle ? "music-control-active" : ""}`}
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

        <div className="hidden items-center justify-end gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-xs theme-faint">
            <Volume2 className="h-4 w-4" />
            Desktop player
          </div>
        </div>
      </div>
    </div>
  );
}