"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import { Plus, Trophy, TrendingUp, Activity } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/matches")
      .then((r) => setMatches(r.data))
      .finally(() => setLoading(false));
  }, []);

  const wins = matches.filter((m) => m.winner === "player").length;
  const winRate =
    matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;

  const ongoingMatches = matches.filter((m) => m.status === "En cours");
  const finishedMatches = matches.filter((m) => m.status === "Terminé");
  return (
    <div className="max-w-2xl px-4 py-6 mx-auto mb-20">
      {/* <h1 className="mb-1 text-2xl font-bold text-white">
        Bonjour, {user?.name} 🎾
      </h1> */}
      <h1 className="mb-6 text-2xl font-bold text-white">🎾 Tableau de bord</h1>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat
          icon={<Trophy className="w-5 h-5 text-yellow-500" />}
          value={wins}
          label="Victoires"
        />
        <Stat
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          value={winRate + "%"}
          label="Taux victoire"
        />
        <Stat
          icon={<Activity className="w-5 h-5 text-blue-500" />}
          value={matches.length}
          label="Matchs"
        />
      </div>

      <Link
        href="/new-match"
        className="flex items-center justify-center w-full h-12 gap-2 mb-10 font-semibold transition border text-cyan-300/50 rounded-2xl bg-none border-cyan-300/50 hover:bg-cyan-300/50 hover:text-white"
      >
        <Plus className="w-4 h-4" /> Nouveau match
      </Link>

      <h2 className="mb-2 text-sm text-cyan-300/60">Matchs récents</h2>
      {loading ? (
        <p className="py-8 text-center text-gray-400">Chargement...</p>
      ) : matches.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <div className="mb-2 text-4xl">🎾</div>
          <p>Aucun match pour le moment</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Matchs en cours */}
          <div>
            <h2 className="mb-2 text-sm text-green-400/70">En cours</h2>
            {ongoingMatches.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun match en cours</p>
            ) : (
              <div className="space-y-3">
                {ongoingMatches.map((m) => (
                  <MatchItem key={m._id} match={m} />
                ))}
              </div>
            )}
          </div>

          {/* Matchs terminés */}
          <div>
            <h2 className="mb-2 text-sm text-red-400/70">Terminés</h2>
            {finishedMatches.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun match terminé</p>
            ) : (
              <div className="space-y-3">
                {finishedMatches.map((m) => (
                  <MatchItem key={m._id} match={m} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="p-4 text-center transition bg-gray-700/50 hover:bg-gray-700/80 rounded-2xl">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-xl font-bold text-gray-300">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function MatchItem({ match: m }) {
  return (
    <Link
      href={"/match/" + m._id}
      className="flex items-stretch justify-between overflow-hidden transition rounded-2xl bg-gray-900/30 hover:bg-gray-900/70"
    >
      {/* Bande de statut */}
      <div
        className={`w-1 rounded-full self-stretch ${
          m.status === "Terminé"
            ? "border border-gray-500"
            : "border border-green-400 animate-pulse opacity-100"
        }`}
      />

      {/* Contenu */}
      <div className="flex-1 m-4">
        <p className="mb-1 text-sm text-cyan-300/80">
          {m.player_name} vs {m.opponent_name}
        </p>

        <div className="flex items-baseline justify-between gap-1 text-sm">
          <div className="flex gap-2">
            <p className="text-gray-300/60">{m.surface}</p>
          </div>
        </div>
      </div>

      {/* Winner icon */}
      <div className="flex items-center justify-center gap-4 pr-4">
        {m.winner === "player" && (
          <Trophy className="w-5 h-5 text-yellow-500" />
        )}
        {m.isStreaming && (
          <span className="flex items-center justify-center w-2 h-2 bg-red-600 rounded-full"></span>
        )}
      </div>
    </Link>
  );
}
