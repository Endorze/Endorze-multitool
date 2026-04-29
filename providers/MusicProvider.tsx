"use client";

import { createContext, useContext } from "react";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";

const MusicContext = createContext<ReturnType<typeof useMusicPlayer> | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const music = useMusicPlayer();

  return (
    <MusicContext.Provider value={music}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);

  if (!context) {
    throw new Error("useMusic must be used inside MusicProvider");
  }

  return context;
}