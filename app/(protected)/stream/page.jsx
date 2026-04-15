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
        console.error("loadMatches error", e);
      }
    }

    loadMatches();

    return () => stopCamera();
  }, []);

  // ---------------- LIVE MATCH POLLING ----------------
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
        console.error("match polling error", e);
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

  // ---------------- RECORDING ----------------
  function startRecording() {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setRecordingSize(0);

    const mimeType = MediaRecorder.isTypeSupported("video/mp4")
      ? "video/mp4"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });

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

  function stopAndDownload() {
    stopRecording();

    setTimeout(() => {
      if (!chunksRef.current.length) return;

      const isMp4 = chunksRef.current[0]?.type?.includes("mp4");

      const blob = new Blob(chunksRef.current, {
        type: isMp4 ? "video/mp4" : "video/webm",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download =
        "match-" +
        (activeMatch?._id || Date.now()) +
        (isMp4 ? ".mp4" : ".webm");

      a.click();
      URL.revokeObjectURL(url);
    }, 500);
  }

  const mbRecorded = (recordingSize / 1024 / 1024).toFixed(1);

  // ---------------- UI ----------------
  return (
    <div className="max-w-2xl px-4 py-6 mx-auto">
      <h1 className="mb-2 text-2xl font-bold">Enregistrement vidéo</h1>
      <p className="mb-6 text-sm text-gray-400">
        Score live synchronisé depuis la montre
      </p>

      {matches.length > 1 && (
        <select
          className="w-full px-4 mb-4 border h-11 rounded-xl"
          value={activeMatch?._id || ""}
          onChange={(e) =>
            setActiveMatch(matches.find((m) => m._id === e.target.value))
          }
        >
          {matches.map((m) => (
            <option key={m._id} value={m._id}>
              {m.player_name} vs {m.opponent_name}
            </option>
          ))}
        </select>
      )}

      {/* VIDEO */}
      <div className="relative mb-4 overflow-hidden bg-black rounded-2xl aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="object-cover w-full h-full"
        />

        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
            <Video className="w-12 h-12 mb-2" />
            <p className="text-sm">Démarrer la caméra</p>
          </div>
        )}

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

        {isRecording && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-bold text-white">
              REC {mbRecorded} MB
            </span>
          </div>
        )}
      </div>

      {/* BUTTONS */}
      <div className="flex gap-3 mb-4">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            className="flex items-center justify-center flex-1 h-12 gap-2 font-semibold text-white bg-green-600 rounded-xl"
          >
            <Video className="w-5 h-5" />
            Démarrer
          </button>
        ) : (
          <>
            <button
              onClick={stopCamera}
              className="flex items-center justify-center flex-1 h-12 gap-2 font-semibold text-white bg-red-600 rounded-xl"
            >
              <VideoOff className="w-5 h-5" />
              Stop
            </button>

            <button
              onClick={() => {
                stopCamera();
                setTimeout(startCamera, 300);
              }}
              className="h-12 px-4 border rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* RECORD */}
      {isStreaming && (
        <div className="p-4 bg-white border rounded-2xl">
          <p className="mb-1 text-sm font-semibold">Enregistrement local</p>

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-5 text-red-600 border border-red-300 h-11 rounded-xl"
            >
              <Circle className="w-4 h-4" />
              Start REC
            </button>
          ) : (
            <button
              onClick={stopAndDownload}
              className="flex items-center gap-2 px-5 text-white bg-red-600 h-11 rounded-xl"
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
