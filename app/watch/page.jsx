"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { addPoint } from "@/lib/tennisScoring";

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
  if (t.includes("double")) return "double_fault";
  if (t.includes("faute")) return "unforced_error";
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

  // queue
  const queueRef = useRef([]);
  const sendingRef = useRef(false);

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

  // ---------- QUEUE ----------
  async function flushQueue() {
    if (sendingRef.current) return;
    if (queueRef.current.length === 0) return;

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
      // retry
      queueRef.current.unshift(item);
    }

    sendingRef.current = false;

    // 🔁 continuer sans bloquer UI
    setTimeout(flushQueue, 0);
  }

  // ---------- SCORE ----------
  function scorePoint(winner, shotType = "winner", isWinner = true) {
    if (!match) return;

    setServiceFaults(0);

    const previousScore = JSON.parse(JSON.stringify(match.score));
    const result = addPoint(match.score, winner);

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

    const normalizedType = normalizeShotType(shotType, winner);

    const clientId = Date.now() + "_" + Math.random();

    queueRef.current.push({
      client_id: clientId, // 🔥 IMPORTANT
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

    undoLockRef.current = true;
    setTimeout(() => (undoLockRef.current = false), 200);

    if (!match) return;

    const last = historyRef.current.pop();
    if (!last) return;

    // 🔥 restore UI instant
    const optimistic = {
      ...last.matchSnapshot,
      updatedAt: new Date().toISOString(),
    };

    lastUpdateRef.current = Date.now();
    setMatch(optimistic);

    // 🔥 enlever de la queue si pas encore envoyé
    const index = queueRef.current.findIndex(
      (p) => p.client_id === last.client_id,
    );

    if (index !== -1) {
      queueRef.current.splice(index, 1);
    } else {
      // 🔥 sinon soft delete en DB
      try {
        const res = await fetch(`/api/points?match_id=${match._id}`);
        const points = await res.json();

        if (points.length) {
          const lastPoint = points[0];

          await fetch(`/api/points/${lastPoint._id}`, {
            method: "PATCH", // 🔥 soft delete
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
      } catch (e) {
        console.error("Undo delete failed", e);
      }
    }

    // 🔥 sync match
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
    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const receiver = match.score.serving === "player" ? "opponent" : "player";
      scorePoint(receiver, "double_fault", false);
    }
  }

  // ---------- DERIVED ----------
  const score = match?.score || {};
  const setsP = score.sets_player || [];
  const setsO = score.sets_opponent || [];
  const serving = score.serving;
  const serveSide = getServeSide(score);
  const isFinished = match?.status === "Terminé";

  const cellBtn = (bg, active = false) => ({
    background: active ? "#facc15" : bg,
    color: active ? "#000" : "#fff",
    border: "none",
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
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr 1fr 1fr",
        gap: 3,
        padding: 3,
      }}
    >
      {!isConnected && pairingToken && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "end",
            gap: 10,
          }}
          className="p-2 pb-5 w-fit"
        >
          <p
            className="flex text-center w-fit"
            style={{ color: "#4ade80", fontSize: 14 }}
          >
            Scannez depuis votre l'app pour connecter votre montre
          </p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
              `${window.location.origin}/connect?token=${pairingToken}`,
            )}`}
            width={210}
          />
        </div>
      )}

      <button
        onClick={() => scorePoint("player", "unforced_error", false)}
        style={cellBtn("#4a1515")}
      >
        Faute
      </button>
      <button
        onClick={() => scorePoint("opponent", "winner", true)}
        style={cellBtn("#1e3a5f")}
      >
        Gagnant
      </button>
      <div />

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
        {/* Serve indicator */}
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

        {/* Opponent */}
        <div style={{ fontSize: 22 }}>
          {setsO.map((s, i) => (
            <span key={i} style={{ margin: 4 }}>
              {s}
            </span>
          ))}
          <span style={{ color: "#facc15", fontSize: 28 }}>
            {score.current_game_opponent || "0"}
          </span>
        </div>

        <div style={{ width: "70%", height: 1, background: "#222" }} />

        {/* Player */}
        <div style={{ fontSize: 22 }}>
          {setsP.map((s, i) => (
            <span key={i} style={{ margin: 4 }}>
              {s}
            </span>
          ))}
          <span style={{ color: "#facc15", fontSize: 28 }}>
            {score.current_game_player || "0"}
          </span>
        </div>
      </div>

      <button onClick={handleServiceFault} style={cellBtn("#2d1a00")}>
        Service
      </button>
      <button
        onClick={() => scorePoint(serving, "ace", true)}
        style={cellBtn("#1a1a2e")}
      >
        Ace
      </button>

      <button
        onClick={() => scorePoint("opponent", "unforced_error", false)}
        style={cellBtn("#4a1515")}
      >
        Faute
      </button>
      <button
        onClick={() => scorePoint("player", "winner", true)}
        style={cellBtn("#14532d")}
      >
        Gagnant
      </button>
      <button onClick={handleUndo} style={cellBtn("#111")}>
        ↩
      </button>

      {isFinished && <div>Fin</div>}
    </div>
  );
}
