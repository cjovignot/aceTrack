"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import ScoreBoard from "../../../components/ScoreBoard";
import { Circle, Square, Video, VideoOff } from "lucide-react";

export default function StreamPage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSize, setRecordingSize] = useState(0);

  const [activeMatch, setActiveMatch] = useState(null);

  const params = useSearchParams();
  const matchId = params.get("matchId");

  // ---------------- CANVAS FULLSCREEN ----------------
  useEffect(() => {
    if (!isStreaming) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    const isSafari = !("requestVideoFrameCallback" in HTMLVideoElement.prototype);

    const draw = () => {
      if (!video || !canvas) return;

      if (video.videoWidth === 0) {
        loop();
        return;
      }

      // 🔥 plein écran paysage
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width;
      canvas.height = height;

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      const videoRatio = vw / vh;
      const screenRatio = width / height;

      let sx, sy, sw, sh;

      if (videoRatio > screenRatio) {
        sh = vh;
        sw = vh * screenRatio;
        sx = (vw - sw) / 2;
        sy = 0;
      } else {
        sw = vw;
        sh = vw / screenRatio;
        sx = 0;
        sy = (vh - sh) / 2;
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

      // overlay léger
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(0,0,0,0.2)");
      gradient.addColorStop(1, "rgba(0,0,0,0.1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // scoreboard
      if (activeMatch?.score) {
        ctx.save();
        const scale = width / 1280;
        ctx.scale(scale, scale);
        drawScoreboard(ctx, activeMatch);
        ctx.restore();
      }

      loop();
    };

    const loop = () => {
      if (isSafari) {
        requestAnimationFrame(draw);
      } else {
        video.requestVideoFrameCallback(draw);
      }
    };

    loop();
  }, [isStreaming, activeMatch]);

  // ---------------- CAMERA ----------------
  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: true,
    });

    streamRef.current = stream;

    videoRef.current.srcObject = stream;
    setIsStreaming(true);
  }

  function stopCamera() {
    stopRecording();

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    videoRef.current.srcObject = null;
    setIsStreaming(false);
  }

  // ---------------- RECORDING ----------------
  function startRecording() {
    if (!canvasRef.current || !streamRef.current) return;

    chunksRef.current = [];
    setRecordingSize(0);

    const canvasStream = canvasRef.current.captureStream(30);
    const audioTracks = streamRef.current.getAudioTracks();

    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
      videoBitsPerSecond: 5_000_000,
    });

    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
        setRecordingSize((s) => s + e.data.size);
      }
    };

    recorder.onstop = () => download();

    recorder.start(1000);
    setIsRecording(true);
  }

  function stopRecording() {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);
  }

  function download() {
    const blob = new Blob(chunksRef.current, {
      type: "video/webm",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recording.webm";
    a.click();

    URL.revokeObjectURL(url);
  }

  // ---------------- SCOREBOARD ----------------
  function drawScoreboard(ctx, match) {
    ctx.fillStyle = "black";
    ctx.fillRect(20, 20, 200, 60);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText(match.player_name || "Player", 30, 45);
    ctx.fillText(match.opponent_name || "Opponent", 30, 65);
  }

  // ---------------- UI ----------------
  return (
    <div className="fixed inset-0 bg-black">

      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* CONTROLS */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">

        {!isStreaming ? (
          <button
            onClick={startCamera}
            className="bg-green-600 text-white px-6 py-3 rounded-full"
          >
            <Video />
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="bg-red-600 text-white px-6 py-3 rounded-full"
          >
            <VideoOff />
          </button>
        )}

        {isStreaming && !isRecording && (
          <button
            onClick={startRecording}
            className="bg-white text-red-600 px-6 py-3 rounded-full"
          >
            <Circle />
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="bg-red-700 text-white px-6 py-3 rounded-full"
          >
            <Square />
          </button>
        )}
      </div>
    </div>
  );
}