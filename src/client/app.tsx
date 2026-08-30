// src/client/app.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGraphData } from "./data/useGraphData";
import { useGestureStateMachine } from "./gesture/useGestureStateMachine";
import { useGestureRecognizer, RecognizedFrame } from "./gesture/useGestureRecognizer";
import { GraphScene } from "./scene/GraphScene";
import { Command } from "./gesture/stateMachine";
import CameraPreview from "./components/CameraPreview";
import ArmingIndicator from "./components/ArmingIndicator";
import DetailCard from "./components/DetailCard";
import "./app.css";

const GESTURE_CONFIG = { confidenceThreshold: 0.7, holdFrames: 6, cooldownMs: 600 };

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<GraphScene | null>(null);
  const [landmarks, setLandmarks] = useState<RecognizedFrame["landmarks"]>(null);
  const { graph, selectedCI, error, usingSampleData, loadGraph, selectCI, reset } = useGraphData();
  const { state, dispatchFrame } = useGestureStateMachine(GESTURE_CONFIG);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    sceneRef.current = new GraphScene(canvasContainerRef.current);
    loadGraph();
    return () => sceneRef.current?.dispose();
  }, [loadGraph]);

  useEffect(() => {
    if (!graph) return;
    // GraphScene's GraphNode uses camelCase incidentCount; the API returns snake_case.
    const sceneNodes = graph.nodes.map((n) => ({ id: n.id, health: n.health, incidentCount: n.incident_count }));
    sceneRef.current?.setGraph(sceneNodes, graph.edges);
  }, [graph]);

  useEffect(() => {
    sceneRef.current?.setSelected(selectedCI?.id || null);
  }, [selectedCI]);

  const handleCommand = useCallback(
    (command: Command, frameLandmarks: RecognizedFrame["landmarks"]) => {
      if (command === "SELECT" && frameLandmarks && sceneRef.current) {
        const tip = frameLandmarks[8];
        const ndcX = (1 - tip.x) * 2 - 1;
        const ndcY = -(tip.y * 2 - 1);
        const nodeId = sceneRef.current.raycastFromNdc(ndcX, ndcY);
        if (nodeId) selectCI(nodeId);
      } else if (command === "EXPAND" && selectedCI) {
        loadGraph(selectedCI.id, 2);
      } else if (command === "RESET") {
        reset();
      }
    },
    [selectCI, selectedCI, loadGraph, reset]
  );

  const handleFrame = useCallback(
    (frame: RecognizedFrame) => {
      setLandmarks(frame.landmarks);
      const command = dispatchFrame({ category: frame.category, score: frame.score, timestampMs: frame.timestampMs });
      if (command) handleCommand(command, frame.landmarks);
    },
    [dispatchFrame, handleCommand]
  );

  const { ready, error: recognizerError } = useGestureRecognizer(videoRef, handleFrame, true);
  const rootNode = graph?.nodes.find((n) => n.id === graph.root);

  // Mouse fallback (design doc §9 NFR: full mouse control if camera is denied/unavailable).
  // Click-to-select mirrors the SELECT gesture; Reset/Expand buttons mirror RESET/EXPAND.
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!sceneRef.current || !canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const nodeId = sceneRef.current.raycastFromNdc(ndcX, ndcY);
      if (nodeId) selectCI(nodeId);
    },
    [selectCI]
  );
  const handleExpandClick = useCallback(() => {
    if (selectedCI) loadGraph(selectedCI.id, 2);
  }, [selectedCI, loadGraph]);

  return (
    <div className="app">
      <div className="app__header">
        <span>{rootNode ? rootNode.name : "Loading..."}</span>
        <span>depth: 2</span>
        <span>
          {recognizerError
            ? `⚠ recognizer failed: ${recognizerError}`
            : ready
              ? "● recognizer ready"
              : "○ loading recognizer"}
        </span>
        <button className="app__reset" onClick={reset}>
          Reset (mouse fallback for Closed_Fist)
        </button>
      </div>
      {error && <div className={usingSampleData ? "app__notice" : "app__error"}>{error}</div>}
      <div ref={canvasContainerRef} className="app__canvas" onClick={handleCanvasClick} />
      {landmarks && landmarks[8] && (
        <div
          className="app__crosshair"
          style={{ left: `${(1 - landmarks[8].x) * 100}%`, top: `${landmarks[8].y * 100}%` }}
        />
      )}
      <div className="app__detail">
        <DetailCard ci={selectedCI} onExpand={handleExpandClick} />
      </div>
      <div className="app__webcam">
        <CameraPreview videoRef={videoRef} landmarks={landmarks} onStarted={() => {}} />
        <ArmingIndicator
          phase={state.phase}
          progress={state.candidateFrames / GESTURE_CONFIG.holdFrames}
          gestureLabel={state.candidateGesture}
        />
        <p className="app__privacy-note">
          Webcam video is processed on-device and never transmitted anywhere. The gesture-recognition
          engine and model file are fetched from Google's CDN on first load.
        </p>
      </div>
    </div>
  );
}
