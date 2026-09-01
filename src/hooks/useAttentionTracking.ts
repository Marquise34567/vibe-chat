import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useAttentionTracking — lightweight webcam-based presence/motion detection.
 * Uses the webcam feed and frame-differencing to detect if the user is
 * present and engaged. If no motion is detected for a threshold, it triggers
 * an "are you still interested?" check.
 *
 * This is a pragmatic web approximation of eye-tracking — real eye tracking
 * would need MediaPipe FaceMesh or face-api.js (heavy deps). This uses
 * frame differencing which is lightweight and works without ML models.
 */

type AttentionState = "active" | "idle" | "away";

export const useAttentionTracking = ({
  enabled = true,
  idleThresholdMs = 20_000,
  awayThresholdMs = 45_000,
  onAway,
  externalVideoRef,
}: {
  enabled?: boolean;
  idleThresholdMs?: number;
  awayThresholdMs?: number;
  onAway?: () => void;
  /** If provided, the hook reads frames from this video element instead of
   *  opening its own camera — avoids a second getUserMedia call that would
   *  kill the first stream on most browsers. */
  externalVideoRef?: React.RefObject<HTMLVideoElement>;
} = {}) => {
  const ownVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef ?? ownVideoRef;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastMotionRef = useRef<number>(Date.now());
  const prevFrameRef = useRef<ImageData | null>(null);
  const rafRef = useRef<number>(0);
  const onAwayRef = useRef(onAway);
  onAwayRef.current = onAway;

  const [state, setState] = useState<AttentionState>("active");
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);

  // Start camera — skipped if an external video ref is provided (the
  // caller is responsible for opening the camera in that case).
  const startCamera = useCallback(async () => {
    if (externalVideoRef) {
      // Wait briefly for the external stream to be ready
      setHasCamera(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 160, height: 120, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCamera(true);
      setCameraDenied(false);
    } catch (err) {
      setCameraDenied(true);
      // Fall back to activity-based tracking (mouse/keyboard)
    }
  }, [externalVideoRef, videoRef]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Frame differencing for motion detection
  useEffect(() => {
    if (!enabled || !hasCamera) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const checkFrame = () => {
      if (video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (prevFrameRef.current) {
          let diff = 0;
          const data = frame.data;
          const prev = prevFrameRef.current.data;
          // Sample every 4th pixel for performance
          for (let i = 0; i < data.length; i += 16) {
            diff += Math.abs(data[i] - prev[i]) + Math.abs(data[i + 1] - prev[i + 1]);
          }
          const normalized = diff / (data.length / 16);
          // Motion threshold
          if (normalized > 3) {
            lastMotionRef.current = Date.now();
            setState("active");
          }
        }
        prevFrameRef.current = frame;
      }
      rafRef.current = requestAnimationFrame(checkFrame);
    };
    rafRef.current = requestAnimationFrame(checkFrame);

    // Periodic state check
    const stateCheck = setInterval(() => {
      const elapsed = Date.now() - lastMotionRef.current;
      if (elapsed > awayThresholdMs) {
        setState("away");
        onAwayRef.current?.();
      } else if (elapsed > idleThresholdMs) {
        setState("idle");
      } else {
        setState("active");
      }
    }, 3000);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(stateCheck);
    };
  }, [enabled, hasCamera, idleThresholdMs, awayThresholdMs]);

  // Fallback: activity-based tracking when no camera
  useEffect(() => {
    if (!enabled || hasCamera) return;
    const onActivity = () => { lastMotionRef.current = Date.now(); setState("active"); };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const stateCheck = setInterval(() => {
      const elapsed = Date.now() - lastMotionRef.current;
      if (elapsed > awayThresholdMs) { setState("away"); onAwayRef.current?.(); }
      else if (elapsed > idleThresholdMs) setState("idle");
    }, 3000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(stateCheck);
    };
  }, [enabled, hasCamera, idleThresholdMs, awayThresholdMs]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    state,
    hasCamera,
    cameraDenied,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    resetActivity: () => { lastMotionRef.current = Date.now(); setState("active"); },
  };
};
