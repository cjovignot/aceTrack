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
  const [selectedStat, setSelectedStat] = useState(null);

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

  // ---------------- BASIC ----------------
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
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          value={currentStreak}
          label="Streak 🔥"
        />
      </div>

      {/* INTERACTIVE STATS */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat
          label="Ratio W/F"
          value={ratioWF}
          onClick={() => setSelectedStat("ratio")}
          active={selectedStat === "ratio"}
        />
        <Stat
          label="Service"
          value={servePct + "%"}
          onClick={() => setSelectedStat("service")}
          active={selectedStat === "service"}
        />
        <Stat
          label="Fautes"
          value={errorsPerMatch}
          onClick={() => setSelectedStat("errors")}
          active={selectedStat === "errors"}
        />
      </div>

      {/* DYNAMIC DETAIL */}
      {selectedStat && (
        <div className="p-4 mb-6 border border-gray-600 rounded-2xl bg-gray-800/50">
          {selectedStat === "ratio" && (
            <>
              <p className="mb-2 font-semibold">🎯 Ratio Winners / Fautes</p>
              <p>Winners : {player.winners}</p>
              <p>Fautes directes : {player.unforcedErrors}</p>
              <p>Fautes provoquées : {player.forcedErrors}</p>
            </>
          )}

          {selectedStat === "service" && (
            <>
              <p className="mb-2 font-semibold">⚡ Service</p>
              <p>% points gagnés : {servePct}%</p>
              <p>Aces / match : {acesPerMatch}</p>
              <p>Doubles fautes / match : {dfPerMatch}</p>
            </>
          )}

          {selectedStat === "errors" && (
            <>
              <p className="mb-2 font-semibold">⚠️ Fautes</p>
              <p>Total fautes : {totalErrors}</p>
              <p>Par match : {errorsPerMatch}</p>
              <p>Fautes directes : {player.unforcedErrors}</p>
            </>
          )}

          <button
            onClick={() => setSelectedStat(null)}
            className="mt-3 text-xs text-gray-400 underline"
          >
            Masquer
          </button>
        </div>
      )}

      {/* SECONDARY MINI STATS */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <MiniStat label="Aces/match" value={acesPerMatch} />
        <MiniStat label="DF/match" value={dfPerMatch} />
        <MiniStat label="Matchs" value={matches.length} />
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

          <div>
            <h2 className="mb-2 text-sm text-red-400/70">Terminés</h2>
            {finishedMatches.map((m) => (
              <MatchItem key={m._id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- COMPONENTS ----------------
function Stat({ icon, value, label, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 text-center rounded-2xl cursor-pointer transition
      ${active ? "bg-cyan-500/20 border border-cyan-400" : "bg-gray-700/50 hover:bg-gray-700/80"}`}
    >
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className="text-xl font-bold text-gray-300">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="p-3 text-center bg-gray-800/50 rounded-xl">
      <p className="text-sm font-semibold text-gray-300">{value}</p>
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