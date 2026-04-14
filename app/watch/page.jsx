"use client";

import { useState, useEffect } from "react";
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

// ---------- Component ----------
export default function WatchPage() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");

  const [match, setMatch] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serviceFaults, setServiceFaults] = useState(0);
  const [pointHistory, setPointHistory] = useState([]);

  // NEW
  const [pairingToken, setPairingToken] = useState(null);

  // ---------- INIT ----------
  useEffect(() => {
    init();
  }, []);

  async function init() {
  await createPairing();
  setLoading(false); // 🔥 on débloque direct l’UI
}

  // ---------- PAIRING ----------
  async function createPairing() {
    const res = await fetch("/api/pairing/create", {
      method: "POST",
    });

    const data = await res.json();
    setPairingToken(data.token);

    startPairingPolling(data.token);
  }

  function startPairingPolling(token) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/pairing/${token}`);
      const data = await res.json();

      if (data.connected && data.match_id) {
        setIsConnected(true);

        const resMatch = await fetch(`/api/matches/${data.match_id}`, {
          credentials: "include",
        });

        const matchData = await resMatch.json();
        setMatch(matchData);

        clearInterval(interval);
      }
    }, 1500);
  }

  // ---------- Load match ----------
  async function loadMatch() {
    let data = [];

    const res = await fetch("/api/matches", {
      credentials: "include",
    });
    data = await res.json();

    let activeMatch = null;

    if (matchId) {
      activeMatch = data.find((m) => m._id === matchId);
    } else {
      activeMatch = data[0];
    }

    if (activeMatch) {
      setMatch(activeMatch);

      if (activeMatch.is_streaming) {
        setIsConnected(true);
      }

      startPolling(activeMatch._id);
    }

    setLoading(false);
  }

  // ---------- Polling ----------
  function startPolling(id) {
    const interval = setInterval(async () => {
      if (!id) return;

      const res = await fetch(`/api/matches/${id}`, {
        credentials: "include",
      });

      const updated = await res.json();
      setMatch(updated);

      if (updated.is_streaming && updated.stream_status === "live") {
        setIsConnected(true);
      }
    }, 1500);

    return () => clearInterval(interval);
  }

  // ---------- Score ----------
  async function scorePoint(winner) {
    if (!match) return;

    setServiceFaults(0);

    const result = addPoint(match.score, winner);
    const newScore = result.score;

    const updated = {
      ...match,
      score: newScore,
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

    const res = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        match_id: match._id,
        point_winner: winner,
        timestamp: new Date(),
      }),
    });

    const log = await res.json();

    setPointHistory((prev) => [
      { log, prevScore: match.score, prevStatus: match.status },
      ...prev,
    ]);
  }

  // ---------- Undo ----------
  async function handleUndo() {
    if (!pointHistory.length || !match) return;

    const { log, prevScore, prevStatus } = pointHistory[0];

    setPointHistory((prev) => prev.slice(1));

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

  // ---------- Service fault ----------
  function handleServiceFault() {
    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const receiver =
        match.score.serving === "player" ? "opponent" : "player";
      scorePoint(receiver);
    }
  }

  // ---------- Loading ----------
  if (loading) {
    return <div style={centered}>Chargement...</div>;
  }

  // ---------- QR CONNECTION ----------
  if (!isConnected) {
    const pairingUrl = pairingToken
      ? `${window.location.origin}/connect?token=${pairingToken}`
      : null;

    const qr = pairingUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
          pairingUrl
        )}`
      : null;

    return (
      <div style={centered}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#4ade80" }}>Connecter le téléphone</p>

          {qr ? (
            <img src={qr} width={180} />
          ) : (
            <p>Génération du QR...</p>
          )}

          <p style={{ fontSize: 12, color: "#666" }}>
            Scanne avec le téléphone
          </p>
        </div>
      </div>
    );
  }

  // ---------- PREVIEW ----------
  if (!showPreview) {
    return (
      <div style={{ ...centered, flexDirection: "column" }}>
        {match?.stream_url ? (
          <video
            src={match.stream_url}
            autoPlay
            muted
            playsInline
            style={{ width: "100%" }}
          />
        ) : (
          <p>En attente du stream...</p>
        )}

        <button onClick={() => setShowPreview(true)} style={btnGreen}>
          ▶ Commencer
        </button>
      </div>
    );
  }

  // ---------- NO MATCH ----------
  if (!match) {
    return <div style={centered}>Aucun match</div>;
  }

  // ---------- SCORING UI ----------
  const score = match.score || {};
  const serving = score.serving;

  return (
    <div style={grid}>
      <button onClick={() => scorePoint("player")} style={btnRed}>
        Faute
      </button>

      <button onClick={() => scorePoint("opponent")} style={btnBlue}>
        Gagnant
      </button>

      <div />

      <div style={scoreBox}>
        <div>{score.current_game_opponent || "0"}</div>
        <div>{score.current_game_player || "0"}</div>
      </div>

      <button onClick={handleServiceFault} style={btnBrown}>
        Service
      </button>

      <button onClick={() => scorePoint(serving)} style={btnPurple}>
        Ace
      </button>

      <button onClick={() => scorePoint("opponent")} style={btnRed}>
        Faute
      </button>

      <button onClick={() => scorePoint("player")} style={btnGreen}>
        Gagnant
      </button>

      <button onClick={handleUndo} style={btnUndo}>
        ↩
      </button>
    </div>
  );
}

// ---------- Styles ----------
const centered = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  background: "#000",
  color: "#fff",
};

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

const btnGreen = { background: "#16a34a", color: "#fff" };
const btnRed = { background: "#4a1515", color: "#fff" };
const btnBlue = { background: "#1e3a5f", color: "#fff" };
const btnBrown = { background: "#2d1a00", color: "#fff" };
const btnPurple = { background: "#1a1a2e", color: "#fff" };
const btnUndo = { background: "#111", color: "#888" };