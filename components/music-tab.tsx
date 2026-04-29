"use client";

import { useRef, useState } from "react";
import { MoreHorizontal, Music4, Plus, Trash2 } from "lucide-react";
import { useMusic } from "@/providers/MusicProvider";

export default function MusicTab() {
  const { tracks, currentIndex, loadTrack, addTrack, removeTrack } = useMusic();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type !== "audio/mpeg") {
        alert("Only MP3 files are allowed.");
        continue;
      }

      addTrack(file);
    }

    e.target.value = "";
  }

  function handleDeleteTrack(id: string) {
    removeTrack(id);
    setOpenMenuId(null);
  }

  return (
    <div className="grid gap-4">
      <section className="music-hero theme-panel rounded-[32px] p-5 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm theme-muted">Music</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">
              Your Library
            </h2>
            <p className="mt-2 max-w-2xl text-sm theme-muted">
              Add local MP3 files and play them from anywhere in the app using
              the docked player below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Add MP3
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg"
              multiple
              hidden
              onChange={handleUpload}
            />
          </div>
        </div>
      </section>

      <section className="theme-panel rounded-[32px] p-3 sm:p-4">
        {tracks.length === 0 ? (
          <div className="music-empty-state rounded-[28px] px-6 py-16 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Music4 className="h-6 w-6" />
            </div>
            <p className="text-lg font-medium">No music yet</p>
            <p className="mt-2 text-sm theme-muted">
              Add your first MP3 to start building a local library.
            </p>
          </div>
        ) : (
          <div className="music-list rounded-[28px] p-2">
            <div className="hidden grid-cols-[56px_minmax(0,1fr)_120px_64px] gap-3 px-4 py-3 text-xs uppercase tracking-[0.16em] theme-faint md:grid">
              <span>#</span>
              <span>Title</span>
              <span>Type</span>
              <span></span>
            </div>

            <div className="space-y-2">
              {tracks.map((track, index) => {
                const isActive = index === currentIndex;

                return (
                  <div
                    key={track.id}
                    className={`relative grid items-center gap-3 rounded-[22px] border px-4 py-4 transition md:grid-cols-[56px_minmax(0,1fr)_120px_64px] ${
                      isActive
                        ? "border-indigo-400/25 bg-indigo-500/15"
                        : "border-[var(--line)] bg-[var(--panel-soft)] hover:bg-[var(--panel-strong)]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadTrack(index)}
                      className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold"
                    >
                      {index + 1}
                    </button>

                    <button
                      type="button"
                      onClick={() => loadTrack(index)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate text-sm font-medium">{track.name}</p>
                      <p className="mt-1 text-xs theme-faint md:hidden">MP3</p>
                    </button>

                    <div className="hidden md:block">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs theme-muted">
                        MP3
                      </span>
                    </div>

                    <div className="relative flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId(openMenuId === track.id ? null : track.id)
                        }
                        className="grid h-9 w-9 place-items-center rounded-xl border border-transparent text-[var(--text-soft)] transition hover:border-[var(--line)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                        aria-label="Track options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openMenuId === track.id ? (
                        <div className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                          <button
                            type="button"
                            onClick={() => handleDeleteTrack(track.id)}
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition hover:bg-white/[0.06]"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>

                          <button
                            type="button"
                            disabled
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm opacity-45"
                          >
                            <Plus className="h-4 w-4" />
                            Queue later
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}