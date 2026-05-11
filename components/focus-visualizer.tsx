"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useIdleVisualizer } from "@/hooks/useIdleVisualizer";
import { useMusic } from "@/providers/MusicProvider";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

type RGB = {
  r: number;
  g: number;
  b: number;
};

type VisualizerPalette = {
  inner: RGB;
  middle: RGB;
  outer: RGB;
  glow: RGB;
};

type BarSeed = {
  bin: number;
  phase: number;
  speed: number;
  weight: number;
  extraPunch: number;
};

const PALETTES: VisualizerPalette[] = [
  {
    inner: { r: 244, g: 114, b: 182 },
    middle: { r: 217, g: 70, b: 239 },
    outer: { r: 126, g: 34, b: 206 },
    glow: { r: 217, g: 70, b: 239 },
  },
  {
    inner: { r: 103, g: 232, b: 249 },
    middle: { r: 59, g: 130, b: 246 },
    outer: { r: 99, g: 102, b: 241 },
    glow: { r: 34, g: 211, b: 238 },
  },
  {
    inner: { r: 251, g: 191, b: 36 },
    middle: { r: 249, g: 115, b: 22 },
    outer: { r: 244, g: 63, b: 94 },
    glow: { r: 251, g: 113, b: 133 },
  },
  {
    inner: { r: 110, g: 231, b: 183 },
    middle: { r: 45, g: 212, b: 191 },
    outer: { r: 14, g: 165, b: 233 },
    glow: { r: 45, g: 212, b: 191 },
  },
  {
    inner: { r: 216, g: 180, b: 254 },
    middle: { r: 168, g: 85, b: 247 },
    outer: { r: 236, g: 72, b: 153 },
    glow: { r: 192, g: 132, b: 252 },
  },
];

function mixRgb(a: RGB, b: RGB, amount: number): RGB {
  return {
    r: lerp(a.r, b.r, amount),
    g: lerp(a.g, b.g, amount),
    b: lerp(a.b, b.b, amount),
  };
}

