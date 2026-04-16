"use client";

import { useState, useRef, useEffect } from "react";

import { useSearchParams } from "next/navigation";

import api from "../../../lib/api";

import ScoreBoard from "../../../components/ScoreBoard";

import { Video, VideoOff, Circle, Download, RefreshCw } from "lucide-react";

export default function StreamPage() {

  const videoRef = useRef(null);

  const streamRef = useRef(null);

  const recorderRef = useRef(null);

  const chunksRef = useRef([]);

  const canvasRef = useRef(null);

  const animationRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);

  const [isRecording, setIsRecording] = useState(false);

  const [recordingSize, setRecordingSize] = useState(0);

  const [matches, setMatches] = useState([]);

  const [activeMatch, setActiveMatch] = useState(null);

  const params = useSearchParams();

  const matchId = params.get("matchId");

  const pollingRef = useRef(null);

  const getPairingToken = () => {

    if (typeof window === "undefined") return null;

    return localStorage.getItem("pairing_token");

  };

  // ---------------- CANVAS ----------------

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

    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // VIDEO
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // OVERLAY
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(0,0,0,0.12)");
    gradient.addColorStop(1, "rgba(0,0,0,0.05)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // SCOREBOARD
    if (activeMatch?.score) {
      ctx.save();
      const scale = canvas.width / 1280;
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

  return () => {};
}, [isStreaming, activeMatch]);


  // ---------------- LOAD MATCHES ----------------

  useEffect(() => {

    async function loadMatches() {

      try {

        const res = await api.get("/api/matches?status=En%20cours");

        setMatches(res.data);

        const m = matchId

          ? res.data.find((x) => x._id === matchId)

          : res.data[0];

        if (m) setActiveMatch(m);

      } catch (e) {

        console.error(e);

      }

    }

    loadMatches();

    return () => stopCamera();

  }, []);

  // ---------------- POLLING ----------------

  useEffect(() => {

    if (!activeMatch || !isStreaming) return;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {

      try {

        const token = getPairingToken();

        const res = await api.get(

          `/api/matches/${activeMatch._id}?t=${Date.now()}`,

          {

            headers: token ? { "x-pairing-token": token } : {},

          },

        );

        setActiveMatch(res.data);

      } catch (e) {

        console.error(e);

      }

    }, 1500);

    return () => clearInterval(pollingRef.current);

  }, [activeMatch?._id, isStreaming]);

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

    if (videoRef.current) {

      videoRef.current.srcObject = stream;

    }

    setIsStreaming(true);

    if (activeMatch) {

      try {

        await api.patch(`/api/matches/${activeMatch._id}`, {

          is_streaming: true,

        });

      } catch (e) {}

    }

  }

  function stopCamera() {

    stopRecording();

    streamRef.current?.getTracks().forEach((t) => t.stop());

    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setIsStreaming(false);

    if (pollingRef.current) {

      clearInterval(pollingRef.current);

      pollingRef.current = null;

    }

  }

  // ---------------- SCOREBOARD ----------------

  function drawScoreboard(ctx, match) {
  const score = match.score || {};

  const sP = score.sets_player || [];
  const sO = score.sets_opponent || [];
  const sets = Math.max(sP.length, sO.length);

  const x = 20;
  const y = 20;

  const colName = 90;
  const colSet = 20;
  const colPts = 28;

  const rowH = 22;
  const headerH = 16;

  const width = colName + sets * colSet + colPts;
  const height = headerH + rowH * 2;

  // -------- BG --------
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(x, y, width, height);

  // -------- GRID --------
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x, y + headerH);
  ctx.lineTo(x + width, y + headerH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + headerH + rowH);
  ctx.lineTo(x + width, y + headerH + rowH);
  ctx.stroke();

  // -------- HEADER --------
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "8px Arial";

  ctx.fillText("JOUEUR", x + 4, y + 11);

  for (let i = 0; i < sets; i++) {
    ctx.fillText("S" + (i + 1), x + colName + i * colSet + 4, y + 11);
  }

  ctx.fillText("PTS", x + colName + sets * colSet + 4, y + 11);

  // -------- ROWS --------
  const rows = [
    ["player", match.player_name, sP, score.current_game_player],
    ["opponent", match.opponent_name, sO, score.current_game_opponent],
  ];

  rows.forEach(([who, name, sets_arr, pts], ri) => {
    const yRow = y + headerH + rowH * ri;

    // service dot
    if (score.serving === who) {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(x + 6, yRow + 11, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // name
    ctx.fillStyle = "#fff";
    ctx.font = "10px Arial";
    ctx.fillText(formatName(name), x + 12, yRow + 14);

    // sets
    for (let i = 0; i < sets; i++) {
      const val = sets_arr[i] ?? "";
      const opp = who === "player" ? sO[i] : sP[i];

      const isWinner = (val || 0) > (opp || 0);

      ctx.fillStyle = isWinner ? "#facc15" : "rgba(255,255,255,0.7)";
      ctx.font = "bold 12px Arial";

      ctx.fillText(val, x + colName + i * colSet + 6, yRow + 14);
    }

    // points
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 14px Arial";
    ctx.fillText(pts || "0", x + colName + sets * colSet + 6, yRow + 14);
  });
}

  function formatName(n) {

    if (!n) return "?";

    const parts = n.trim().split(" ");

    return parts.length === 1

      ? parts[0].toUpperCase()

      : parts[0][0].toUpperCase() +

          ". " +

          parts.slice(1).join(" ").toUpperCase();

  }

  // ---------------- RECORDING ----------------

  function startRecording() {
  if (!canvasRef.current) return;

  chunksRef.current = [];
  setRecordingSize(0);

  const stream = canvasRef.current.captureStream(30); // 🔥 30 FPS

  let mimeType = "";

  // Safari fallback
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    mimeType = "video/webm;codecs=vp9";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    mimeType = "video/webm";
  } else {
    mimeType = ""; // Safari fallback auto
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
  });

  recorderRef.current = recorder;

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunksRef.current.push(e.data);
      setRecordingSize((s) => s + e.data.size);
    }
  };

  recorder.onstop = () => {
    downloadRecording(mimeType);
  };

  recorder.start(1000);
  setIsRecording(true);
}

  function stopRecording() {
  if (recorderRef.current && isRecording) {
    recorderRef.current.stop();
    recorderRef.current = null;
  }
  setIsRecording(false);
}

