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

  // ---------- SCORE (LOGIQUE BASE44 INJECTÉE) ----------
  async function scorePoint(
    winner,
    shotType = "Coup droit",
    isWinner = true,
    isUnforcedError = false,
  ) {
    if (!match) return;

    setServiceFaults(0);

    const result = addPoint(match.score, winner);
    const newScore = result.score;

    const updatedMatch = {
      ...match,
      score: newScore,
      ...(result.matchWon
        ? { status: "Terminé", winner: result.matchWinner }
        : {}),
    };

    setMatch(updatedMatch);

    await fetch(`/api/matches/${match._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedMatch),
    });

    const res = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        match_id: match._id,
        point_winner: winner,
        shot_type: shotType,
        is_winner: isWinner,
        is_unforced_error: isUnforcedError,
        timestamp: new Date(),
      }),
    });

    const log = await res.json();

    setPointHistory((prev) => [
      { log, prevScore: match.score, prevStatus: match.status },
      ...prev,
    ]);
  }

  // ---------- UNDO (LOGIQUE BASE44) ----------
  async function handleUndo() {
    if (!pointHistory.length || !match) return;

    const { log, prevScore, prevStatus } = pointHistory[0];

    setPointHistory((prev) => prev.slice(1));
    setServiceFaults(0);

    const restored = {
      ...match,
      score: prevScore,
      status: prevStatus,
      winner: undefined,
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

  // ---------- SERVICE FAULT ----------
  function handleServiceFault() {
    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const server = match?.score?.serving;
      const receiver = server === "player" ? "opponent" : "player";

      scorePoint(receiver, "Double faute", false, true);
    }
  }

  // ---------- UI ----------
  const qr =
    pairingToken &&
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      `${window.location.origin}/connect?token=${pairingToken}`,
    )}`;

  const score = match?.score || {};
  const setsP = score.sets_player || [];
  const setsO = score.sets_opponent || [];
  const serving = score.serving;
  const serveSide = getServeSide(score);

  return (
    <div style={grid}>
      {/* QR overlay */}
      {!isConnected && qr && (
        <div style={qrOverlay}>
          <p style={{ color: "#4ade80" }}>Téléphone non connecté</p>
          <img src={qr} width={160} />
        </div>
      )}

      {/* ZONE 1 */}
      <button onClick={() => scorePoint("player")} style={btnRed}>
        Faute
      </button>

      {/* ZONE 2 */}
      <button onClick={() => scorePoint("opponent")} style={btnBlue}>
        Gagnant
      </button>

      <div />

      {/* SCORE DISPLAY (LOGIQUE BASE44 + SERVE SIDE) */}
      <div style={scoreBox}>
        <div>{score.current_game_opponent || "0"}</div>
        <div>{score.current_game_player || "0"}</div>
      </div>

      {/* SERVICE FAULT */}
      <button onClick={handleServiceFault} style={btnBrown}>
        Service
      </button>

      {/* ACE */}
      <button
        onClick={() => scorePoint(serving, "Service gagnant", true)}
        style={btnPurple}
      >
        Ace
      </button>

      {/* FAUTE */}
      <button onClick={() => scorePoint("opponent")} style={btnRed}>
        Faute
      </button>

      {/* GAGNANT */}
      <button onClick={() => scorePoint("player")} style={btnGreen}>
        Gagnant
      </button>

      {/* UNDO */}
      <button onClick={handleUndo} style={btnUndo}>
        ↩
      </button>
    </div>
  );
}

// ---------- STYLES ----------
const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gridTemplateRows: "1fr 1fr 1fr 1fr",
  gap: 3,
  height: "100vh",
  background: "#000",
};

const scoreBox = {
  gridColumn: "1 / 3",
  gridRow: "2 / 4",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 28,
  color: "#facc15",
};

const qrOverlay = {
  position: "fixed",
  top: 20,
  right: 20,
  background: "rgba(0,0,0,0.8)",
  padding: 10,
  borderRadius: 8,
  textAlign: "center",
  zIndex: 999,
};

const btnGreen = { background: "#16a34a", color: "#fff" };
const btnRed = { background: "#4a1515", color: "#fff" };
const btnBlue = { background: "#1e3a5f", color: "#fff" };
const btnBrown = { background: "#2d1a00", color: "#fff" };
const btnPurple = { background: "#1a1a2e", color: "#fff" };
const btnUndo = { background: "#111", color: "#888" };
