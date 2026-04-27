"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import {
  addPoint,
  getScoreDisplay,
  getServer,
} from "../../../lib/tennisScoring";
import ScoreBoard from "../../../components/ScoreBoard";
import { ArrowLeft, Timer, Undo2, Trophy, X, RotateCcw } from "lucide-react";
import { div } from "framer-motion/client";

export default function LiveScorePage() {
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get("matchId");

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [serviceFaults, setServiceFaults] = useState(0);
  const [points, setPoints] = useState([]);

  const timer = useRef(null);

  const historyRef = useRef([]);
  const queueRef = useRef([]);
  const sendingRef = useRef(false);
  const isMatchFinishedRef = useRef(false);

  const buttonStyles = {
    red: "border-red-700 text-red-700 hover:bg-red-700/20",
    green: "border-green-700 text-green-700 hover:bg-green-700/20",
    orange: "border-orange-400 text-orange-400 hover:bg-orange-600/20",
    purple: "border-purple-400 text-purple-400 hover:bg-purple-700/20",
    gray: "border-gray-300 text-gray-300 hover:bg-gray-300/20",
  };

  async function loadPoints(id) {
    try {
      const res = await api.get("/api/points?match_id=" + id);
      setPoints(res.data || []);
    } catch (e) {
      console.error("Failed to load points", e);
    }
  }

  function defineButtonStyle(color) {
    return `bg-transparent border ${buttonStyles[color]} h-12 text-sm rounded-md font-semibold`;
  }

  function getPointContext(score) {
    if (!score) return "normal";

    const p = score.current_game_player;
    const o = score.current_game_opponent;

    const { server } = getServer(score);
    const isOpponentServing = server === "opponent";

    // Deuce
    if (p === "40" && o === "40") return "deuce";

    // Advantage
    if (p === "AD" || o === "AD") return "advantage";

    // Break point (le receveur peut gagner le jeu)
    if (isOpponentServing && p === "40" && o !== "40") {
      return "break_point";
    }

    // Game point (le serveur peut gagner le jeu)
    if (!isOpponentServing && p === "40" && o !== "40") {
      return "game_point";
    }

    return "normal";
  }

  const pointContext = getPointContext(match?.score);

  function formatPlayerName(name = "") {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].toUpperCase();

    const firstNameInitial = parts[0][0]?.toUpperCase();
    const lastName = parts.slice(1).join(" ").toUpperCase();

    return `${firstNameInitial}. ${lastName}`;
  }

  // ---------- INIT ----------
  useEffect(() => {
    const load = matchId
      ? api.get("/api/matches/" + matchId)
      : api
          .get("/api/matches?status=En%20cours&limit=1")
          .then((r) => ({ data: r.data[0] }));

    load.then((r) => {
      const m = r.data || null;

      setMatch(m);
      setLoading(false);

      if (m?._id) {
        loadPoints(m._id); // 👈 IMPORTANT
      }
    });

    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => clearInterval(timer.current);
  }, [matchId]);

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
    if (isMatchFinishedRef.current) return; // ✅ SEUL CHECK FIABLE

    sendingRef.current = true;

    const item = queueRef.current.shift();

    try {
      await api.post("/api/points", item);
    } catch (e) {
      queueRef.current.unshift(item);
    }

    sendingRef.current = false;

    if (!isMatchFinishedRef.current && queueRef.current.length > 0) {
      setTimeout(flushQueue, 0);
    }
  }

  // ---------- SCORE ----------
  function scorePoint(winner, shotType = "winner", isWinner = true) {
    if (!match || !match.score || isMatchFinishedRef.current) return;

    setServiceFaults(0);

    const previousScore = JSON.parse(JSON.stringify(match.score));
    const result = addPoint(match.score, winner);

    const clientId = Date.now() + "_" + Math.random();

    const scoreCopy = JSON.parse(JSON.stringify(result.score));
    const newServer = getServer(scoreCopy);

    historyRef.current.push({
      matchSnapshot: JSON.parse(JSON.stringify(match)),
      client_id: clientId,
    });

    const optimistic = {
      ...match,
      score: scoreCopy,
      serving: newServer.server,
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

      // ✅ STOP GLOBAL
      isMatchFinishedRef.current = true;
      queueRef.current = [];
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
    loadPoints(match._id);
  }

  // ---------- SERVICE ----------
  function handleServiceFault() {
    if (!match || !match.score) return;

    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const { server } = getServer(match.score);
      const receiver = server === "player" ? "opponent" : "player";

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

  // ---------- UI GUARDS ----------
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

  // ✅ SAFE ZONE (match existe ici)
  const { server, side } = getServer(match?.score);

  return (
    <div className="w-full px-6 py-5 mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="flex items-center justify-center w-full gap-1 text-sm text-gray-500">
          <Timer className="w-4 h-4" /> {fmt(elapsed)}
        </span>

        {/* <button onClick={handleUndo} disabled={historyRef.current.length === 0}>
          <Undo2 className="w-5 h-5" />
        </button> */}
      </div>

      {/* <ScoreBoard
        score={match.score}
        points={points}
        matchStatus={match.status}
        playerName={formatPlayerName(match.player_name)}
        opponentName={formatPlayerName(match.opponent_name)}
      /> */}

      <div className="relative flex flex-col justify-center h-full col-span-2 row-span-2 p-3 bg-black rounded-md">
        {/* SERVE INDICATOR */}
        <div
          className={`absolute w-2 h-2 rounded-full bg-yellow-400 ${
            server === "opponent"
              ? side === "deuce"
                ? "top-2 left-2"
                : "top-2 right-2"
              : side === "deuce"
                ? "bottom-2 right-2"
                : "bottom-2 left-2"
          }`}
        />
        {/* PLAYER ROW */}
        {/* OPPONENT ROW */}
        <div className="grid items-center grid-cols-5 py-1 text-lg">
          {/* NAME LEFT */}

          <span className="col-span-2 text-sm font-semibold truncate text-cyan-300/80">
            {formatPlayerName(match.opponent_name)}
          </span>
          {/* SCORES */}

          <div className="flex items-center justify-end col-span-2 gap-3">
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
          </div>

          <span className="col-span-1 text-lg font-bold text-right text-yellow-400">
            {match.score.current_game_opponent || "0"}
          </span>
        </div>

        {/* DIVIDER */}
        <div className="w-full h-px my-3 bg-gray-700" />

        <div className="grid items-center grid-cols-5 py-1 text-lg">
          {/* NAME LEFT */}
          <span className="col-span-2 text-sm font-semibold truncate text-cyan-300/80">
            {formatPlayerName(match.player_name)}
          </span>

          {/* SCORES */}
          <div className="flex items-center justify-end col-span-2 gap-2">
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
          </div>
          <span className="col-span-1 text-lg font-bold text-right text-yellow-400">
            {match.score.current_game_player || "0"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-2">
        {/* ROW 1 */}
        <button
          onClick={() => scorePoint("opponent", "unforced_error", false)}
          className={defineButtonStyle("red")}
        >
          Faute
        </button>

        <button
          onClick={() => scorePoint("opponent", "winner", true)}
          className={defineButtonStyle("green")}
        >
          {pointContext === "deuce" ? "Avantage" : "Gagnant"}
        </button>

        <button
          onClick={handleServiceFault}
          className={defineButtonStyle("orange")}
        >
          {serviceFaults === 1 ? "Double Faute" : "Service"}
        </button>

        {/* UNDO (span 2 rows) */}
        <button
          onClick={handleUndo}
          className={`${defineButtonStyle("gray")} row-span-2 flex justify-center items-center`}
        >
          <RotateCcw size={28} />
        </button>

        {/* ROW 2 */}
        <button
          onClick={() => scorePoint("player", "unforced_error", false)}
          className={defineButtonStyle("red")}
        >
          Faute
        </button>

        <button
          onClick={() => scorePoint("player", "winner", true)}
          className={defineButtonStyle("green")}
        >
          {pointContext === "deuce" ? "Avantage" : "Gagnant"}
        </button>

        <button
          onClick={() => scorePoint(server, "ace", true)}
          className={defineButtonStyle("purple")}
        >
          Ace
        </button>
      </div>

      {isFinished && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-3 py-6 bg-black/30 backdrop-blur-md">
          <div className="flex flex-col items-center justify-around py-5 m-3 text-center border shadow-2xl w-fit h-fit px-7 rounded-xl bg-white/10 border-white/20 animate-fadeIn">
            <div className="grid gap-10">
              <h1 className="text-xl font-bold tracking-wide text-yellow-400 uppercase">
                Match terminé
              </h1>
              <div className="grid gap-3">
                <p className="text-7xl">🏆</p>
                {/* <Trophy size={50} className="text-yellow-400 drop-shadow-lg" /> */}
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
