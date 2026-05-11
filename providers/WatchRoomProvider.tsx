"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WatchRoomState = {
  roomCode: string | null;
  videoId: string | null;
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  onlineCount: number;
};

type WatchChatMessage = {
  id: string;
  author: string;
  message: string;
  time: string;
};

type WatchRoomContextValue = WatchRoomState & {
  messages: WatchChatMessage[];
  createRoom: () => string;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  loadVideoUrl: (url: string) => boolean;
  setPlaybackState: (state: {
    isPlaying: boolean;
    currentTime: number;
  }) => void;
  sendMessage: (message: string) => void;
};

const WatchRoomContext = createContext<WatchRoomContextValue | null>(null);

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

function getCurrentChatTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WatchRoomProvider({ children }: { children: ReactNode }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [messages, setMessages] = useState<WatchChatMessage[]>([]);

  const value = useMemo<WatchRoomContextValue>(() => {
    return {
      roomCode,
      videoId,
      videoUrl,
      isPlaying,
      currentTime,
      onlineCount: roomCode ? 1 : 0,
      messages,

      createRoom() {
        const code = createRoomCode();

        setRoomCode(code);
        setVideoId(null);
        setVideoUrl("");
        setIsPlaying(false);
        setCurrentTime(0);
        setMessages([]);

        return code;
      },

      joinRoom(code) {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return;

        setRoomCode(cleanCode);
        setIsPlaying(false);
        setCurrentTime(0);
      },

      leaveRoom() {
        setRoomCode(null);
        setVideoId(null);
        setVideoUrl("");
        setIsPlaying(false);
        setCurrentTime(0);
        setMessages([]);
      },

      loadVideoUrl(url) {
        const cleanUrl = url.trim();
        const nextVideoId = getYouTubeId(cleanUrl);

        if (!nextVideoId) {
          return false;
        }

        setVideoUrl(cleanUrl);
        setVideoId(nextVideoId);
        setIsPlaying(false);
        setCurrentTime(0);

        return true;
      },

      setPlaybackState(state) {
        setIsPlaying(state.isPlaying);
        setCurrentTime(Math.max(0, state.currentTime));
      },

      sendMessage(message) {
        const cleanMessage = message.trim();
        if (!cleanMessage) return;

        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            author: "You",
            message: cleanMessage,
            time: getCurrentChatTime(),
          },
        ]);
      },
    };
  }, [roomCode, videoId, videoUrl, isPlaying, currentTime, messages]);

  return (
    <WatchRoomContext.Provider value={value}>
      {children}
    </WatchRoomContext.Provider>
  );
}

export function useWatchRoom() {
  const context = useContext(WatchRoomContext);

  if (!context) {
    throw new Error("useWatchRoom must be used inside WatchRoomProvider");
  }

  return context;
}