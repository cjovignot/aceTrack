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
  const [match, setMatch] = useState(null);
  const [pointHistory, setPointHistory] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    const load = matchId
      ? api.get("/api/matches/" + matchId)
      : api
          .get("/api/matches?status=En%20cours&limit=1")
          .then((r) => ({ data: r.data[0] }));
    load.then((r) => {
      if (r.data) setMatch(r.data);
    });
    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer.current);
  }, [matchId]);

  async function scorePoint(winner) {
    if (!match) return;
    setScoreHistory((prev) => [
      ...prev,
      JSON.parse(JSON.stringify(match.score)),
    ]);
    const result = addPoint(match.score, winner);
    const updates = { score: result.score };
    if (result.matchWon) {
      updates.status = "Terminé";
      updates.winner = result.matchWinner;
      updates.duration_minutes = Math.round(elapsed / 60);
      clearInterval(timer.current);
    }
    const res = await api.patch("/api/matches/" + match._id, updates);
    setMatch(res.data);
    const pr = await api
      .post("/api/points", {
        match_id: match._id,
        point_winner: winner,
        shot_type: "Coup droit",
        timestamp: new Date().toISOString(),
      })
      .catch(() => null);
    if (pr?.data) setPointHistory((prev) => [pr.data, ...prev]);
  }

  async function handleUndo() {
    if (!match || scoreHistory.length === 0) return;
    const previousScore = scoreHistory[scoreHistory.length - 1];
    setMatch((m) => ({
      ...m,
      score: previousScore,
      status: "En cours",
      winner: null,
    }));
    setScoreHistory((prev) => prev.slice(0, -1));
    if (pointHistory.length > 0) {
      await api.delete("/api/points/" + pointHistory[0]._id).catch(() => {});
      setPointHistory((prev) => prev.slice(1));
    }
    await api.patch("/api/matches/" + match._id, {
      score: previousScore,
      status: "En cours",
      winner: null,
    });
  }

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
  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Chargement du match...
      </div>
    );
  }
  return (
    <div className="max-w-lg px-4 py-6 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="flex items-center gap-1 font-mono text-sm text-gray-500">
          <Timer className="w-4 h-4" /> {fmt(elapsed)}
        </span>
        <button
          onClick={handleUndo}
          disabled={scoreHistory.length === 0}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
        >
          <Undo2 className="w-5 h-5" />
        </button>
      </div>
      <ScoreBoard
        score={match.score}
        playerName={match.player_name}
        opponentName={match.opponent_name}
      />
      {match.status !== "Terminé" && (
        <>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() => scorePoint("player")}
              className="h-24 text-lg font-bold text-white transition bg-green-600 hover:bg-green-700 rounded-2xl active:scale-95"
            >
              ✓ {(match.player_name || "Moi").split(" ")[0]}
            </button>
            <button
              onClick={() => scorePoint("opponent")}
              className="h-24 text-lg font-bold text-white transition bg-gray-800 hover:bg-gray-700 rounded-2xl active:scale-95"
            >
              ✗ {(match.opponent_name || "Adv").split(" ")[0]}
            </button>
          </div>
          <div className="flex justify-center mt-6">
            <button
              onClick={handleEndMatch}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
            >
              <StopCircle className="w-4 h-4" /> Terminer le match
            </button>
          </div>
        </>
      )}
      {match.status === "Terminé" && (
        <div className="py-8 mt-8 text-center border border-green-200 bg-green-50 rounded-2xl">
          <div className="mb-2 text-4xl">🏆</div>
          <p className="text-xl font-bold">
            {match.winner === "player" ? "Victoire !" : "Défaite"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {getScoreDisplay(match.score)}
          </p>
          <button
            onClick={() => router.push("/match/" + match._id)}
            className="px-6 py-2 mt-4 font-semibold text-white transition bg-green-600 rounded-xl hover:bg-green-700"
          >
            Voir les statistiques
          </button>
        </div>
      )}
    </div>
  );
}
