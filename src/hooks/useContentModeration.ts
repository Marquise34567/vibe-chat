/**
 * useContentModeration — Real-time NSFW detection on video feeds.
 *
 * Uses NSFWJS (TensorFlow.js) to classify video frames every few seconds.
 * If NSFW content is detected above a threshold, it triggers a violation
 * callback so the caller can disconnect/skip/report.
 *
 * Architecture:
 *   - Loads the NSFWJS MobileNet model on first use (lazy)
 *   - Captures frames from any <video> element via a hidden <canvas>
 *   - Classifies frames into: Drawing / Hentai / Neutral / Porn / Sexy
 *   - If "Porn" or "Hentai" probability > threshold → violation
 *   - If "Sexy" probability > threshold for consecutive frames → violation
 *   - Reports violations via callback (caller decides what to do)
 *
 * Privacy: All analysis runs locally in the browser. No frames are sent
 * to any server. Only violation metadata (class + probability) is reported.
 */

import { useRef, useState, useCallback, useEffect } from "react";

type NSFWClass = "Drawing" | "Hentai" | "Neutral" | "Porn" | "Sexy";

type Prediction = {
  className: NSFWClass;
  probability: number;
};

type ModerationConfig = {
  /** Scan interval in ms (default 3000) */
  intervalMs?: number;
  /** Probability threshold for immediate violation (Porn/Hentai) (default 0.85) */
  hardThreshold?: number;
  /** Probability threshold for soft violation (Sexy) (default 0.85) */
  softThreshold?: number;
  /** Consecutive soft hits before triggering violation (default 3) */
  softConsecutiveLimit?: number;
};

type ModerationState = "idle" | "loading" | "scanning" | "violated" | "error";

type ViolationReport = {
  class: NSFWClass;
  probability: number;
  source: "local" | "remote";
  timestamp: number;
};

// Singleton model — loaded once, reused across all hook instances
// TF.js and NSFWJS are loaded from CDN to keep the bundle small
let modelPromise: Promise<any> | null = null;

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
};

const loadModel = async () => {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    // Load TF.js and NSFWJS from CDN
    await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
    await loadScript("https://cdn.jsdelivr.net/npm/nsfwjs@4.3.0/dist/nsfwjs.min.js");
    const tf = (window as any).tf;
    const nsfwjs = (window as any).nsfwjs;
    if (!tf || !nsfwjs) throw new Error("Failed to load TF.js or NSFWJS");
    await tf.ready();
    const model = await nsfwjs.load();
    console.log("[moderation] NSFWJS model loaded from CDN");
    return model;
  })();
  return modelPromise;
};

export function useContentModeration(config: ModerationConfig = {}) {
  const {
    intervalMs = 3000,
    hardThreshold = 0.85,
    softThreshold = 0.85,
    softConsecutiveLimit = 3,
  } = config;

  const [state, setState] = useState<ModerationState>("idle");
  const [lastResult, setLastResult] = useState<Prediction | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<any>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const softHitCountRef = useRef(0);
  const violationCallbackRef = useRef<((report: ViolationReport) => void) | null>(null);
  const sourceLabelRef = useRef<"local" | "remote">("local");
  const scanningRef = useRef(false);

  // ── Initialize canvas for frame capture ──
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    canvasRef.current = canvas;
    return () => {
      stopScanning();
    };
  }, []);

  // ── Classify a single frame from a video element ──
  const classifyFrame = useCallback(
    async (video: HTMLVideoElement): Promise<Prediction | null> => {
      if (!video || video.readyState < 2) return null;
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;

      // Draw current video frame to canvas at model's expected size
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch {
        return null; // video not ready
      }

      if (!modelRef.current) return null;

      try {
        const predictions: Prediction[] = await modelRef.current.classify(canvas);
        // Find the highest-probability class
        const top = predictions.reduce((a, b) => (a.probability > b.probability ? a : b));
        return top;
      } catch (err) {
        console.error("[moderation] classify error:", err);
        return null;
      }
    },
    []
  );

  // ── Check if a prediction is a violation ──
  const checkViolation = useCallback(
    (prediction: Prediction): boolean => {
      const { className, probability } = prediction;

      // Hard violations — immediate
      if ((className === "Porn" || className === "Hentai") && probability >= hardThreshold) {
        softHitCountRef.current = 0;
        return true;
      }

      // Soft violations — need consecutive hits
      if (className === "Sexy" && probability >= softThreshold) {
        softHitCountRef.current += 1;
        if (softHitCountRef.current >= softConsecutiveLimit) {
          softHitCountRef.current = 0;
          return true;
        }
      } else {
        // Reset soft counter on non-sexy frames
        softHitCountRef.current = 0;
      }

      return false;
    },
    [hardThreshold, softThreshold, softConsecutiveLimit]
  );

  // ── Start scanning a video element ──
  const startScanning = useCallback(
    async (
      videoRef: React.RefObject<HTMLVideoElement>,
      source: "local" | "remote",
      onViolation: (report: ViolationReport) => void
    ) => {
      if (scanningRef.current) return;

      sourceLabelRef.current = source;
      violationCallbackRef.current = onViolation;
      setState("loading");

      try {
        modelRef.current = await loadModel();
      } catch (err) {
        console.error("[moderation] Failed to load model:", err);
        setState("error");
        return;
      }

      setState("scanning");
      scanningRef.current = true;

      const scan = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        if (videoRef.current.readyState < 2) return; // not enough data
        const prediction = await classifyFrame(videoRef.current);
        if (prediction) {
          setLastResult(prediction);

          if (checkViolation(prediction)) {
            const report: ViolationReport = {
              class: prediction.className,
              probability: prediction.probability,
              source: sourceLabelRef.current,
              timestamp: Date.now(),
            };
            violationCallbackRef.current?.(report);
          }
        }
      };

      // Delay first scan to let camera settle, then scan on interval
      scanTimerRef.current = setInterval(scan, intervalMs);
    },
    [classifyFrame, checkViolation, intervalMs]
  );

  // ── Stop scanning ──
  const stopScanning = useCallback(() => {
    scanningRef.current = false;
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    softHitCountRef.current = 0;
    setState("idle");
  }, []);

  // ── Report a violation to the server (via WebSocket) ──
  const reportViolation = useCallback(
    (ws: WebSocket | null, report: ViolationReport, peerId?: string) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({
        type: "report-violation",
        class: report.class,
        probability: report.probability,
        source: report.source,
        peerId,
        timestamp: report.timestamp,
      }));
    },
    []
  );

  return {
    state,
    lastResult,
    startScanning,
    stopScanning,
    reportViolation,
  };
}
