"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

function computeProcessingBarValue(
  i: number,
  barCount: number,
  time: number,
  mode: string,
  lastActiveData: number[],
  progress: number,
): number {
  const isStatic = mode === "static";
  const halfCount = Math.floor(barCount / 2);
  const normalizedPosition = isStatic
    ? (i - halfCount) / halfCount
    : (i - barCount / 2) / (barCount / 2);
  const centerWeight = 1 - Math.abs(normalizedPosition) * 0.4;

  const wave1 = Math.sin(time * 1.5 + (isStatic ? normalizedPosition * 3 : i * 0.15)) * 0.25;
  const wave2 = Math.sin(time * 0.8 - (isStatic ? normalizedPosition * 2 : i * 0.1)) * 0.2;
  const wave3 = Math.cos(time * 2 + (isStatic ? normalizedPosition : i * 0.05)) * 0.15;
  const processingValue = (0.2 + wave1 + wave2 + wave3) * centerWeight;

  let finalValue = processingValue;
  if (lastActiveData.length > 0 && progress < 1) {
    const lastDataIndex = isStatic
      ? Math.min(i, lastActiveData.length - 1)
      : Math.floor((i / barCount) * lastActiveData.length);
    const lastValue = lastActiveData[lastDataIndex] || 0;
    finalValue = lastValue * (1 - progress) + processingValue * progress;
  }

  return Math.max(0.05, Math.min(1, finalValue));
}

function processAudioFrequencyData(
  analyser: AnalyserNode,
  rect: DOMRect,
  mode: string,
  sensitivity: number,
  barWidth: number,
  barGap: number,
  historySize: number,
  staticBarsRef: React.MutableRefObject<number[]>,
  lastActiveDataRef: React.MutableRefObject<number[]>,
  historyRef: React.MutableRefObject<number[]>,
): void {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  const startFreq = Math.floor(dataArray.length * 0.05);
  const endFreq = Math.floor(dataArray.length * 0.4);
  const relevantData = dataArray.slice(startFreq, endFreq);

  if (mode === "static") {
    const barCount = Math.floor(rect.width / (barWidth + barGap));
    const halfCount = Math.floor(barCount / 2);
    const newBars: number[] = [];

    for (let i = halfCount - 1; i >= 0; i--) {
      const dataIndex = Math.floor((i / halfCount) * relevantData.length);
      const value = Math.min(1, (relevantData[dataIndex] / 255) * sensitivity);
      newBars.push(Math.max(0.05, value));
    }
    for (let i = 0; i < halfCount; i++) {
      const dataIndex = Math.floor((i / halfCount) * relevantData.length);
      const value = Math.min(1, (relevantData[dataIndex] / 255) * sensitivity);
      newBars.push(Math.max(0.05, value));
    }
    staticBarsRef.current = newBars;
    lastActiveDataRef.current = newBars;
  } else {
    let sum = 0;
    for (const val of relevantData) {
      sum += val;
    }
    const average = (sum / relevantData.length / 255) * sensitivity;
    historyRef.current.push(Math.min(1, Math.max(0.05, average)));
    lastActiveDataRef.current = [...historyRef.current];
    if (historyRef.current.length > historySize) {
      historyRef.current.shift();
    }
  }
}

