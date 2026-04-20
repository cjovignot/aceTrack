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

  return (
    <div className="max-w-2xl px-4 py-6 mx-auto">
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
        className="flex items-center justify-center w-full h-12 gap-2 mb-6 font-semibold text-white transition bg-cyan-400/50 rounded-xl hover:bg-cyan-400/80"
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
        <div className="space-y-3">
          {matches.map((m) => (
            <Link
              key={m._id}
              href={"/match/" + m._id}
              className="flex items-center justify-between p-4 transition bg-gray-600/70 rounded-xl hover:shadow-sm"
            >
              <div>
                <p className="mb-1 text-sm text-cyan-300/70">
                  {m.player_name} vs {m.opponent_name}
                </p>
                <div className="flex items-baseline gap-1 text-sm">
                  <p className="text-gray-300">{m.surface}</p> ·{" "}
                  <p className="text-sm text-red-600">{m.status}</p>
                </div>
              </div>

              {m.winner === "player" && (
                <Trophy className="w-5 h-5 text-yellow-500" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="p-4 text-center bg-gray-700/50 rounded-xl">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-xl font-bold text-gray-300">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
