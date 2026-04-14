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

// ---------- Component ----------
export default function WatchPage() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId");

  const [match, setMatch] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [serviceFaults, setServiceFaults] = useState(0);
  const [pointHistory, setPointHistory] = useState([]);

  // 🔥 pairing
  const [pairingToken, setPairingToken] = useState(null);
  // 🔥 protection double appel React Strict Mode
  const hasStarted = useRef(false);

  // ---------- INIT ----------
  useEffect(() => {
    if (hasStarted.current) return; // 🔥 bloque 2e appel

    hasStarted.current = true;

    createPairing();
  }, []);

  // ---------- PAIRING ----------
  async function createPairing() {
    if (pairingToken) return; // 🔥 évite double création

    try {
      const res = await fetch("/api/pairing/create", {
        method: "POST",
      });

      console.log("STATUS:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("Erreur API:", text);
        return;
      }

      const data = await res.json();

      if (!data.token) {
        console.error("Pas de token reçu", data);
        return;
      }

      console.log("TOKEN:", data.token);

      setPairingToken(data.token);
      startPairingPolling(data.token);
    } catch (e) {
      console.error("Erreur pairing:", e);
    }
  }

  function startPairingPolling(token) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pairing/${token}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.connected && data.match_id) {
          setIsConnected(true);

          // 🔥 charger match UNIQUEMENT ici
          const resMatch = await fetch(`/api/matches/${data.match_id}`, {
            credentials: "include",
          });

          if (resMatch.ok) {
            const matchData = await resMatch.json();
            setMatch(matchData);

            startPolling(matchData._id);
          }

          clearInterval(interval);
        }
      } catch (e) {
        console.log("Polling pairing error");
      }
    }, 1500);
  }

  // ---------- Polling match ----------
  function startPolling(id) {
    const interval = setInterval(async () => {
      if (!id) return;

      try {
        const res = await fetch(`/api/matches/${id}`, {
          credentials: "include",
        });

        if (!res.ok) return;

        const updated = await res.json();
        setMatch(updated);
      } catch (e) {
        console.log("Polling match error");
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
      const receiver = match.score.serving === "player" ? "opponent" : "player";
      scorePoint(receiver);
    }
  }

  // ---------- INIT SCREEN ----------
  if (!pairingToken) {
    return <div style={centered}>Initialisation...</div>;
  }

  // ---------- QR CONNECTION ----------
  if (!isConnected) {
    const pairingUrl = `${window.location.origin}/connect?token=${pairingToken}`;

    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      pairingUrl,
    )}`;

    return (
      <div style={centered}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#4ade80" }}>Connecter le téléphone</p>
          <img src={qr} width={180} />
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
    return <div style={centered}>Aucun match connecté</div>;
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
