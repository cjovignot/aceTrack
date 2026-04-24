"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import { addPoint, getScoreDisplay } from "../../../lib/tennisScoring";
import ScoreBoard from "../../../components/ScoreBoard";
import { ArrowLeft, Timer, Undo2, StopCircle } from "lucide-react";

export default function LiveScorePage() {
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get("matchId");

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [serviceFaults, setServiceFaults] = useState(0);

  const timer = useRef(null);

  // 🔥 core logic
  const historyRef = useRef([]);
  const queueRef = useRef([]);
  const sendingRef = useRef(false);

  function getServeSide(score) {
    if (!score) return "deuce";

    const map = {
      0: 0,
      15: 1,
      30: 2,
      40: 3,
      AD: 4,
    };

    const p = map[score.current_game_player] ?? 0;
    const o = map[score.current_game_opponent] ?? 0;

    return (p + o) % 2 === 0 ? "deuce" : "ad";
  }

  const serveSide = getServeSide(match.score);
  const serving = match.score.serving;

  // ---------- INIT ----------
  useEffect(() => {
    const load = matchId
      ? api.get("/api/matches/" + matchId)
      : api
          .get("/api/matches?status=En%20cours&limit=1")
          .then((r) => ({ data: r.data[0] }));

    load.then((r) => {
      setMatch(r.data || null);
      setLoading(false);
    });

    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => clearInterval(timer.current);
  }, [matchId]);

  // ---------- QUEUE ----------
  async function flushQueue() {
    if (sendingRef.current) return;
    if (queueRef.current.length === 0) return;

    sendingRef.current = true;

    const item = queueRef.current.shift();

    try {
      await api.post("/api/points", item);
    } catch (e) {
      queueRef.current.unshift(item);
    }

    sendingRef.current = false;

    setTimeout(flushQueue, 0);
  }

  // ---------- SCORE ----------
  function scorePoint(winner, shotType = "winner", isWinner = true) {
    if (!match) return;

    setServiceFaults(0);

    const previousScore = JSON.parse(JSON.stringify(match.score));
    const result = addPoint(match.score, winner);

    const clientId = Date.now() + "_" + Math.random();

    historyRef.current.push({
      matchSnapshot: JSON.parse(JSON.stringify(match)),
      client_id: clientId,
    });

    const optimistic = {
      ...match,
      score: result.score,
      ...(result.matchWon
        ? {
            status: "Terminé",
            winner: result.matchWinner,
            duration_minutes: Math.round(elapsed / 60),
          }
        : {}),
    };

    setMatch(optimistic);

    if (result.matchWon) {
      clearInterval(timer.current);
    }

    queueRef.current.push({
      client_id: clientId,
      match_id: match._id,
      point_winner: winner,
      shot_type: shotType,
      isWinner,
      timestamp: new Date(),
      score_at_point: JSON.stringify(previousScore),
    });

    flushQueue();

    api.patch("/api/matches/" + match._id, optimistic).catch(() => {});
  }

  // ---------- SERVICE ----------
  function handleServiceFault() {
    if (!match) return;

    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const receiver = match.score.serving === "player" ? "opponent" : "player";

      scorePoint(receiver, "double_fault", false);
      setServiceFaults(0);
    }
  }

  // ---------- UNDO ----------
  async function handleUndo() {
    if (!match) return;

    const last = historyRef.current.pop();
    if (!last) return;

    setMatch({ ...last.matchSnapshot });

    const index = queueRef.current.findIndex(
      (p) => p.client_id === last.client_id,
    );

    if (index !== -1) {
      queueRef.current.splice(index, 1);
    } else {
      try {
        const { data: points } = await api.get(
          "/api/points?match_id=" + match._id,
        );

        if (points.length) {
          await api.delete("/api/points/" + points[0]._id);
        }
      } catch (e) {
        console.error("Undo failed", e);
      }
    }

    api.patch("/api/matches/" + match._id, last.matchSnapshot).catch(() => {});
  }

  // ---------- END MATCH ----------
  async function handleEndMatch() {
    if (!match) return;

    await api.patch("/api/matches/" + match._id, {
      status: "Terminé",
      duration_minutes: Math.round(elapsed / 60),
    });

    clearInterval(timer.current);
    router.push("/match/" + match._id);
  }

  const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Chargement du match...
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="mb-4 text-gray-400">
          Créer un match pour saisir les points
        </p>
        <button
          onClick={() => router.push("/new-match")}
          className="px-6 py-3 font-semibold border rounded-xl"
        >
          Créer un match
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg px-4 py-6 mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Timer className="w-4 h-4" /> {fmt(elapsed)}
        </span>

        <button onClick={handleUndo} disabled={historyRef.current.length === 0}>
          <Undo2 className="w-5 h-5" />
        </button>
      </div>

      {/* SCORE */}
      <ScoreBoard
        score={match.score}
        playerName={match.player_name}
        opponentName={match.opponent_name}
      />

      {/* ACTIONS */}
      {match.status !== "Terminé" && (
        <div className="grid grid-cols-4 grid-rows-3 gap-1 mt-6">
          {/* 1 - Faute joueur */}
          <button
            onClick={() => scorePoint("opponent", "unforced_error", false)}
            className="text-sm font-bold text-white bg-red-700 rounded-md"
          >
            Faute
          </button>

          {/* 2-3-6-7 - SCORE CENTRAL */}
          <div className="relative flex flex-col justify-center col-span-2 row-span-2 px-2 bg-black rounded-md items-between">
            {/* Pastille service */}
            <div
              className={`absolute w-2 h-2 rounded-full bg-yellow-400 ${
                serving === "opponent"
                  ? serveSide === "deuce"
                    ? "top-2 right-2" // joueur égalité
                    : "bottom-2 right-2" // joueur avantage
                  : serveSide === "deuce"
                    ? "bottom-2 left-2" // opponent égalité
                    : "top-2 left-2" // opponent avantage
              }`}
            />

            {/* OPPONENT */}
            {/* PLAYER */}
            <div className="flex items-center justify-center gap-2 text-lg">
              {/* sets */}
              {(match.score.sets_player || []).map((s, i) => {
                const opp = match.score.sets_opponent?.[i];

                const isWinner = s > opp;

                return (
                  <span
                    key={i}
                    className={`text-sm ${
                      isWinner ? "text-yellow-400 font-bold" : "text-gray-300"
                    }`}
                  >
                    {s}
                  </span>
                );
              })}

              {/* score courant */}
              <span className="ml-2 text-lg font-bold text-yellow-400">
                {match.score.current_game_player || "0"}
              </span>
            </div>

            {/* séparation */}
            <div className="w-3/4 h-px my-2 bg-gray-700" />

            <div className="flex items-center justify-center gap-2 text-lg">
              {/* sets */}
              {(match.score.sets_opponent || []).map((s, i) => {
                const player = match.score.sets_player?.[i];

                const isWinner = s > player;

                return (
                  <span
                    key={i}
                    className={`text-sm ${
                      isWinner ? "text-yellow-400 font-bold" : "text-gray-300"
                    }`}
                  >
                    {s}
                  </span>
                );
              })}

              {/* score courant */}
              <span className="ml-2 text-lg font-bold text-yellow-400">
                {match.score.current_game_opponent || "0"}
              </span>
            </div>
          </div>

          {/* 4 - Gagnant opponent */}
          <button
            onClick={() => scorePoint("opponent", "winner", true)}
            className="text-sm font-bold text-white bg-blue-700 rounded-md"
          >
            Gagnant
          </button>

          {/* 5 - Gagnant joueur */}
          <button
            onClick={() => scorePoint("player", "winner", true)}
            className="text-sm font-bold text-white bg-green-700 rounded-md"
          >
            Gagnant
          </button>

          {/* 8 - Faute opponent */}
          <button
            onClick={() => scorePoint("player", "unforced_error", false)}
            className="text-sm font-bold text-white bg-red-700 rounded-md"
          >
            Faute
          </button>

          {/* 9 - Service */}
          <button
            onClick={handleServiceFault}
            className="text-sm font-bold text-white bg-orange-600 rounded-md"
          >
            Service {serviceFaults === 1 ? "(2e)" : ""}
          </button>

          {/* 10 - Ace */}
          <button
            onClick={() => scorePoint(match.score.serving, "ace", true)}
            className="text-sm font-bold text-white bg-purple-700 rounded-md"
          >
            Ace
          </button>

          {/* 11-12 - Undo */}
          <button
            onClick={handleUndo}
            className="col-span-2 text-sm font-bold text-white bg-gray-800 rounded-md"
          >
            ↩ Annuler
          </button>
        </div>
      )}

      {/* FIN */}
      {match.status === "Terminé" && (
        <div className="py-8 mt-8 text-center bg-green-50 rounded-2xl">
          <div className="text-4xl">🏆</div>
          <p className="text-xl font-bold">
            {match.winner === "player" ? "Victoire !" : "Défaite"}
          </p>
          <p className="text-sm">{getScoreDisplay(match.score)}</p>

          <button
            onClick={() => router.push("/match/" + match._id)}
            className="px-6 py-2 mt-4 text-white bg-green-600 rounded-xl"
          >
            Voir les stats
          </button>
        </div>
      )}
    </div>
  );
}