function rgb({ r, g, b }: RGB, alpha = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

function mixPalette(
  from: VisualizerPalette,
  to: VisualizerPalette,
  amount: number
): VisualizerPalette {
  return {
    inner: mixRgb(from.inner, to.inner, amount),
    middle: mixRgb(from.middle, to.middle, amount),
    outer: mixRgb(from.outer, to.outer, amount),
    glow: mixRgb(from.glow, to.glow, amount),
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height
  );
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function createBarSeeds(count: number): BarSeed[] {
  return Array.from({ length: count }, () => {
    const prefersBass = Math.random() < 0.42;

    return {
      bin: prefersBass
        ? 4 + Math.floor(Math.random() * 55)
        : 25 + Math.floor(Math.random() * 210),
      phase: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.0025,
      weight: 0.72 + Math.random() * 0.55,
      extraPunch: Math.random() < 0.18 ? 1.8 : 1,
    };
  });
}

function RadialOrbCanvas({
  frequencyData,
  bassLevel,
  volumeLevel,
}: {
  frequencyData: number[];
  bassLevel: number;
  volumeLevel: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const frequencyDataRef = useRef<number[]>([]);
  const bassLevelRef = useRef(0);
  const volumeLevelRef = useRef(0);

  const rotationRef = useRef(0);
  const smoothedBarsRef = useRef<number[]>([]);
  const barSeedsRef = useRef<BarSeed[]>([]);

  const colorRef = useRef({
    fromIndex: 0,
    toIndex: 1,
    transitionStart: 0,
    transitionDuration: 4500,
    holdDuration: 8500,
  });

  useEffect(() => {
    frequencyDataRef.current = frequencyData;
    bassLevelRef.current = bassLevel;
    volumeLevelRef.current = volumeLevel;
  }, [frequencyData, bassLevel, volumeLevel]);

  useEffect(() => {
  const canvasElement = canvasRef.current;
  if (!canvasElement) return;

  const context = canvasElement.getContext("2d");
  if (!context) return;

  const canvas = canvasElement;
  const ctx = context;

  colorRef.current.transitionStart = performance.now();

  let mounted = true;

  function resizeCanvas() {
    const parent = canvas.parentElement;
    if (!parent) return;

    const size = Math.min(parent.clientWidth, parent.clientHeight);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

    function getPalette(now: number) {
      const colorState = colorRef.current;
      const elapsed = now - colorState.transitionStart;
      const totalCycle = colorState.transitionDuration + colorState.holdDuration;

      if (elapsed > totalCycle) {
        const previousToIndex = colorState.toIndex;
        let nextIndex = Math.floor(Math.random() * PALETTES.length);

        if (nextIndex === previousToIndex) {
          nextIndex = (nextIndex + 1) % PALETTES.length;
        }

        colorRef.current = {
          ...colorState,
          fromIndex: previousToIndex,
          toIndex: nextIndex,
          transitionStart: now,
        };
      }

      const nextColorState = colorRef.current;
      const nextElapsed = now - nextColorState.transitionStart;
      const transitionProgress = clamp(
        nextElapsed / nextColorState.transitionDuration
      );

      const easedProgress =
        transitionProgress < 0.5
          ? 2 * transitionProgress * transitionProgress
          : 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2;

      return mixPalette(
        PALETTES[nextColorState.fromIndex],
        PALETTES[nextColorState.toIndex],
        easedProgress
      );
    }

    function drawStars(width: number, height: number) {
      ctx.save();

      for (let i = 0; i < 170; i++) {
        const x = ((i * 97.13) % width) + Math.sin(i) * 8;
        const y = ((i * 53.71) % height) + Math.cos(i * 2) * 8;
        const opacity = 0.1 + ((i % 7) / 7) * 0.26;
        const size = i % 11 === 0 ? 1.35 : 0.75;

        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.fillRect(x, y, size, size);
      }

      ctx.restore();
    }

    function getRandomizedFrequencyValue(seed: BarSeed, now: number) {
      const data = frequencyDataRef.current;
      if (!data.length) return 0;

      const bin = Math.min(seed.bin, data.length - 1);

      const a = data[bin] ?? 0;
      const b = data[Math.min(bin + 3, data.length - 1)] ?? a;
      const c = data[Math.min(bin + 8, data.length - 1)] ?? a;

      const audioValue = (a * 0.62 + b * 0.26 + c * 0.12) / 255;
      const livingNoise = 0.5 + Math.sin(now * seed.speed + seed.phase) * 0.5;

      return Math.pow(audioValue, 1.35) * seed.weight * seed.extraPunch + livingNoise * 0.035;
    }

    function draw(now: number) {
      if (!mounted) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (!width || !height) {
        frameRef.current = window.requestAnimationFrame(draw);
        return;
      }

      const palette = getPalette(now);

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      const bass = clamp(bassLevelRef.current);
      const volume = clamp(volumeLevelRef.current);

      const bars = 112;
      const innerRadius = Math.min(width, height) * 0.255;
      const maxBarHeight = Math.min(width, height) * 0.185;
      const barWidth = Math.max(4, Math.min(width, height) * 0.0095);

      if (barSeedsRef.current.length !== bars) {
        barSeedsRef.current = createBarSeeds(bars);
      }

      if (smoothedBarsRef.current.length !== bars) {
        smoothedBarsRef.current = Array.from({ length: bars }, () => 0);
      }

      rotationRef.current += 0.0012 + volume * 0.0018;

      drawStars(width, height);

      const bgGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        20,
        centerX,
        centerY,
        width * 0.62
      );

      bgGradient.addColorStop(0, rgb(palette.glow, 0.09));
      bgGradient.addColorStop(0.5, rgb(palette.outer, 0.08));
      bgGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current);

      ctx.shadowBlur = 24 + bass * 52;
      ctx.shadowColor = rgb(palette.glow, 0.75);

      for (let i = 0; i < bars; i++) {
        const seed = barSeedsRef.current[i];
        const raw = getRandomizedFrequencyValue(seed, now);

        const previous = smoothedBarsRef.current[i] ?? 0;
        const smoothing = raw > previous ? 0.42 : 0.085;
        const value = previous + (raw - previous) * smoothing;

        smoothedBarsRef.current[i] = value;

        const angle = (i / bars) * Math.PI * 2;

        const idleWave =
          0.08 +
          Math.sin(now * 0.0013 + seed.phase) * 0.018 +
          Math.sin(now * 0.0019 + i * 0.41) * 0.012;

        const randomPulse =
          Math.sin(now * seed.speed * 1.8 + seed.phase * 2.1) > 0.82
            ? bass * seed.extraPunch * 18
            : 0;

        const barHeight =
          18 + idleWave * 36 + value * maxBarHeight + bass * 8 + randomPulse;

        ctx.save();
        ctx.rotate(angle);

        const gradient = ctx.createLinearGradient(
          innerRadius,
          0,
          innerRadius + barHeight,
          0
        );

        gradient.addColorStop(0, rgb(palette.inner, 0.98));
        gradient.addColorStop(0.52, rgb(palette.middle, 0.88));
        gradient.addColorStop(1, rgb(palette.outer, 0.72));

        ctx.fillStyle = gradient;

        drawRoundedRect(
          ctx,
          innerRadius,
          -barWidth / 2,
          barHeight,
          barWidth,
          barWidth / 2
        );

        ctx.fill();

        ctx.restore();
      }

      ctx.restore();

      ctx.save();

      const coreRadius = innerRadius * (1.08 + bass * 0.08);
      const coreGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        coreRadius * 0.1,
        centerX,
        centerY,
        coreRadius
      );

      coreGradient.addColorStop(0, "rgba(0, 0, 0, 1)");
      coreGradient.addColorStop(0.68, "rgba(0, 0, 0, 1)");
      coreGradient.addColorStop(0.9, "rgba(10, 4, 15, 1)");
      coreGradient.addColorStop(1, rgb(palette.glow, 0.18));

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.shadowBlur = 30 + bass * 58;
      ctx.shadowColor = rgb(palette.glow, 0.46);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.strokeStyle = rgb(palette.inner, 0.18 + bass * 0.28);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      frameRef.current = window.requestAnimationFrame(draw);
    }

    resizeCanvas();
    frameRef.current = window.requestAnimationFrame(draw);

    window.addEventListener("resize", resizeCanvas);

    return () => {
      mounted = false;
      window.removeEventListener("resize", resizeCanvas);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

export default function FocusVisualizer() {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const {
    tracks,
    currentIndex,
    isPlaying,
    playPause,
    next,
    prev,
    shuffle,
    loop,
    volumeLevel,
    bassLevel,
    frequencyData,
    setShuffle,
    setLoop,
  } = useMusic();

  const currentTrack = tracks[currentIndex];

  const { isIdle, exitIdle } = useIdleVisualizer({
    enabled: isPlaying && Boolean(currentTrack),
    idleMs: 5_000,
    exitOnActivity: false,
  });

  const showVisualizer = isIdle && isPlaying && Boolean(currentTrack);

  useEffect(() => {
    if (showVisualizer) {
      overlayRef.current?.focus();
    }
  }, [showVisualizer]);

  return (
    <AnimatePresence>
      {showVisualizer ? (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[200] overflow-hidden bg-black text-white outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
          onKeyDown={(event) => {
            if (event.key === "Escape") exitIdle();
          }}
          tabIndex={0}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.18),rgba(0,0,0,0.94)_62%,#000_100%)]" />

          <button
            type="button"
            onClick={exitIdle}
            className="absolute right-6 top-6 z-20 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white/80 backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
            aria-label="Exit visualizer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-28 pt-12">
            <div className="relative h-[min(72vw,620px)] w-[min(72vw,620px)] max-h-[620px] max-w-[620px]">
              <RadialOrbCanvas
                frequencyData={frequencyData}
                bassLevel={bassLevel}
                volumeLevel={volumeLevel}
              />
            </div>

            <motion.div
              className="-mt-6 text-center"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.55 }}
            >
              <p className="text-xs uppercase tracking-[0.42em] text-fuchsia-200/55">
                Now playing
              </p>

              <h2 className="mx-auto mt-4 max-w-3xl truncate text-4xl font-semibold tracking-tight sm:text-5xl">
                {currentTrack?.name}
              </h2>

              <p className="mt-3 text-sm text-white/40">Local MP3</p>
            </motion.div>

            <motion.div
              className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-[28px] border border-white/10 bg-white/10 px-4 py-3 shadow-[0_0_50px_rgba(217,70,239,0.16)] backdrop-blur-2xl"
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.55 }}
            >
              <button
                type="button"
                onClick={() => setShuffle(!shuffle)}
                className={`grid h-11 w-11 place-items-center rounded-2xl transition ${shuffle
                    ? "bg-fuchsia-300 text-slate-950"
                    : "bg-white/10 hover:bg-white/15"
                  }`}
                aria-label="Toggle shuffle"
              >
                <Shuffle className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={prev}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 transition hover:bg-white/15"
                aria-label="Previous track"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={playPause}
                className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-300 to-purple-500 text-slate-950 shadow-[0_0_30px_rgba(217,70,239,0.45)] transition hover:scale-[1.03]"
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
                className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 transition hover:bg-white/15"
                aria-label="Next track"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setLoop(!loop)}
                className={`grid h-11 w-11 place-items-center rounded-2xl transition ${loop
                    ? "bg-fuchsia-300 text-slate-950"
                    : "bg-white/10 hover:bg-white/15"
                  }`}
                aria-label="Toggle loop"
              >
                <Repeat className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}