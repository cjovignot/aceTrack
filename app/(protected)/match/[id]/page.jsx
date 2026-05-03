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

  const card = "bg-white/5 border border-white/10 rounded-2xl p-4";

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
  const playerOffensive = player.winners + opponent.forcedErrors;
  const opponentOffensive = opponent.winners + player.forcedErrors;
  const playerOffensiveRatio =
    (player.winners + opponent.forcedErrors) /
    (player.winners / (player.winners + opponent.winners) || 1);
  const opponentOffensiveRatio =
    (opponent.winners + player.forcedErrors) /
    (opponent.winners / (opponent.winners + player.winners) || 1);

  console.log(
    player.winners,
    opponent.forcedErrors,
    player.winners + opponent.winners,
  );

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
  const playerRatioWF =
    player.unforcedErrors > 0
      ? Number((player.winners / player.unforcedErrors).toFixed(2))
      : player.winners;

  const opponentRatioWF =
    opponent.unforcedErrors > 0
      ? Number((opponent.winners / opponent.unforcedErrors).toFixed(2))
      : opponent.winners;

  // ---- ERROR RATE PAR COUP

  const playerForehandShots = player.forehandWinners + player.forehandErrors;

  const playerBackhandShots = player.backhandWinners + player.backhandErrors;

  const opponentForehandShots =
    opponent.forehandWinners + opponent.forehandErrors;

  const opponentBackhandShots =
    opponent.backhandWinners + opponent.backhandErrors;

  // %

  const playerForehandErrorRate =
    playerForehandShots > 0
      ? (player.forehandErrors / playerForehandShots) * 100
      : 0;

  const playerBackhandErrorRate =
    playerBackhandShots > 0
      ? (player.backhandErrors / playerBackhandShots) * 100
      : 0;

  const opponentForehandErrorRate =
    opponentForehandShots > 0
      ? (opponent.forehandErrors / opponentForehandShots) * 100
      : 0;

  const opponentBackhandErrorRate =
    opponentBackhandShots > 0
      ? (opponent.backhandErrors / opponentBackhandShots) * 100
      : 0;

  // FAUTES COUPS DROIT
  const playerForehandTotal =
    stats.player.forehandErrors + stats.player.forehandWinners;
  const opponentForehandTotal =
    stats.opponent.forehandErrors + stats.opponent.forehandWinners;

  // FAUTES REVERS
  const playerBackhandTotal =
    stats.player.backhandErrors + stats.player.backhandWinners;
  const opponentBackhandTotal =
    stats.opponent.backhandErrors + stats.opponent.backhandWinners;

  // ---------------- UI ----------------
  return (
    <div className="max-w-lg px-4 py-6 mx-auto mb-20">
      {/* HEADER */}
      <div className="flex items-center justify-start mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-center justify-end w-full gap-3">
          <button onClick={reloadComponent}>
            <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className="p-2 text-gray-400 transition rounded-lg hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              match.winner === "player"
                ? "bg-yellow-500/10 text-yellow-500"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {match.winner === "player" ? (
              <Trophy className="w-4 h-4" />
            ) : (
              <X className="w-4 h-4" />
            )}
            {match.winner === "player" ? "Victoire" : "Défaite"}
          </div>
        </div>
      )}

      {/* SCORE */}
      <div className={card}>
        <ScoreBoard
          match={match}
          score={match.score}
          points={points}
          matchStatus={match.status}
          playerName={match.player_name}
          opponentName={match.opponent_name}
        />

        <div className="flex justify-center gap-4 mt-4 text-xs text-gray-400">
          <span>🎾 {match.surface}</span>
          {match.duration_minutes && (
            <span>
              <Clock className="inline w-3 h-3" /> {match.duration_minutes} min
            </span>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="mt-10 space-y-6">
        {/* SERVICE */}
        <div className={card}>
          <p className="mb-3 text-sm text-gray-400">Service</p>

          <StatBar
            label="% points service"
            playerUnits={stats.player.servicePointsWon}
            opponentUnits={stats.opponent.servicePointsWon}
            playerRatio={stats.ratios.serviceRatio.player}
            opponentRatio={stats.ratios.serviceRatio.opponent}
            isPercent
          />

          <StatBar
            label="Aces"
            playerUnits={stats.player.aces}
            opponentUnits={stats.opponent.aces}
            playerRatio={stats.ratios.aces.player}
            opponentRatio={stats.ratios.aces.opponent}
            isPercent
          />

          <StatBar
            label="Doubles fautes"
            playerUnits={stats.player.doubleFaults}
            opponentUnits={stats.opponent.doubleFaults}
            playerRatio={stats.ratios.doubleFaults.player}
            opponentRatio={stats.ratios.doubleFaults.opponent}
            isPercent
          />
        </div>

        {/* FAUTES */}
        <div className={card}>
          <p className="mb-3 text-sm text-gray-400">Fautes</p>

          <StatBar
            label="Fautes directes"
            playerUnits={stats.player.unforcedErrors}
            opponentUnits={stats.opponent.unforcedErrors}
            playerRatio={stats.ratios.unforcedErrors.player}
            opponentRatio={stats.ratios.unforcedErrors.opponent}
            isPercent
          />

          <StatBar
            label="Fautes provoquées"
            playerUnits={stats.player.forcedErrors}
            opponentUnits={stats.opponent.forcedErrors}
            playerRatio={stats.ratios.forcedErrors.player}
            opponentRatio={stats.ratios.forcedErrors.opponent}
            isPercent
          />

          <StatBar
            label="Total fautes"
            playerUnits={
              stats.player.forcedErrors + stats.player.unforcedErrors
            }
            opponentUnits={
              stats.opponent.forcedErrors + stats.opponent.unforcedErrors
            }
            playerRatio={
              (stats.ratios.forcedErrors.player +
                stats.ratios.unforcedErrors.player) /
              2
            }
            opponentRatio={
              (stats.ratios.forcedErrors.opponent +
                stats.ratios.unforcedErrors.opponent) /
              2
            }
            isPercent
          />
        </div>

        {/* COUPS */}
        <div className={card}>
          <p className="mb-3 text-sm text-gray-400">Coups</p>
          <StatBar
            label="Coups droit gagnants"
            playerUnits={stats.player.forehandWinners}
            opponentUnits={stats.opponent.forehandWinners}
            playerRatio={stats.ratios.forehandWinners.player}
            opponentRatio={stats.ratios.forehandWinners.opponent}
            isPercent
          />

          <StatBar
            label="Fautes Coups droit"
            playerUnits={stats.player.forehandErrors}
            opponentUnits={stats.opponent.forehandErrors}
            playerRatio={
              playerForehandTotal > 0
                ? (
                    (stats.player.forehandErrors / playerForehandTotal) *
                    100
                  ).toFixed(0)
                : 0
            }
            opponentRatio={
              opponentForehandTotal > 0
                ? (
                    (stats.opponent.forehandErrors / opponentForehandTotal) *
                    100
                  ).toFixed(0)
                : 0
            }
            isPercent
          />

          <StatBar
            label="Revers gagnants"
            playerUnits={stats.player.backhandWinners}
            opponentUnits={stats.opponent.backhandWinners}
            playerRatio={stats.ratios.backhandWinners.player}
            opponentRatio={stats.ratios.backhandWinners.opponent}
            isPercent
          />

          <StatBar
            label="Fautes Revers"
            playerUnits={stats.player.backhandErrors}
            opponentUnits={stats.opponent.backhandErrors}
            playerRatio={
              playerBackhandTotal > 0
                ? (
                    (stats.player.backhandErrors / playerBackhandTotal) *
                    100
                  ).toFixed(0)
                : 0
            }
            opponentRatio={
              opponentBackhandTotal > 0
                ? (
                    (stats.opponent.backhandErrors / opponentBackhandTotal) *
                    100
                  ).toFixed(0)
                : 0
            }
            isPercent
          />
        </div>

        {/* PERFORMANCE */}
        <div className={card}>
          <p className="mb-3 text-sm text-gray-400">Performance</p>
          <StatBar
            label="Jeu offensif"
            playerUnits={playerOffensive}
            opponentUnits={opponentOffensive}
            playerRatio={playerOffensiveRatio}
            opponentRatio={opponentOffensiveRatio}
            isPercent
          />

          <StatBar
            label="Ratio Gagnant/Perdant"
            playerRatio={playerRatioWF}
            opponentRatio={opponentRatioWF}
            isPercent
          />
        </div>
      </div>

      {/* WIN RATE */}
      <div className={`${card} mt-6`}>
        <p className="mb-2 text-sm text-gray-400">Répartition des points</p>
        <StatBar
          label=""
          playerUnits={player.winners}
          opponentUnits={opponent.winners}
          playerRatio={stats.ratios.winners.player}
          opponentRatio={stats.ratios.winners.opponent}
          isPercent
        />
      </div>
    </div>
  );
}