function downloadRecording(mimeType) {
  if (!chunksRef.current.length) return;

  const blob = new Blob(chunksRef.current, {
    type: mimeType || "video/webm",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;

  // Safari n’aime pas mp4 ici
  a.download = `match-${activeMatch?._id || Date.now()}.webm`;

  a.click();

  URL.revokeObjectURL(url);
}

const mbRecorded = (recordingSize / 1024 / 1024).toFixed(1);

  // ---------------- UI ----------------

  return (

    <div className="max-w-2xl px-4 py-6 mx-auto">

      <div className="relative overflow-hidden bg-black rounded-2xl aspect-video">

        <video

          ref={videoRef}

          autoPlay

          playsInline

          muted

          className="hidden"

        />

        <canvas

          ref={canvasRef}

          className="w-full h-full object-cover"

        />

        {isStreaming && activeMatch && (

          <div className="absolute top-3 left-2 z-10 max-w-[55%]">

            <ScoreBoard

              score={activeMatch.score}

              playerName={activeMatch.player_name}

              opponentName={activeMatch.opponent_name}

              compact

            />

          </div>

        )}

      </div>

      <div className="flex gap-3 mt-4">

        {!isStreaming ? (

          <button

            onClick={startCamera}

            className="flex-1 h-12 bg-green-600 text-white rounded-xl"

          >

            Démarrer

          </button>

        ) : (

          <button

            onClick={stopCamera}

            className="flex-1 h-12 bg-red-600 text-white rounded-xl"

          >

            Stop

          </button>

        )}

      </div>
      
      {isStreaming && (
  <div className="mt-4 p-4 border rounded-2xl">
    {!isRecording ? (
      <button
        onClick={startRecording}
        className="flex items-center gap-2 px-5 h-11 text-red-600 border border-red-300 rounded-xl"
      >
        <Circle className="w-4 h-4" />
        Start REC
      </button>
    ) : (
      <button
        onClick={stopRecording}
        className="flex items-center gap-2 px-5 h-11 text-white bg-red-600 rounded-xl"
      >
        <Download className="w-4 h-4" />
        Stop & download ({mbRecorded} MB)
      </button>
    )}
  </div>
)}

    </div>

  );

}