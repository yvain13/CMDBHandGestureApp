import React, { useEffect, useRef, useState } from "react";
import "./CameraPreview.css";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: { x: number; y: number; z: number }[] | null;
  onStarted: () => void;
}

export default function CameraPreview({ videoRef, landmarks, onStarted }: CameraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStarted(true);
      onStarted();
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;
    ctx.fillStyle = "#00D4FF";
    landmarks.forEach((point) => {
      const x = (1 - point.x) * canvas.width;
      const y = point.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [landmarks, videoRef]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="camera-preview">
      {!started && (
        <button className="camera-preview__start" onClick={startCamera}>
          Enable Camera
        </button>
      )}
      {error && <div className="camera-preview__error">{error}</div>}
      <video ref={videoRef} className="camera-preview__video" muted playsInline />
      <canvas ref={canvasRef} className="camera-preview__overlay" />
    </div>
  );
}
