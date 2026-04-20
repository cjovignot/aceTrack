"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import api from "../../../lib/api";

import ScoreBoard from "../../../components/ScoreBoard";

import {
  Video,
  VideoOff,
  Circle,
  Download,
  RefreshCw,
  Fullscreen,
  Stop,
  ArrowLeft,
} from "lucide-react";

export default function StreamPage() {
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get("matchId");

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const pollingRef = useRef(null);

  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const canvasRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSize, setRecordingSize] = useState(0);
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: landscape)");

    const update = () => {
      setIsLandscape(mediaQuery.matches);
    };

    update();

    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    function updateSize() {
      const viewportHeight = window.innerHeight;

      // hauteur des boutons (approx ou mesurée)
      const controlsHeight = 10;

      // safe area iOS
      const safeArea =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "env(safe-area-inset-bottom)",
          ),
        ) || 0;

      const available = viewportHeight - controlsHeight - safeArea;

      setCanvasHeight(available);
    }

    updateSize();
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleLoaded = () => {
      console.log("VIDEO READY", video.videoWidth, video.videoHeight);
    };

    video.addEventListener("loadedmetadata", handleLoaded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const isPortrait = window.innerHeight > window.innerWidth;

      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  const getPairingToken = () => {
    if (typeof window === "undefined") return null;

    return localStorage.getItem("pairing_token");
  };

  // ---------------- CANVAS ----------------

  useEffect(() => {
    if (!isStreaming || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    let animationId;

    const FPS = 30;
    const interval = 1000 / FPS;
    let lastDraw = 0;

    let crop = null;

    // 🎨 overlay cache
    const overlayCanvas = document.createElement("canvas");
    const overlayCtx = overlayCanvas.getContext("2d");

    function updateOverlay(match) {
      overlayCanvas.width = 1280;
      overlayCanvas.height = 720;

      overlayCtx.clearRect(0, 0, 1280, 720);

      if (match?.score) {
        drawScoreboard(overlayCtx, match);
      }
    }

    // 🔁 update au changement de match
    updateOverlay(activeMatch);

    function computeCrop() {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      const canvasRatio = 16 / 9;
      const videoRatio = vw / vh;

      if (videoRatio > canvasRatio) {
        const sh = vh;
        const sw = vh * canvasRatio;
        return { sx: (vw - sw) / 2, sy: 0, sw, sh };
      } else {
        const sw = vw;
        const sh = vw / canvasRatio;
        return { sx: 0, sy: (vh - sh) / 2, sw, sh };
      }
    }

    // 🌈 gradient cache
    let gradient = null;
    function initGradient() {
      gradient = ctx.createLinearGradient(0, 0, 0, 720);
      gradient.addColorStop(0, "rgba(0,0,0,0.12)");
      gradient.addColorStop(1, "rgba(0,0,0,0.05)");
    }

    function renderFrame() {
      if (video.videoWidth === 0) return;

      const targetWidth = 1280;
      const targetHeight = 720;

      if (canvas.width !== targetWidth) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        initGradient();
      }

      if (!crop) {
        crop = computeCrop();
      }

      // 🎥 VIDEO
      ctx.drawImage(
        video,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        targetWidth,
        targetHeight,
      );

      // 🌈 gradient
      if (gradient) {
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 🎨 overlay (score)
      ctx.drawImage(overlayCanvas, 0, 0);
    }

    const useRAF =
      !video.requestVideoFrameCallback ||
      typeof video.requestVideoFrameCallback !== "function";

    function draw(now) {
      if (now - lastDraw < interval) {
        loop();
        return;
      }

      lastDraw = now;

      renderFrame();
      loop();
    }

    function loop() {
      if (useRAF) {
        animationId = requestAnimationFrame(draw);
      } else {
        video.requestVideoFrameCallback(draw);
      }
    }

    // 🔥 attendre vidéo prête
    if (video.readyState < 2) {
      video.onloadeddata = () => {
        loop();
      };
    } else {
      loop();
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
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
    if (screen.orientation?.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }

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
      await videoRef.current.play();
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
    const scale = 1.5;

    ctx.save();
    ctx.scale(scale, scale);

    const score = match.score || {};

    const sP = score.sets_player || [];
    const sO = score.sets_opponent || [];
    const sets = Math.max(sP.length, sO.length);

    const x = 20 / scale;
    const y = 20 / scale;

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

    ctx.restore();
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
    if (!canvasRef.current || !streamRef.current) return;

    chunksRef.current = [];
    setRecordingSize(0);

    const fps = 60;

    // 🎥 VIDEO (canvas)
    const canvasStream = canvasRef.current.captureStream(fps);

    // 🎤 AUDIO (micro)
    const audioTracks = streamRef.current.getAudioTracks();

    // 🔗 MERGE VIDEO + AUDIO
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    let mimeType = "";

    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      mimeType = "video/webm;codecs=vp9,opus";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
      mimeType = "video/webm;codecs=vp8,opus";
    } else {
      mimeType = "video/webm";
    }

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
      audioBitsPerSecond: 128_000,
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
    <div className="w-full h-full text-white bg-black">
      <div className="flex flex-col h-screen md:flex-row">
        {/* 🎥 VIDEO */}
        <div
          ref={containerRef}
          className="relative bg-black"
          style={{
            height: isPortraitMobile ? canvasHeight : "100%",
          }}
        >
          {" "}
          <video ref={videoRef} autoPlay playsInline muted className="hidden" />
          <canvas
            ref={canvasRef}
            className="object-contain w-full h-full bg-black"
          />
          <button
            onClick={() => router.push("/dashboard")}
            className="absolute z-20 flex items-center justify-center w-10 h-10 text-gray-600 rounded-full top-4 left-4 bg-black/50 backdrop-blur"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {!isLandscape && isStreaming && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
              <p className="text-lg text-center">
                Tournez votre téléphone en paysage 📱
              </p>
            </div>
          )}
          {/* 🎛️ OVERLAY CONTROLS (mobile style) */}
          <div className="absolute left-0 right-0 flex justify-center gap-3 bottom-4 md:hidden">
            {!isStreaming ? (
              <button
                onClick={startCamera}
                className="flex items-center justify-center h-10 px-5 py-4 bg-green-600 rounded-full shadow-lg text-md"
              >
                Démarrer
              </button>
            ) : (
              <>
                <button
                  onClick={stopCamera}
                  className="flex items-center justify-center h-10 px-5 py-4 bg-red-600 rounded-full shadow-lg text-md"
                >
                  Stop
                </button>

                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center justify-center h-10 px-5 py-4 text-red-600 bg-white rounded-full shadow-lg text-md"
                  >
                    ● REC
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-red-600 rounded-full shadow-lg"
                  >
                    Stop REC
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 🖥️ DESKTOP PANEL */}
        <div className="flex-col hidden gap-4 p-4 border-l md:flex w-80 bg-zinc-900 border-zinc-800">
          <h2 className="text-lg font-semibold">Contrôles</h2>

          {!isStreaming ? (
            <button
              onClick={startCamera}
              className="w-full h-12 bg-green-700 rounded-xl"
            >
              ▶ Démarrer
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="w-full h-12 bg-red-600 rounded-xl"
            >
              ■ Stop
            </button>
          )}

          {isStreaming && (
            <>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-full h-12 text-red-400 border border-red-400 rounded-xl"
                >
                  ● Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full h-12 bg-red-600 rounded-xl"
                >
                  ⬇ Download ({mbRecorded} MB)
                </button>
              )}
            </>
          )}

          {/* Infos */}
          <div className="mt-4 text-sm text-zinc-400">
            <p>Match: {activeMatch?.player_name || "-"}</p>
            <p>Status: {isStreaming ? "Live" : "Off"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
