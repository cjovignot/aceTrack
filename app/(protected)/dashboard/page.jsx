"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import {
  Plus,
  Trophy,
  TrendingUp,
  Activity,
  Flame,
} from "lucide-react";
import { computeStats } from "../../../lib/stats";

export default function DashboardPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/matches"),
      api.get("/api/points").catch(() => ({ data: [] })),
    ])
      .then(([m, p]) => {
        setMatches(m.data);
        setPoints(p.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // ---------------- BASIC STATS ----------------
  const wins = matches.filter((m) => m.winner === "player").length;
  const winRate =
    matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;

  const ongoingMatches = matches.filter((m) => m.status === "En cours");
  const finishedMatches = matches.filter((m) => m.status === "Terminé");

  // ---------------- STREAK ----------------
  let currentStreak = 0;
  const sortedMatches = [...finishedMatches].reverse();

  for (const m of sortedMatches) {
    if (m.winner === "player") currentStreak++;
    else break;
  }

  // ---------------- NORMALIZE ----------------
  function normalizeShotType(type) {
    if (!type) return "";
    const t = type.toLowerCase();
    if (t.includes("ace")) return "ace";
    if (t.includes("double")) return "double_fault";
    if (t.includes("faute")) return "unforced_error";
    if (t.includes("winner") || t.includes("coup")) return "winner";
    return type;
  }

  function safeParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  const normalizedPoints = points
    .filter((p) => !p.is_deleted)
    .map((p) => ({
      ...p,
      shot_type: normalizeShotType(p.shot_type),
      score: safeParse(p.score_at_point),
    }));

  // ---------------- GLOBAL STATS ----------------
  const stats = computeStats(normalizedPoints);
  const player = stats.player;

  const totalMatches = matches.length || 1;

  const totalErrors = player.unforcedErrors + player.forcedErrors;

  const ratioWF =
    player.unforcedErrors > 0
      ? (player.winners / player.unforcedErrors).toFixed(2)
      : player.winners;

  const acesPerMatch = (player.aces / totalMatches).toFixed(1);
  const dfPerMatch = (player.doubleFaults / totalMatches).toFixed(1);
  const errorsPerMatch = (totalErrors / totalMatches).toFixed(1);

  // ---------------- SERVICE ----------------
  let servePoints = 0;
  let serveWon = 0;

  for (const p of normalizedPoints) {
    if (p.score?.serving === "player") {
      servePoints++;
      if (p.point_winner === "player") serveWon++;
    }
  }

  const servePct =
    servePoints > 0 ? Math.round((serveWon / servePoints) * 100) : 0;

  // ---------------- UI ----------------
  return (
    <div className="max-w-2xl px-4 py-6 mx-auto mb-20">
      <h1 className="mb-6 text-2xl font-bold text-white">
        🎾 Tableau de bord
      </h1>

      {/* TOP STATS */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat
          icon={<Trophy className="w-5 h-5 text-yellow-500" />}
          value={wins}
          label="Victoires"
        />
        <Stat
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          value={winRate + "%"}
          label="Win rate"
        />
        <Stat
          icon={<Activity className="w-5 h-5 text-blue-500" />}
          value={matches.length}
          label="Matchs"
        />
      </div>

      {/* ADVANCED STATS */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          value={currentStreak}
          label="Streak 🔥"
        />
        <Stat
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
          value={ratioWF}
          label="Ratio W/F"
        />
        <Stat
          icon={<Activity className="w-5 h-5 text-purple-400" />}
          value={servePct + "%"}
          label="Service"
        />
      </div>

      {/* SECONDARY STATS */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <Stat label="Aces/match" value={acesPerMatch} />
        <Stat label="DF/match" value={dfPerMatch} />
        <Stat label="Fautes/match" value={errorsPerMatch} />
      </div>

      {/* NEW MATCH */}
      <Link
        href="/new-match"
        className="flex items-center justify-center w-full h-12 gap-2 mb-10 font-semibold border rounded-2xl text-cyan-300/50 border-cyan-300/50 hover:bg-cyan-300/50 hover:text-white"
      >
        <Plus className="w-4 h-4" /> Nouveau match
      </Link>

      {/* MATCH LIST */}
      <h2 className="mb-2 text-sm text-cyan-300/60">Matchs récents</h2>

      {loading ? (
        <p className="py-8 text-center text-gray-400">Chargement...</p>
      ) : matches.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <div className="mb-2 text-4xl">🎾</div>
          <p>Aucun match</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ONGOING */}
          <div>
            <h2 className="mb-2 text-sm text-green-400/70">En cours</h2>
            {ongoingMatches.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun</p>
            ) : (
              ongoingMatches.map((m) => (
                <MatchItem key={m._id} match={m} />
              ))
            )}
          </div>

          {/* FINISHED */}
          <div>
            <h2 className="mb-2 text-sm text-red-400/70">Terminés</h2>
            {finishedMatches.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun</p>
            ) : (
              finishedMatches.map((m) => (
                <MatchItem key={m._id} match={m} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- COMPONENTS ----------------
function Stat({ icon, value, label }) {
  return (
    <div className="p-4 text-center bg-gray-700/50 rounded-2xl">
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className="text-xl font-bold text-gray-300">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function MatchItem({ match: m }) {
  return (
    <Link
      href={"/match/" + m._id}
      className="flex justify-between p-4 rounded-2xl bg-gray-900/30 hover:bg-gray-900/70"
    >
      <div>
        <p className="text-sm text-cyan-300">
          {m.player_name} vs {m.opponent_name}
        </p>
        <p className="text-xs text-gray-400">{m.surface}</p>
      </div>

      {m.winner === "player" && (
        <Trophy className="w-5 h-5 text-yellow-500" />
      )}
    </Link>
  );
}