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

  const lastUpdateRef = useRef(0);

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
  function flushQueue() {
    if (sendingRef.current || queueRef.current.length === 0) return;

    sendingRef.current = true;

    const batch = [...queueRef.current];
    queueRef.current = [];

    const promises = batch.map((item) =>
      fetch("/api/points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pairing-token": pairingToken,
        },
        body: JSON.stringify(item),
      })
    );

    Promise.all(promises)
      .catch(() => {
        queueRef.current.unshift(...batch);
      })
      .finally(() => {
        sendingRef.current = false;
        flushQueue();
      });
  }

  // ---------- SCORE ----------
  function scorePoint(winner, shotType = "Coup droit", isWinner = true) {
    if (!match) return;

    setServiceFaults(0);

    const previousScore = JSON.parse(JSON.stringify(match.score));
    const result = addPoint(match.score, winner);

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

    queueRef.current.push({
      pairingToken,
      match_id: match._id,
      point_winner: winner,
      shot_type: shotType,
      isWinner,
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
    if (!match) return;

    const res = await fetch(`/api/points?match_id=${match._id}`, {
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": pairingToken,
      },
    });

    const points = await res.json();
    if (!points.length) return;

    const lastPoint = points[0];
    if (!lastPoint.score_at_point) return;

    const previousScore = JSON.parse(lastPoint.score_at_point);

    const optimistic = {
      ...match,
      score: previousScore,
      status: "En cours",
      winner: null,
      updatedAt: new Date().toISOString(),
    };

    lastUpdateRef.current = Date.now();
    setMatch(optimistic);

    await fetch(`/api/matches/${match._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": pairingToken,
      },
      body: JSON.stringify(optimistic),
    });

    await fetch(`/api/points/${lastPoint._id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": pairingToken,
      },
    });
  }

  function handleServiceFault() {
    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const receiver =
        match.score.serving === "player" ? "opponent" : "player";
      scorePoint(receiver, "Double faute", false);
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
    <div style={{
      background: "#000",
      color: "#fff",
      position: "fixed",
      inset: 0,
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr 1fr",
      gap: 3,
      padding: 3,
    }}>
      {!isConnected && pairingToken && (
        <div style={{
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
        }}>
          <p style={{ color: "#4ade80", fontSize: 18 }}>
            Connecter la montre
          </p>

          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
              `${window.location.origin}/connect?token=${pairingToken}`
            )}`}
            width={220}
          />
        </div>
      )}

      <button onClick={() => scorePoint("player", "Faute directe", false)} style={cellBtn("#4a1515")}>Faute</button>
      <button onClick={() => scorePoint("opponent", "Coup droit", true)} style={cellBtn("#1e3a5f")}>Gagnant</button>
      <div />

      <div style={{ gridColumn: "1 / 3", gridRow: "2 / 4" }}>
        <div>{score.current_game_opponent || "0"}</div>
        <div>{score.current_game_player || "0"}</div>
      </div>

      <button onClick={handleServiceFault} style={cellBtn("#2d1a00")}>Service</button>
      <button onClick={() => scorePoint(serving, "Ace", true)} style={cellBtn("#1a1a2e")}>Ace</button>

      <button onClick={() => scorePoint("opponent", "Faute directe", false)} style={cellBtn("#4a1515")}>Faute</button>
      <button onClick={() => scorePoint("player", "Coup droit", true)} style={cellBtn("#14532d")}>Gagnant</button>
      <button onClick={handleUndo} style={cellBtn("#111")}>↩</button>

      {isFinished && <div>Fin</div>}
    </div>
  );
}