"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import { computeStats } from "../../../../lib/stats";
import ScoreBoard from "../../../../components/ScoreBoard";
import { ArrowLeft, Trophy, Clock, Trash2 } from "lucide-react";

export default function MatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [match, setMatch] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // ---------------- UTILS ----------------
  function normalizePoint(p) {
    return {
      ...p,
      shot_type: normalizeShotType(p.shot_type),
      isWinner: p.isWinner ?? p.point_winner === "player",
    };
  }

  function normalizeShotType(type) {
    if (!type) return "";

    const t = type.toLowerCase();

    if (t.includes("ace")) return "ace";
    if (t.includes("double")) return "double_fault";
    if (t.includes("faute")) return "unforced_error";
    if (t.includes("coup") || t.includes("winner")) return "winner";

    return type;
  }

  // ---------------- FETCH ----------------
  useEffect(() => {
    Promise.all([
      api.get("/api/matches/" + id),
      api.get("/api/points?match_id=" + id).catch(() => ({ data: [] })),
    ])
      .then(([m, p]) => {
        setMatch(m.data);
        setPoints(p.data || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    await api.delete("/api/matches/" + id);
    router.push("/dashboard");
  }

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Chargement...
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-lg px-4 py-6 mx-auto text-center text-gray-400">
        Match introuvable
      </div>
    );
  }

  // ---------------- STATS ----------------
  const cleanPoints = points.filter((p) => !p.is_deleted);
  const normalizedPoints = cleanPoints.map(normalizePoint);

  const playerPoints = normalizedPoints.filter(
    (p) => p.point_winner === "player",
  );

  const opponentPoints = normalizedPoints.filter(
    (p) => p.point_winner === "opponent",
  );

  const playerStats = computeStats(playerPoints);
  const opponentStats = computeStats(opponentPoints);

  // 🔥 MERGE DES STATS
  function mergeStats(a, b) {
    const result = {};
    const keys = Object.keys(a);

    for (const key of keys) {
      result[key] = (a[key] || 0) + (b[key] || 0);
    }

    return result;
  }

  const mergedPlayerStats = mergeStats(
    playerStats.player,
    opponentStats.player,
  );

  const mergedOpponentStats = mergeStats(
    playerStats.opponent,
    opponentStats.opponent,
  );

  // ---------------- WIN RATE ----------------
  const totalPoints = normalizedPoints.length;

  const playerRate =
    totalPoints > 0 ? (mergedPlayerStats.winners / totalPoints) * 100 : 0;

  const opponentRate =
    totalPoints > 0 ? (mergedOpponentStats.winners / totalPoints) * 100 : 0;

  // ---------------- UI ----------------
  return (
    <div className="max-w-lg px-4 py-6 mx-auto mb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="p-2 text-gray-400 transition rounded-lg hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* CONFIRM DELETE */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm p-6 bg-white rounded-2xl">
            <h2 className="mb-2 text-lg font-bold">Supprimer ce match ?</h2>
            <p className="mb-6 text-sm text-gray-400">
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 font-semibold transition border border-gray-400 h-11 rounded-xl hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 font-semibold text-white transition bg-red-600 h-11 rounded-xl hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT */}
      {match.status === "Terminé" && (
        <div
          className={
            "text-center mb-6 py-4 rounded-2xl " +
            (match.winner === "player" ? "bg-green-50" : "bg-gray-100")
          }
        >
          <Trophy
            className={
              "w-6 h-6 mx-auto mb-1 " +
              (match.winner === "player" ? "text-yellow-500" : "text-gray-400")
            }
          />
          <p className="text-lg font-bold">
            {match.winner === "player" ? "Victoire" : "Défaite"}
          </p>
        </div>
      )}

      {/* SCORE */}
      <ScoreBoard
        score={match.score}
        playerName={match.player_name}
        opponentName={match.opponent_name}
      />

      {/* INFOS */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">🎾 {match.surface}</span>
        {match.duration_minutes && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {match.duration_minutes} min
          </span>
        )}
      </div>

      {/* STATS */}
      <div className="mt-10 space-y-6">
        <h2 className="text-lg font-semibold text-center text-cyan-300/80">
          Statistiques
        </h2>

        <div className="px-4 space-y-4">
          <StatBar
            label="Coups gagnants"
            playerValue={mergedPlayerStats.winners}
            opponentValue={mergedOpponentStats.winners}
          />

          <StatBar
            label="Fautes"
            playerValue={mergedPlayerStats.unforcedErrors}
            opponentValue={mergedOpponentStats.unforcedErrors}
          />

          <StatBar
            label="Aces"
            playerValue={mergedPlayerStats.aces}
            opponentValue={mergedOpponentStats.aces}
          />

          <StatBar
            label="Doubles fautes"
            playerValue={mergedPlayerStats.doubleFaults}
            opponentValue={mergedOpponentStats.doubleFaults}
          />
        </div>

        {/* WIN RATE */}
        <div className="p-5 border border-cyan-300/80 bg-gray/85 rounded-2xl">
          <h3 className="mb-3 text-sm font-semibold">Répartition des points</h3>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-green-600">
              {mergedPlayerStats.winners} / {totalPoints}
            </span>

            <div className="relative flex-1 h-4 overflow-hidden bg-transparent rounded-full">
              <div className="absolute top-0 bottom-0 w-px left-1/2 bg-gray-400/40" />

              <div
                className="absolute top-0 h-full text-xs font-semibold text-center text-black bg-green-600 rounded-l-full right-1/2"
                style={{ width: `${playerRate}%` }}
              >
                {playerRate.toFixed(0)} %
              </div>

              <div
                className="absolute top-0 h-full text-xs font-semibold text-center text-black bg-orange-400 rounded-r-full left-1/2"
                style={{ width: `${opponentRate}%` }}
              >
                {opponentRate.toFixed(0)} %
              </div>
            </div>

            <span className="text-xs font-semibold text-orange-400">
              {mergedOpponentStats.winners} / {totalPoints}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- COMPONENT ----------------
function StatBar({ label, playerValue, opponentValue }) {
  const total = playerValue + opponentValue;

  const playerPct = total > 0 ? (playerValue / total) * 100 : 0;
  const opponentPct = total > 0 ? (opponentValue / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-green-600">
          {playerValue} / {playerValue + opponentValue}
        </span>

        <div className="relative flex-1 h-4 overflow-hidden bg-transparent rounded-full">
          <div className="absolute top-0 bottom-0 w-px left-1/2 bg-black/40" />
          <div
            className="absolute top-0 h-full text-xs font-semibold text-center text-black bg-green-600 rounded-l-full right-1/2"
            style={{ width: `${playerPct / 2}%` }}
          >
            {playerPct.toFixed(0)} %
          </div>

          <div
            className="absolute top-0 h-full text-xs font-semibold text-center text-black bg-orange-400 rounded-r-full left-1/2"
            style={{ width: `${opponentPct / 2}%` }}
          >
            {opponentPct.toFixed(0)} %
          </div>
        </div>

        <span className="text-xs font-bold text-orange-400">
          {opponentValue} / {playerValue + opponentValue}
        </span>
      </div>
    </div>
  );
}
