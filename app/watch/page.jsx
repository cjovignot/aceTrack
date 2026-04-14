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

function getServeSide(score) {
  if (!score) return "deuce";
  const p = gameScoreToNum(score.current_game_player);
  const o = gameScoreToNum(score.current_game_opponent);
  return (p + o) % 2 === 0 ? "deuce" : "ad";
}

export default function WatchPage() {
  const searchParams = useSearchParams();

  const [match, setMatch] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const [serviceFaults, setServiceFaults] = useState(0);
  const [pointHistory, setPointHistory] = useState([]);
  const [lastPoint, setLastPoint] = useState(null);

  const [pairingToken, setPairingToken] = useState(null);

  const hasStarted = useRef(false);
  const pairingIntervalRef = useRef(null);
  const matchIntervalRef = useRef(null);

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
        credentials: "include",
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

    const res = await fetch("/api/pairing/create", { method: "POST" });
    if (!res.ok) return;

    const data = await res.json();
    if (!data.token) return;

    setPairingToken(data.token);
    startPairingPolling(data.token);
  }

  function startPairingPolling(token) {
    if (pairingIntervalRef.current) return;

    pairingIntervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/pairing/${token}`);
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
        credentials: "include",
      });

      if (!res.ok) return;

      const updated = await res.json();
      setMatch(updated);
    }, 1500);
  }

  // ---------- SCORE ----------
  async function scorePoint(winner, shotType = "Coup droit", isWinner = true) {
    if (!match) return;

    setServiceFaults(0);

    const result = addPoint(match.score, winner);

    const updated = {
      ...match,
      score: result.score,
      ...(result.matchWon
        ? { status: "Terminé", winner: result.matchWinner }
        : {}),
    };

    setMatch(updated);

    await fetch(`/api/matches/${match._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updated),
    });

    await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        match_id: match._id,
        point_winner: winner,
        timestamp: new Date(),
      }),
    });

    setLastPoint(winner);
    setTimeout(() => setLastPoint(null), 150);
  }

  // ---------- UNDO ----------
  async function handleUndo() {
    if (!pointHistory.length || !match) return;

    const { log, prevScore, prevStatus } = pointHistory[0];

    setPointHistory((p) => p.slice(1));

    const restored = {
      ...match,
      score: prevScore,
      status: prevStatus,
      winner: null,
    };

    setMatch(restored);

    await fetch(`/api/matches/${match._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(restored),
    });

    await fetch(`/api/points/${log._id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  function handleServiceFault() {
    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const receiver = match.score.serving === "player" ? "opponent" : "player";
      scorePoint(receiver);
    }
  }

  // ---------- DERIVED ----------
  const score = match?.score || {};
  const setsP = score.sets_player || [];
  const setsO = score.sets_opponent || [];
  const serving = score.serving;
  const serveSide = getServeSide(score);
  const isFinished = match?.status === "Terminé";

  // ---------- CELL STYLE ----------
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
      {/* QR OVERLAY (non bloquant) */}
      {/* FULLSCREEN QR MODE (Apple Watch friendly) */}
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
            justifyContent: "center",
            gap: 18,
            padding: 20,
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#4ade80",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Connecter la montre
          </p>

          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(
              `${window.location.origin}/connect?token=${pairingToken}`,
            )}`}
            width={320}
            height={320}
            style={{
              background: "#fff",
              padding: 10,
              borderRadius: 12,
            }}
          />

          <p
            style={{
              color: "#666",
              fontSize: 12,
              maxWidth: 240,
              lineHeight: 1.4,
            }}
          >
            Scanne ce code depuis le téléphone ou Apple Watch pour connecter le
            match
          </p>
        </div>
      )}

      {/* Zone 1 */}
      <button
        onClick={() => scorePoint("player", "Faute directe", false)}
        style={{
          ...cellBtn("#4a1515"),
          transform: lastPoint === "player" ? "scale(0.93)" : "scale(1)",
        }}
      >
        Faute
      </button>

      {/* Zone 2 */}
      <button
        onClick={() => scorePoint("opponent", "Coup droit", true)}
        style={{
          ...cellBtn("#1e3a5f"),
          transform: lastPoint === "opponent" ? "scale(0.93)" : "scale(1)",
        }}
      >
        Gagnant
      </button>

      <div />

      {/* SCORE CENTER */}
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

      {/* Service fault */}
      <button
        onClick={handleServiceFault}
        style={cellBtn(serviceFaults ? "#92400e" : "#2d1a00")}
      >
        Service
      </button>

      {/* Ace */}
      <button
        onClick={() => scorePoint(serving, "Service gagnant", true)}
        style={cellBtn("#1a1a2e")}
      >
        Ace
      </button>

      {/* Bottom row */}
      <button onClick={() => scorePoint("opponent")} style={cellBtn("#4a1515")}>
        Faute
      </button>

      <button onClick={() => scorePoint("player")} style={cellBtn("#14532d")}>
        Gagnant
      </button>

      <button onClick={handleUndo} style={cellBtn("#111")}>
        ↩
      </button>

      {/* overlay */}
      {isFinished && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            color: "#4ade80",
          }}
        >
          {match?.winner === "player" ? "🏆 Victoire" : "💪 Défaite"}
        </div>
      )}
    </div>
  );
}
