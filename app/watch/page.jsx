"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { addPoint } from "@/lib/tennisScoring";
import { IterationCw, Trophy } from "lucide-react";

// ---------- Utils ----------
function gameScoreToNum(s) {
  if (!s || s === "0") return 0;
  if (s === "15") return 1;
  if (s === "30") return 2;
  if (s === "40") return 3;
  if (s === "AD") return 4;
  return parseInt(s) || 0;
}

function normalizeShotType(type) {
  if (!type) return "winner";

  const t = type.toLowerCase();

  if (t.includes("ace")) return "ace";
  if (t.includes("double_fault")) return "double_fault";
  if (t.includes("unforced_error")) return "unforced_error";
  if (t.includes("coup") || t.includes("winner")) return "winner";

  return "winner";
}

function getServeSide(score) {
  if (!score) return "deuce";
  const p = gameScoreToNum(score.current_game_player);
  const o = gameScoreToNum(score.current_game_opponent);
  return (p + o) % 2 === 0 ? "deuce" : "ad";
}

export default function WatchPage() {
  const searchParams = useSearchParams();

  const lastUpdateRef = useRef(0);
  const historyRef = useRef([]);
  const undoLockRef = useRef(false);

  const [match, setMatch] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const [serviceFaults, setServiceFaults] = useState(0);
  const [lastPoint, setLastPoint] = useState(null);

  const [pairingToken, setPairingToken] = useState(null);

  const hasStarted = useRef(false);
  const pairingIntervalRef = useRef(null);
  const matchIntervalRef = useRef(null);

  const queueRef = useRef([]);
  const sendingRef = useRef(false);

  // ✅ FIX WATCH (viewport + scale)
  useEffect(() => {
    const meta = document.querySelector("meta[name=viewport]");
    const previous = meta?.getAttribute("content");

    if (meta) {
      meta.setAttribute(
        "content",
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
      );
    }

    document.body.style.transform = "scale(1)";
    document.body.style.transformOrigin = "top left";

    return () => {
      if (meta && previous) meta.setAttribute("content", previous);
      document.body.style.transform = "";
    };
  }, []);

  // ---------- INIT ----------
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    createPairing();
  }, []);

  // ---------- LOAD MATCH ----------
  useEffect(() => {
    if (!matchId) return;

    async function loadMatch() {
      const res = await fetch(`/api/matches/${matchId}`, {
        headers: {
          "Content-Type": "application/json",
          "x-pairing-token": pairingToken,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMatch(data);
        startMatchPolling(data._id);
      }
    }

    loadMatch();
  }, [matchId]);

  // ---------- PAIRING ----------
  async function createPairing() {
    if (pairingToken) return;

    const res = await fetch("/api/pairing/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": pairingToken,
      },
    });

    if (!res.ok) return;

    const data = await res.json();
    if (!data.token) return;

    setPairingToken(data.token);
    startPairingPolling(data.token);
  }

  function startPairingPolling(token) {
    if (pairingIntervalRef.current) return;

    pairingIntervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/pairing/${token}`, {
        headers: {
          "Content-Type": "application/json",
          "x-pairing-token": pairingToken,
        },
      });

      if (!res.ok) return;

      const data = await res.json();

      if (data.connected && data.match_id) {
        setIsConnected(true);
        setMatchId(data.match_id);

        clearInterval(pairingIntervalRef.current);
        pairingIntervalRef.current = null;
      }
    }, 1500);
  }

  function startMatchPolling(id) {
    if (matchIntervalRef.current) return;

    matchIntervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/matches/${id}`, {
        headers: {
          "Content-Type": "application/json",
          "x-pairing-token": pairingToken,
        },
      });

      if (!res.ok) return;

      const updated = await res.json();

      const serverTime = new Date(updated.updatedAt || 0).getTime();

      if (serverTime < lastUpdateRef.current) return;

      setMatch(updated);
    }, 3000);
  }

  // ---------- BLOCK FINISHED ----------
  const isFinished = match?.status === "Terminé";

  const winnerLabel =
    match?.winner === "player"
      ? match.player_name
      : match?.winner === "opponent"
        ? match.opponent_name
        : null;

  // ---------- QUEUE ----------
  async function flushQueue() {
    if (sendingRef.current) return;
    if (queueRef.current.length === 0) return;
    if (match?.status === "Terminé") return;

    sendingRef.current = true;

    const item = queueRef.current.shift();

    try {
      await fetch("/api/points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pairing-token": pairingToken,
        },
        body: JSON.stringify(item),
      });
    } catch (e) {
      queueRef.current.unshift(item);
    }

    sendingRef.current = false;
    setTimeout(flushQueue, 0);
  }

  // ---------- SCORE ----------
  function scorePoint(winner, shotType = "winner", isWinner = true) {
    if (!match || match.status === "Terminé") return;

    setServiceFaults(0);

    const previousScore = JSON.parse(JSON.stringify(match.score));
    const result = addPoint(match.score, winner);

    const clientId = Date.now() + "_" + Math.random();

    historyRef.current.push({
      matchSnapshot: JSON.parse(JSON.stringify(match)),
      client_id: clientId,
    });

    const optimisticUpdate = {
      ...match,
      score: result.score,
      updatedAt: new Date().toISOString(),
      ...(result.matchWon
        ? { status: "Terminé", winner: result.matchWinner }
        : {}),
    };

    lastUpdateRef.current = Date.now();
    setMatch(optimisticUpdate);

    const normalizedType = normalizeShotType(shotType);

    queueRef.current.push({
      client_id: clientId,
      pairingToken,
      match_id: match._id,
      point_winner: winner,
      shot_type: normalizedType,
      isWinner: normalizedType === "winner" || normalizedType === "ace",
      timestamp: new Date(),
      score_at_point: JSON.stringify(previousScore),
    });

    flushQueue();

    fetch(`/api/matches/${match._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": pairingToken,
      },
      body: JSON.stringify(optimisticUpdate),
    }).catch(() => {});

    setLastPoint(winner);
    setTimeout(() => setLastPoint(null), 150);
  }

  // ---------- UNDO ----------
  async function handleUndo() {
    if (undoLockRef.current) return;
    if (match?.status === "Terminé") return;

    undoLockRef.current = true;
    setTimeout(() => (undoLockRef.current = false), 200);

    if (!match) return;

    const last = historyRef.current.pop();
    if (!last) return;

    const optimistic = {
      ...last.matchSnapshot,
      updatedAt: new Date().toISOString(),
    };

    lastUpdateRef.current = Date.now();
    setMatch(optimistic);

    const index = queueRef.current.findIndex(
      (p) => p.client_id === last.client_id,
    );

    if (index !== -1) {
      queueRef.current.splice(index, 1);
    } else {
      try {
        const res = await fetch(`/api/points?match_id=${match._id}`, {
          headers: {
            "Content-Type": "application/json",
            "x-pairing-token": pairingToken,
          },
        });

        const points = await res.json();

        if (!Array.isArray(points) || points.length === 0) return;

        const validPoints = points
          .filter((p) => !p.is_deleted)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const lastPoint = validPoints[0];

        if (!lastPoint) return;

        await fetch(`/api/points/${lastPoint._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-pairing-token": pairingToken,
          },
          body: JSON.stringify({
            is_deleted: true,
          }),
        });
      } catch (e) {
        console.error("Undo delete failed", e);
      }
    }

    fetch(`/api/matches/${match._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": pairingToken,
      },
      body: JSON.stringify(optimistic),
    }).catch(() => {});
  }

  function handleServiceFault() {
    if (!match || match.status === "Terminé") return;

    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const receiver =
        match.score.serving === "player" ? "opponent" : "player";
      scorePoint(receiver, "double_fault", false);
    }
  }

  // ---------- DERIVED ----------
  const score = match?.score || {};
  const setsP = score.sets_player || [];
  const setsO = score.sets_opponent || [];
  const serving = score.serving;
  const serveSide = getServeSide(score);

  const cellBtn = (bg, active = false) => ({
    background: active ? bg : "transparent",
    color: active ? "#dad11f" : bg,
    border: "solid 1px",
    borderColor: bg,
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    userSelect: "none",
  });

  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr 1fr 1fr",
        gap: 3,
        padding: 3,
        touchAction: "manipulation",
      }}
    >
      {/* QR CONNECT */}
      {!isConnected && pairingToken && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 9999,
            background: "#000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "end",
            gap: 8,
          }}
        >
          <div className="p-3 border border-green-400 rounded-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                `${window.location.origin}/connect?token=${pairingToken}`,
              )}`}
              width={210}
            />
          </div>

          <p className="w-3/4 text-xs text-center text-green-400">
            Scannez pour connecter la montre et saisir les scores
          </p>
        </div>
      )}

      {/* ===== TON UI ORIGINAL INCHANGÉ ===== */}

      <button
        onClick={() => scorePoint("player", "unforced_error", false)}
        className="!rounded-tl-4xl"
        style={cellBtn("#b32727")}
      >
        Faute
      </button>

      <button
        onClick={() => scorePoint("opponent", "winner", true)}
        style={cellBtn("#6296da")}
      >
        Gagnant
      </button>

      <div />

      {/* 🔥 SERVER INDICATOR RESTAURÉ */}
      <div
        style={{
          gridColumn: "1 / 3",
          gridRow: "2 / 4",
          background: "#0a0a0a",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          gap: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#facc15",
            ...(serving === "player"
              ? serveSide === "deuce"
                ? { bottom: 5, right: 5 }
                : { bottom: 5, left: 5 }
              : serveSide === "deuce"
                ? { top: 5, left: 5 }
                : { top: 5, right: 5 }),
          }}
        />

        <div style={{ fontSize: 22 }}>
          {setsO.map((s, i) => (
            <span
              key={i}
              style={{
                margin: 4,
                color: s > setsP[i] ? "#facc15" : "#fff",
              }}
            >
              {s}
            </span>
          ))}
          <span style={{ color: "#facc15", fontSize: 28 }}>
            {score.current_game_opponent || "0"}
          </span>
        </div>

        <div style={{ width: "70%", height: 1, background: "#222" }} />

        <div style={{ fontSize: 22 }}>
          {setsP.map((s, i) => (
            <span
              key={i}
              style={{
                margin: 4,
                color: s > setsO[i] ? "#facc15" : "#fff",
              }}
            >
              {s}
            </span>
          ))}
          <span style={{ color: "#facc15", fontSize: 28 }}>
            {score.current_game_player || "0"}
          </span>
        </div>
      </div>

      <button
        onClick={handleServiceFault}
        style={serviceFaults > 0 ? cellBtn("#ed640f") : cellBtn("#ec9720")}
      >
        {serviceFaults > 0 ? "Double Faute" : "Faute service"}
      </button>

      <button
        onClick={() => scorePoint(serving, "ace", true)}
        style={cellBtn("#e2e629")}
      >
        Ace
      </button>

      <button
        onClick={() => scorePoint("opponent", "unforced_error", false)}
        className="!rounded-bl-4xl"
        style={cellBtn("#b32727")}
      >
        Faute
      </button>

      <button
        onClick={() => scorePoint("player", "winner", true)}
        style={cellBtn("#269351")}
      >
        Gagnant
      </button>

      <button
        className="!rounded-br-4xl"
        onClick={handleUndo}
        style={cellBtn("#afc7f5")}
      >
        <IterationCw size={40} />
      </button>

      {isFinished && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-3 py-6 bg-black/80 backdrop-blur-md">
          <div className="flex flex-col items-center justify-around w-full h-full py-5 m-3 text-center border shadow-2xl px-7 rounded-4xl bg-white/10 border-white/20 animate-fadeIn">
            <div className="grid gap-10">
              <h1 className="text-xl font-bold tracking-wide text-yellow-400 uppercase">
                Match terminé
              </h1>
              <div className="grid gap-3">
                <p className="text-7xl">🏆</p>
                <h2 className="text-lg font-semibold text-gray-300">
                  {winnerLabel && winnerLabel}
                </h2>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}