const LiveWaveform = ({
  active = false,
  processing = false,
  deviceId,
  barWidth = 3,
  barGap = 1,
  barRadius = 1.5,
  barColor,
  fadeEdges = true,
  fadeWidth = 24,
  barHeight: baseBarHeight = 4,
  height = 64,
  sensitivity = 1,
  smoothingTimeConstant = 0.8,
  fftSize = 256,
  historySize = 60,
  updateRate = 30,
  mode = "static",
  onError,
  onStreamReady,
  onStreamEnd,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  processing?: boolean;
  deviceId?: string;
  barWidth?: number;
  barHeight?: number;
  barGap?: number;
  barRadius?: number;
  barColor?: string;
  fadeEdges?: boolean;
  fadeWidth?: number;
  height?: string | number;
  sensitivity?: number;
  smoothingTimeConstant?: number;
  fftSize?: number;
  historySize?: number;
  updateRate?: number;
  mode?: "scrolling" | "static";
  onError?: (error: Error) => void;
  onStreamReady?: (stream: MediaStream) => void;
  onStreamEnd?: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<number[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const processingAnimationRef = useRef<number | null>(null);
  const lastActiveDataRef = useRef<number[]>([]);
  const transitionProgressRef = useRef(0);
  const staticBarsRef = useRef<number[]>([]);
  const needsRedrawRef = useRef(true);
  const gradientCacheRef = useRef<CanvasGradient | null>(null);
  const lastWidthRef = useRef(0);
  const heightStyle = typeof height === "number" ? `${height}px` : height;

  // Handle canvas resizing.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      gradientCacheRef.current = null;
      lastWidthRef.current = rect.width;
      needsRedrawRef.current = true;
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (processing && !active) {
      let time = 0;
      transitionProgressRef.current = 0;
      const animateProcessing = () => {
        time += 0.03;
        transitionProgressRef.current = Math.min(1, transitionProgressRef.current + 0.02);
        const processingData: number[] = [];
        const container = containerRef.current;
        const rect = container?.getBoundingClientRect() || { width: 200 };
        const barCount = Math.floor(rect.width / (barWidth + barGap));
        for (let i = 0; i < barCount; i++) {
          processingData.push(
            computeProcessingBarValue(
              i,
              barCount,
              time,
              mode,
              lastActiveDataRef.current,
              transitionProgressRef.current,
            ),
          );
        }

        if (mode === "static") {
          staticBarsRef.current = processingData;
        } else {
          historyRef.current = processingData;
        }
        needsRedrawRef.current = true;
        processingAnimationRef.current = requestAnimationFrame(animateProcessing);
      };
      animateProcessing();
      return () => {
        if (processingAnimationRef.current) {
          cancelAnimationFrame(processingAnimationRef.current);
        }
      };
    } else if (!active && !processing) {
      const hasData =
        mode === "static" ? staticBarsRef.current.length > 0 : historyRef.current.length > 0;
      if (hasData) {
        let fadeProgress = 0;
        const fadeToIdle = () => {
          fadeProgress += 0.03;
          if (fadeProgress < 1) {
            if (mode === "static") {
              staticBarsRef.current = staticBarsRef.current.map(
                (value) => value * (1 - fadeProgress),
              );
            } else {
              historyRef.current = historyRef.current.map((value) => value * (1 - fadeProgress));
            }
            needsRedrawRef.current = true;
            requestAnimationFrame(fadeToIdle);
          } else {
            if (mode === "static") {
              staticBarsRef.current = [];
            } else {
              historyRef.current = [];
            }
          }
        };
        fadeToIdle();
      }
    }
  }, [processing, active, barWidth, barGap, mode]);

  // Handle microphone setup and teardown.
  useEffect(() => {
    if (!active) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        onStreamEnd?.();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      return;
    }
    const setupMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId
            ? {
                deviceId: { exact: deviceId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
        });
        streamRef.current = stream;
        onStreamReady?.(stream);
        const AudioContextConstructor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextConstructor();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        historyRef.current = [];
      } catch (error) {
        onError?.(error as Error);
      }
    };
    setupMicrophone();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        onStreamEnd?.();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    };
  }, [active, deviceId, fftSize, smoothingTimeConstant, onError, onStreamReady, onStreamEnd]);

  function drawWaveformBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string,
    alpha: number,
  ) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    if (radius > 0) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }
  }

  function renderStaticWaveformBars(
    ctx: CanvasRenderingContext2D,
    rect: DOMRect,
    staticBars: Array<number>,
    step: number,
    barCount: number,
    barWidth: number,
    baseBarHeight: number,
    barRadius: number,
    color: string,
  ) {
    const centerY = rect.height / 2;
    for (let i = 0; i < barCount && i < staticBars.length; i++) {
      const value = staticBars[i] || 0.1;
      const x = i * step;
      const bh = Math.max(baseBarHeight, value * rect.height * 0.8);
      const y = centerY - bh / 2;
      drawWaveformBar(ctx, x, y, barWidth, bh, barRadius, color, 0.4 + value * 0.6);
    }
  }

  function renderScrollingWaveformBars(
    ctx: CanvasRenderingContext2D,
    rect: DOMRect,
    history: Array<number>,
    step: number,
    barCount: number,
    barWidth: number,
    baseBarHeight: number,
    barRadius: number,
    color: string,
  ) {
    const centerY = rect.height / 2;
    for (let i = 0; i < barCount && i < history.length; i++) {
      const dataIndex = history.length - 1 - i;
      const value = history[dataIndex] || 0.1;
      const x = rect.width - (i + 1) * step;
      const bh = Math.max(baseBarHeight, value * rect.height * 0.8);
      const y = centerY - bh / 2;
      drawWaveformBar(ctx, x, y, barWidth, bh, barRadius, color, 0.4 + value * 0.6);
    }
  }

  // Animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let rafId: number;
    const animate = (currentTime: number) => {
      const rect = canvas.getBoundingClientRect();
      if (active && currentTime - lastUpdateRef.current > updateRate) {
        lastUpdateRef.current = currentTime;
        if (analyserRef.current) {
          processAudioFrequencyData(
            analyserRef.current,
            rect,
            mode,
            sensitivity,
            barWidth,
            barGap,
            historySize,
            staticBarsRef,
            lastActiveDataRef,
            historyRef,
          );
          needsRedrawRef.current = true;
        }
      }
      if (!needsRedrawRef.current && !active) {
        rafId = requestAnimationFrame(animate);
        return;
      }
      needsRedrawRef.current = active;
      ctx.clearRect(0, 0, rect.width, rect.height);
      const computedBarColor =
        barColor ||
        (() => {
          const style = getComputedStyle(canvas);
          const color = style.color;
          return color || "#000";
        })();
      const step = barWidth + barGap;
      const barCount = Math.floor(rect.width / step);
      if (mode === "static") {
        renderStaticWaveformBars(
          ctx,
          rect,
          staticBarsRef.current,
          step,
          barCount,
          barWidth,
          baseBarHeight,
          barRadius,
          computedBarColor,
        );
      } else {
        renderScrollingWaveformBars(
          ctx,
          rect,
          historyRef.current,
          step,
          barCount,
          barWidth,
          baseBarHeight,
          barRadius,
          computedBarColor,
        );
      }
      if (fadeEdges && fadeWidth > 0 && rect.width > 0) {
        if (!gradientCacheRef.current || lastWidthRef.current !== rect.width) {
          const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
          const fadePercent = Math.min(0.3, fadeWidth / rect.width);
          gradient.addColorStop(0, "rgba(255,255,255,1)");
          gradient.addColorStop(fadePercent, "rgba(255,255,255,0)");
          gradient.addColorStop(1 - fadePercent, "rgba(255,255,255,0)");
          gradient.addColorStop(1, "rgba(255,255,255,1)");
          gradientCacheRef.current = gradient;
          lastWidthRef.current = rect.width;
        }
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = gradientCacheRef.current;
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [
    active,
    processing,
    sensitivity,
    updateRate,
    historySize,
    barWidth,
    baseBarHeight,
    barGap,
    barRadius,
    barColor,
    fadeEdges,
    fadeWidth,
    mode,
  ]);

  return (
    <div
      className={cn("relative h-full w-full", className)}
      ref={containerRef}
      style={{ height: heightStyle }}
      aria-label={
        active ? "Live audio waveform" : processing ? "Processing audio" : "Audio waveform idle"
      }
      role="img"
      {...props}
    >
      {!active && !processing && (
        <div className="absolute top-1/2 right-0 left-0 -translate-y-1/2 border-t-2 border-dotted border-muted-foreground/20" />
      )}
      <canvas className="block h-full w-full" ref={canvasRef} aria-hidden="true" />
    </div>
  );
};

export function LiveWaveformCard() {
  const [active, setActive] = useState(false);
  const [processing, setProcessing] = useState(true);
  const [mode, setMode] = useState<"static" | "scrolling">("static");

  const handleToggleActive = () => {
    setActive(!active);
    if (!active) {
      setProcessing(false);
    }
  };

  const handleToggleProcessing = () => {
    setProcessing(!processing);
    if (!processing) {
      setActive(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Audio Waveform</CardTitle>
        <CardDescription>
          Real-time microphone input visualization with audio reactivity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LiveWaveform
          active={active}
          processing={processing}
          height={80}
          barWidth={3}
          barGap={2}
          mode={mode}
          fadeEdges={true}
          barColor="gray"
          historySize={120}
        />
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant={active ? "default" : "outline"} onClick={handleToggleActive}>
          {active ? "Stop" : "Start"} Listening
        </Button>
        <Button
          size="sm"
          variant={processing ? "default" : "outline"}
          onClick={handleToggleProcessing}
        >
          {processing ? "Stop" : "Start"} Processing
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMode(mode === "static" ? "scrolling" : "static")}
        >
          {mode === "static" ? "Static" : "Scrolling"}
        </Button>
      </CardFooter>
    </Card>
  );
}
