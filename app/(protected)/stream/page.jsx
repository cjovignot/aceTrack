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

    let last = performance.now();

    const draw = (t) => {

      const delta = t - last;

      last = t;

      if (!video || !canvas) return;

      if (video.videoWidth === 0) {

        animationRef.current = requestAnimationFrame(draw);

        return;

      }

      if (canvas.width !== video.videoWidth) {

        canvas.width = video.videoWidth;

        canvas.height = video.videoHeight;

      }

      // 1. VIDEO

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. léger overlay cinematic (optionnel mais propre)

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

      gradient.addColorStop(0, "rgba(0,0,0,0.10)");

      gradient.addColorStop(1, "rgba(0,0,0,0.05)");

      ctx.fillStyle = gradient;

      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. SCOREBOARD (SCALED PROPERLY)

      if (activeMatch?.score) {

        ctx.save();

        const baseWidth = 1280;

        const scale = canvas.width / baseWidth;

        ctx.scale(scale, scale);

        drawScoreboard(ctx, activeMatch);

        ctx.restore();

      }

      animationRef.current = requestAnimationFrame(draw);

    };

    animationRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationRef.current);

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

  // ---------------- LIVE POLLING ----------------

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

      await api.patch(`/api/matches/${activeMatch._id}`, {

        is_streaming: true,

      }).catch(() => {});

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

    // background

    ctx.fillStyle = "rgba(0,0,0,0.75)";

    ctx.fillRect(x, y, width, height);

    // grid

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

    // header

    ctx.fillStyle = "rgba(255,255,255,0.4)";

    ctx.font = "8px Arial";

    ctx.fillText("JOUEUR", x + 4, y + 11);

    for (let i = 0; i < sets; i++) {

      ctx.fillText("S" + (i + 1), x + colName + i * colSet + 4, y + 11);

    }

    ctx.fillText("PTS", x + colName + sets * colSet + 4, y + 11);

    const rows = [

      ["player", match.player_name, sP, score.current_game_player],

      ["opponent", match.opponent_name, sO, score.current_game_opponent],

    ];

    rows.forEach(([who, name, sets_arr, pts], ri) => {

      const yRow = y + headerH + rowH * ri;

      if (score.serving === who) {

        ctx.fillStyle = "#facc15";

        ctx.beginPath();

        ctx.arc(x + 6, yRow + 11, 3, 0, Math.PI * 2);

        ctx.fill();

      }

      ctx.fillStyle = "#fff";

      ctx.font = "10px Arial";

      ctx.fillText(formatName(name), x + 12, yRow + 14);

      for (let i = 0; i < sets; i++) {

        const val = sets_arr[i] ?? "";

        const opp = who === "player" ? sO[i] : sP[i];

        const isWinner = (val || 0) > (opp || 0);

        ctx.fillStyle = isWinner ? "#facc15" : "rgba(255,255,255,0.7)";

        ctx.font = "bold 12px Arial";

        ctx.fillText(val, x + colName + i * colSet + 6, yRow + 14);

      }

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

    const stream = canvasRef.current.captureStream(60);

    const mimeType = MediaRecorder.isTypeSupported("video/mp4")

      ? "video/mp4"

      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });

    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {

      if (e.data.size > 0) {

        chunksRef.current.push(e.data);

        setRecordingSize((s) => s + e.data.size);

      }

    };

    recorder.start(1000);

    setIsRecording(true);

  }

  function stopRecording() {

    recorderRef.current?.stop();

    recorderRef.current = null;

    setIsRecording(false);

  }

  const mbRecorded = (recordingSize / 1024 / 1024).toFixed(1);

  // ---------------- UI ----------------

  return (

    <div className="max-w-2xl px-4 py-6 mx-auto">

      <h1 className="mb-2 text-2xl font-bold">Enregistrement vidéo</h1>

      <div className="relative mb-4 overflow-hidden bg-black rounded-2xl aspect-video">

        <video

          ref={videoRef}

          autoPlay

          playsInline

          muted

          className="hidden"

        />

        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {!isStreaming && (

          <div className="absolute inset-0 flex items-center justify-center text-white/40">

            <Video className="w-12 h-12" />

          </div>

        )}

      </div>

      <div className="flex gap-3">

        {!isStreaming ? (

          <button onClick={startCamera} className="flex-1 h-12 bg-green-600 text-white rounded-xl">

            Démarrer

          </button>

        ) : (

          <button onClick={stopCamera} className="flex-1 h-12 bg-red-600 text-white rounded-xl">

            Stop

          </button>

        )}

      </div>

      {isStreaming && (

        <div className="mt-4">

          {!isRecording ? (

            <button onClick={startRecording} className="text-red-600">

              Start REC

            </button>

          ) : (

            <button onClick={stopRecording} className="text-red-600">

              Stop REC ({mbRecorded} MB)

            </button>

          )}

        </div>

      )}

    </div>

  );

}