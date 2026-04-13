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
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Bonjour, {user?.name} 🎾</h1>
      <p className="text-gray-400 text-sm mb-6">Votre tableau de bord</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
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
        className="flex items-center justify-center gap-2 w-full h-12 bg-green-600 text-white rounded-xl font-semibold mb-6 hover:bg-green-700 transition"
      >
        <Plus className="w-4 h-4" /> Nouveau match
      </Link>

      <h2 className="font-semibold text-lg mb-3">Matchs récents</h2>
      {loading ? (
        <p className="text-center py-8 text-gray-400">Chargement...</p>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🎾</div>
          <p>Aucun match pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <Link
              key={m._id}
              href={"/match/" + m._id}
              className="flex items-center justify-between bg-white rounded-xl border p-4 hover:shadow-sm transition"
            >
              <div>
                <p className="font-semibold">
                  {m.player_name} vs {m.opponent_name}
                </p>
                <div className="text-sm flex items-baseline gap-1">
                  <p>{m.surface}</p> ·{" "}
                  <p className="text-sm font-bold text-red-800">{m.status}</p>
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
    <div className="bg-white rounded-xl border p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
