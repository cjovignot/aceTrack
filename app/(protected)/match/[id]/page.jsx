"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import { computeStats } from "../../../../lib/stats";
import ScoreBoard from "../../../../components/ScoreBoard";
import { ArrowLeft, Trophy, Clock, MapPin, Trash2 } from "lucide-react";
import { getScoreDisplay } from "../../../../lib/tennisScoring";

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
const normalizedPoints = points.map(normalizePoint);

// points gagnés par chaque joueur
const playerPoints = normalizedPoints.filter(
  (p) => p.point_winner === "player"
);

const opponentPoints = normalizedPoints.filter(
  (p) => p.point_winner === "opponent"
);

// calcul stats séparées
const playerStats = computeStats(playerPoints);
const opponentStats = computeStats(opponentPoints);

// winrate basé sur TOUS les points
const totalPoints = normalizedPoints.length;

const winRate =
  totalPoints > 0
    ? Math.round((playerStats.wins / totalPoints) * 100)
    : 0;

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
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {match.surface}
        </span>
        {match.duration_minutes && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {match.duration_minutes} min
          </span>
        )}
      </div>

      {/* STATS */}
      {playerStats.total > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold">Statistiques</h2>

          <div className="space-y-4">
            <StatBar
              label="Points gagnés"
              playerValue={playerStats.wins}
              opponentValue={opponentStats.wins}
            />

            <StatBar
              label="Aces"
              playerValue={playerStats.aces}
              opponentValue={opponentStats.aces}
            />

            <StatBar
              label="Doubles fautes"
              playerValue={playerStats.doubleFaults}
              opponentValue={opponentStats.doubleFaults}
            />

            <StatBar
              label="Winners"
              playerValue={playerStats.winners}
              opponentValue={opponentStats.winners}
            />

            <StatBar
              label="Fautes directes"
              playerValue={playerStats.unforcedErrors}
              opponentValue={opponentStats.unforcedErrors}
            />

            <StatBar
              label="Fautes provoquées"
              playerValue={playerStats.forcedErrors}
              opponentValue={opponentStats.forcedErrors}
            />

            <StatBar
              label="Coup droit gagnant"
              playerValue={playerStats.forehandWinners}
              opponentValue={opponentStats.forehandWinners}
            />

            <StatBar
              label="Revers gagnant"
              playerValue={playerStats.backhandWinners}
              opponentValue={opponentStats.backhandWinners}
            />
          </div>

          {/* WIN RATE */}
          <div className="p-5 bg-white border rounded-2xl">
            <h3 className="mb-3 text-sm font-semibold">
              Répartition des points
            </h3>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-green-600">
                {winRate}%
              </span>

              <div className="flex-1 h-3 overflow-hidden bg-gray-100 rounded-full">
                <div
                  className="h-full bg-green-600 rounded-full"
                  style={{ width: winRate + "%" }}
                />
              </div>

              <span className="text-sm font-bold text-gray-400">
                {100 - winRate}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- COMPONENT ----------------
function StatBar({ label, playerValue, opponentValue }) {
  const total = playerValue + opponentValue;

  const playerPct =
    total > 0 ? Math.round((playerValue / total) * 100) : 0;

  const opponentPct =
    total > 0 ? Math.round((opponentValue / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{playerValue}</span>
        <span>{label}</span>
        <span>{opponentValue}</span>
      </div>

      <div className="flex h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className="bg-green-600"
          style={{ width: playerPct + "%" }}
        />
        <div
          className="bg-gray-400"
          style={{ width: opponentPct + "%" }}
        />
      </div>

      <div className="flex justify-between text-xs font-bold">
        <span className="text-green-600">{playerPct}%</span>
        <span className="text-gray-400">{opponentPct}%</span>
      </div>
    </div>
  );
}