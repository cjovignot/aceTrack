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
    // await api.delete("/api/points?match_id=" + id);
    await api.delete("/api/matches/" + id);
    router.push("/dashboard");
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Chargement...
      </div>
    );
  if (!match)
    return (
      <div className="max-w-lg px-4 py-6 mx-auto text-center text-gray-400">
        Match introuvable
      </div>
    );

  const stats = computeStats(points);

const winRate =
  stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
 
  return (
    <div className="max-w-lg px-4 py-6 mx-auto">
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
                className="flex-1 font-semibold transition border border-gray-200 h-11 rounded-xl hover:bg-gray-50"
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
      <ScoreBoard
        score={match.score}
        playerName={match.player_name}
        opponentName={match.opponent_name}
      />
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
      {stats.total > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-bold">Statistiques</h2>
          <div className="grid grid-cols-2 gap-3">
<StatBox label="Points gagnés" value={stats.wins} sub={"/ " + stats.total} />

<StatBox label="Taux de victoire" value={winRate + "%"} />

<StatBox label="Aces" value={stats.aces} />

<StatBox label="Doubles fautes" value={stats.doubleFaults} neg />

<StatBox label="Winners" value={stats.winners} />

<StatBox label="Fautes directes" value={stats.unforcedErrors} neg />

<StatBox label="Fautes provoquées" value={stats.forcedErrors} />

<StatBox label="Coups droits gagnants" value={stats.forehandWinners} />

<StatBox label="Revers gagnants" value={stats.backhandWinners} />

          </div>
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

function StatBox({ label, value, sub, neg }) {
  return (
    <div className="p-3 text-center bg-white border rounded-xl">
      <p
        className={
          "text-2xl font-bold " + (neg ? "text-red-500" : "text-green-600")
        }
      >
        {value}{" "}
        {sub && (
          <span className="text-sm font-normal text-gray-400">{sub}</span>
        )}
      </p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
