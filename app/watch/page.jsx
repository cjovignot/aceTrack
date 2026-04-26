"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { addPoint } from "@/lib/tennisScoring";
import { IterationCw } from "lucide-react";

/* =========================
   UTILS
========================= */
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

  const [match, setMatch] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [pairingToken, setPairingToken] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serviceFaults, setServiceFaults] = useState(0);

  const historyRef = useRef([]);
  const queueRef = useRef([]);
  const sendingRef = useRef(false);

  const matchIntervalRef = useRef(null);
  const pairingIntervalRef = useRef(null);
  const lastUpdateRef = useRef(0);

  const isFinished = match?.status === "Terminé";

  const winnerLabel =
    match?.winner === "player"
      ? match.player_name
      : match?.winner === "opponent"
        ? match.opponent_name
        : null;

  /* =========================
     INIT
  ========================= */
  useEffect(() => {
    createPairing();
  }, []);

  /* =========================
     MATCH LOADING
  ========================= */
  useEffect(() => {
    if (!matchId) return;

    async function load() {
      const res = await fetch(`/api/matches/${matchId}`, {
        headers: { "x-pairing-token": pairingToken },
      });

      if (res.ok) {
        const data = await res.json();
        setMatch(data);
        startMatchPolling(data._id);
      }
    }

    load();
  }, [matchId]);

  /* =========================
     PAIRING
  ========================= */
  async function createPairing() {
    const res = await fetch("/api/pairing/create", { method: "POST" });
    if (!res.ok) return;

    const data = await res.json();
    setPairingToken(data.token);
    startPairingPolling(data.token);
  }

  function startPairingPolling(token) {
    pairingIntervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/pairing/${token}`);
      if (!res.ok) return;

      const data = await res.json();

      if (data.connected && data.match_id) {
        setIsConnected(true);
        setMatchId(data.match_id);
        clearInterval(pairingIntervalRef.current);
      }
    }, 1500);
  }

  function startMatchPolling(id) {
    matchIntervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/matches/${id}`);
      if (!res.ok) return;

      const data = await res.json();

      if (new Date(data.updatedAt || 0).getTime() < lastUpdateRef.current)
        return;

      setMatch(data);
    }, 3000);
  }

  /* =========================
     BLOCK IF FINISHED
========================= */
  function blockIfFinished() {
    if (!match || match.status === "Terminé") return true;
    return false;
  }

  /* =========================
     SCORE
========================= */
  function scorePoint(winner, shotType = "winner") {
    if (blockIfFinished()) return;

    const result = addPoint(match.score, winner);
    const clientId = Date.now() + "_" + Math.random();

    historyRef.current.push({
      matchSnapshot: JSON.parse(JSON.stringify(match)),
      client_id: clientId,
    });

    const updated = {
      ...match,
      score: result.score,
      updatedAt: new Date().toISOString(),
      ...(result.matchWon
        ? { status: "Terminé", winner: result.matchWinner }
        : {}),
    };

    lastUpdateRef.current = Date.now();
    setMatch(updated);

    queueRef.current.push({
      client_id: clientId,
      match_id: match._id,
      pairingToken,
      point_winner: winner,
      shot_type: normalizeShotType(shotType),
    });

    flushQueue();
  }

  async function flushQueue() {
    if (sendingRef.current) return;
    if (queueRef.current.length === 0) return;
    if (match?.status === "Terminé") return;

    sendingRef.current = true;

    const item = queueRef.current.shift();

    try {
      await fetch("/api/points", {
        method: "POST",
        headers: { "x-pairing-token": pairingToken },
        body: JSON.stringify(item),
      });
    } catch {
      queueRef.current.unshift(item);
    }

    sendingRef.current = false;
    setTimeout(flushQueue, 0);
  }

  function handleServiceFault() {
    if (blockIfFinished()) return;

    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const receiver =
        match.score.serving === "player" ? "opponent" : "player";
      scorePoint(receiver, "double_fault");
    }
  }

  /* =========================
     UI
========================= */
  const score = match?.score || {};
  const setsP = score.sets_player || [];
  const setsO = score.sets_opponent || [];
  const serving = score.serving;
  const serveSide = getServeSide(score);

  return (
    <div className="relative">
      {/* OVERLAY FIN MATCH */}
      {isFinished && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-white bg-black/90">
          <h1 className="text-2xl text-yellow-400">Match terminé</h1>
          {winnerLabel && (
            <p className="mt-2 text-lg">Vainqueur : {winnerLabel}</p>
          )}
        </div>
      )}

      {/* UI BLOQUÉE */}
      <div
        className={`grid min-h-screen bg-black text-white ${isFinished ? "opacity-40 pointer-events-none" : ""}`}
        style={{
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr 1fr 1fr",
          gap: 3,
          padding: 3,
        }}
      >
        <button onClick={() => scorePoint("player", "error")}>
          Faute
        </button>

        <button onClick={() => scorePoint("opponent", "winner")}>
          Gagnant
        </button>

        <div />

        <button onClick={handleServiceFault}>
          Faute service
        </button>

        <button onClick={() => scorePoint(serving, "ace")}>
          Ace
        </button>

        <button onClick={() => scorePoint("player", "winner")}>
          Gagnant
        </button>

        <button onClick={() => {}}>
          <IterationCw />
        </button>
      </div>
    </div>
  );
}