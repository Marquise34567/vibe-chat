import { useState, useRef, useCallback, useEffect } from "react";

/**
 * useWebcam — manages camera access for self-preview in the lobby.
 * Returns the video ref, camera status, and start/stop functions.
 */
export const useWebcam = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "active" | "denied" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (streamRef.current) return; // already running
    setStatus("requesting");
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported on this device");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      // Attach to the video element if it's already mounted.
      // The effect below also re-attaches whenever videoRef changes,
      // so we're safe even if the <video> mounts after the stream resolves.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("active");
    } catch (e) {
      const err = e as Error;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
        setError("Camera permission denied. Tap to retry.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setStatus("error");
        setError("No camera found on this device.");
      } else {
        setStatus("error");
        setError(err.message || "Could not access camera.");
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // If the stream resolved before the <video> was mounted (or the ref
  // changed for any reason), attach it now and start playback.
  useEffect(() => {
    if (streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [status, videoRef]);

  return { videoRef, status, error, start, stop };
};
