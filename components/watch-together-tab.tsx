"use client";

import { useMemo, useState } from "react";
import {
  Clapperboard,
  Copy,
  Link2,
  PlayCircle,
  Send,
  Users,
} from "lucide-react";

type ChatMessage = {
  id: string;
  author: string;
  message: string;
  time: string;
};

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getYouTubeId(input: string) {
  const value = input.trim();

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export default function WatchTogetherTab() {
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const hasRoom = Boolean(roomCode);

  const roomLink = useMemo(() => {
    if (!roomCode) return "";
    return `watch://${roomCode}`;
  }, [roomCode]);

  function createRoom() {
    setRoomCode(createRoomCode());
  }

  function joinRoom() {
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;
    setRoomCode(cleanCode);
    setJoinCode("");
  }

  function loadVideo() {
    const nextVideoId = getYouTubeId(videoUrl);

    if (!nextVideoId) {
      alert("Please paste a valid YouTube link.");
      return;
    }

    setVideoId(nextVideoId);
  }

  async function copyRoomCode() {
    if (!roomCode) return;

    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      alert(roomCode);
    }
  }

  function sendMessage() {
    const cleanMessage = chatInput.trim();
    if (!cleanMessage) return;

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author: "You",
        message: cleanMessage,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setChatInput("");
  }

  return (
    <div className="grid gap-4">
      <section className="theme-panel rounded-[32px] p-5 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm theme-muted">Watch Together</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">
              Shared YouTube Room
            </h2>
            <p className="mt-2 max-w-2xl text-sm theme-muted">
              Create or join a temporary room, paste a YouTube link, and watch
              together. Backend sync will connect here later.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={createRoom}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Users className="h-4 w-4" />
              Create room
            </button>

            <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] p-1">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="Room code"
                className="h-10 w-32 bg-transparent px-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={joinRoom}
                className="theme-button-accent rounded-xl px-4 py-2 text-sm font-medium"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </section>

      {hasRoom ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="theme-panel overflow-hidden rounded-[32px] p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3">
                <Link2 className="h-4 w-4 theme-muted" />
                <input
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadVideo();
                  }}
                  placeholder="Paste a YouTube link..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>

              <button
                type="button"
                onClick={loadVideo}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
              >
                <PlayCircle className="h-4 w-4" />
                Load video
              </button>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-black">
              {videoId ? (
                <iframe
                  key={videoId}
                  className="aspect-video w-full"
                  src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
                  title="Watch Together YouTube player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center px-6 text-center text-white">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/10">
                    <Clapperboard className="h-7 w-7" />
                  </div>
                  <p className="text-lg font-semibold">No video loaded</p>
                  <p className="mt-2 max-w-md text-sm text-white/50">
                    Paste a YouTube link above. Later, this same player will
                    sync play, pause, and seeking between everyone in the room.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="theme-panel flex min-h-[520px] flex-col rounded-[32px] p-4">
            <div className="mb-4 rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] theme-faint">
                Room
              </p>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">
                    {roomCode}
                  </p>
                  <p className="mt-1 text-xs theme-muted">{roomLink}</p>
                </div>

                <button
                  type="button"
                  onClick={copyRoomCode}
                  className="theme-button-soft grid h-11 w-11 place-items-center rounded-2xl"
                  aria-label="Copy room code"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Chat</h3>
                <p className="text-xs theme-muted">Local preview for now</p>
              </div>

              <span className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-xs theme-muted">
                1 online
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] p-3">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm theme-muted">
                  Chat messages will appear here.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{message.author}</p>
                      <p className="text-xs theme-faint">{message.time}</p>
                    </div>

                    <p className="text-sm theme-muted">{message.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                placeholder="Type a message..."
                className="theme-input h-12 min-w-0 flex-1 rounded-2xl px-4 text-sm outline-none"
              />

              <button
                type="button"
                onClick={sendMessage}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-400 text-slate-950"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </section>
      ) : (
        <section className="theme-panel rounded-[32px] px-6 py-16 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/[0.04]">
            <Clapperboard className="h-7 w-7" />
          </div>

          <p className="text-xl font-semibold">Create or join a room</p>
          <p className="mx-auto mt-2 max-w-lg text-sm theme-muted">
            This frontend is ready for the future WebSocket server. For now it
            lets you design the room flow, video area, and chat layout.
          </p>
        </section>
      )}
    </div>
  );
}