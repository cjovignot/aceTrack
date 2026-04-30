"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import { computeStats } from "../../../../lib/stats";
import ScoreBoard from "../../../../components/ScoreBoard";
import StatBar from "@/components/Stats/StatBar";
import { ArrowLeft, Trophy, Clock, Trash2, X, RefreshCw } from "lucide-react";

export default function MatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [match, setMatch] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // ---------------- UTILS ----------------
  function normalizeShotType(type) {
    if (!type) return "";

    const t = type.toLowerCase();

    if (t.includes("ace")) return "ace";
    if (t.includes("double")) return "double_fault";
    if (t.includes("faute")) return "unforced_error";
    if (t.includes("coup") || t.includes("winner")) return "winner";

    return type;
  }

  function safeParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function normalizePoint(p) {
    return {
      ...p,
      shot_type: normalizeShotType(p.shot_type),
      score: safeParse(p.score_at_point),
    };
  }

  function isPlayerServing(p) {
    return p.score?.serving === "player";
  }

  function isOpponentServing(p) {
    return p.score?.serving === "opponent";
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

  function reloadComponent() {
    window.location.reload();
  }

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

  const stats = computeStats(normalizedPoints);
  const player = stats.player;
  const opponent = stats.opponent;

  // ---- erreurs totales
  const playerTotalErrors = player.unforcedErrors + player.forcedErrors;
  const opponentTotalErrors = opponent.unforcedErrors + opponent.forcedErrors;

  // ---- offensif
  const playerOffensive = player.winners + player.forcedErrors;
  const opponentOffensive = opponent.winners + opponent.forcedErrors;

  // ---- service %
  let playerServePoints = 0;
  let playerServeWon = 0;

  let opponentServePoints = 0;
  let opponentServeWon = 0;

  for (const p of normalizedPoints) {
    if (isPlayerServing(p)) {
      playerServePoints++;
      if (p.point_winner === "player") playerServeWon++;
    }

    if (isOpponentServing(p)) {
      opponentServePoints++;
      if (p.point_winner === "opponent") opponentServeWon++;
    }
  }

  const playerServePct =
    playerServePoints > 0 ? (playerServeWon / playerServePoints) * 100 : 0;

  const opponentServePct =
    opponentServePoints > 0
      ? (opponentServeWon / opponentServePoints) * 100
      : 0;

  // ---- ratio winners / fautes
  const playerRatio =
    player.unforcedErrors > 0
      ? Number((player.winners / player.unforcedErrors).toFixed(2))
      : player.winners;

  const opponentRatio =
    opponent.unforcedErrors > 0
      ? Number((opponent.winners / opponent.unforcedErrors).toFixed(2))
      : opponent.winners;

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

        <button onClick={reloadComponent}>
          <RefreshCw className="w-4 h-4" />
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
                className="flex-1 border border-gray-400 h-11 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 text-white bg-red-600 h-11 rounded-xl"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT */}
      {match.status === "Terminé" && (
        <div className="mb-6 text-center">
          {match.winner === "player" ? (
            <>
              <Trophy className="w-6 h-6 mx-auto text-yellow-500" />
              <p className="font-semibold text-yellow-500">Victoire</p>
            </>
          ) : (
            <>
              <X className="w-6 h-6 mx-auto text-red-800" />
              <p className="font-semibold text-red-800">Défaite</p>
            </>
          )}
        </div>
      )}

      {/* SCORE */}
      <ScoreBoard
        match={match}
        score={match.score}
        points={points}
        matchStatus={match.status}
        playerName={match.player_name}
        opponentName={match.opponent_name}
      />

      {/* INFOS */}
      <div className="flex justify-center gap-4 mt-4 text-xs text-gray-200">
        <span>🎾 {match.surface}</span>
        {match.duration_minutes && (
          <span>
            <Clock className="inline w-3 h-3" /> {match.duration_minutes} min
          </span>
        )}
      </div>

      {/* STATS */}
      <div className="mt-10 space-y-4">
        <StatBar
          label="Fautes directes"
          playerValue={player.unforcedErrors}
          opponentValue={opponent.unforcedErrors}
        />
        <StatBar
          label="Fautes provoquées"
          playerValue={player.forcedErrors}
          opponentValue={opponent.forcedErrors}
        />
        <StatBar
          label="Total fautes"
          playerValue={playerTotalErrors}
          opponentValue={opponentTotalErrors}
        />
        <StatBar
          label="Aces"
          playerValue={player.aces}
          opponentValue={opponent.aces}
        />
        <StatBar
          label="Doubles fautes"
          playerValue={player.doubleFaults}
          opponentValue={opponent.doubleFaults}
        />

        <StatBar
          label="Winners coup droit"
          playerValue={player.forehandWinners}
          opponentValue={opponent.forehandWinners}
        />
        <StatBar
          label="Winners revers"
          playerValue={player.backhandWinners}
          opponentValue={opponent.backhandWinners}
        />

        <StatBar
          label="Jeu offensif"
          playerValue={playerOffensive}
          opponentValue={opponentOffensive}
        />

        <StatBar
          label="% points service"
          playerValue={playerServePct.toFixed(0)}
          opponentValue={opponentServePct.toFixed(0)}
          isPercent
        />

        <StatBar
          label="Ratio W / F"
          playerValue={playerRatio}
          opponentValue={opponentRatio}
          isRatio
        />
      </div>

      {/* WIN RATE */}
      <div className="p-4 mt-6 border rounded-xl">
        <p className="mb-2 text-sm">Répartition des points</p>
        <StatBar
          playerValue={player.winners}
          opponentValue={opponent.winners}
        />
      </div>
    </div>
  );
}
