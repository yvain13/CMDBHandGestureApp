import { useEffect, useRef, useState } from "react";
import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";

// Must match the installed @mediapipe/tasks-vision version exactly (package.json) —
// the WASM binary and the JS API are versioned together.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task";

export interface RecognizedFrame {
  category: string;
  score: number;
  timestampMs: number;
  landmarks: { x: number; y: number; z: number }[] | null;
}

export function useGestureRecognizer(
  videoRef: React.RefObject<HTMLVideoElement>,
  onFrame: (frame: RecognizedFrame) => void,
  active: boolean
) {
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (!cancelled) {
          recognizerRef.current = recognizer;
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
      recognizerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!ready || !active) return;
    let rafId: number;
    const loop = () => {
      const video = videoRef.current;
      const recognizer = recognizerRef.current;
      if (video && recognizer && video.readyState >= 2) {
        const timestampMs = performance.now();
        const result = recognizer.recognizeForVideo(video, timestampMs);
        const top = result.gestures[0]?.[0];
        onFrame({
          category: top?.categoryName || "None",
          score: top?.score || 0,
          timestampMs,
          landmarks: result.landmarks[0] || null,
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [ready, active, videoRef, onFrame]);

  return { ready, error };
}
