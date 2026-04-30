"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import {
  Plus,
  Trophy,
  TrendingUp,
  Flame,
  Activity,
} from "lucide-react";
import { computeStats } from "../../../lib/stats";
import { motion, AnimatePresence } from "framer-motion";

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

  // ---------------- MINI GRAPH DATA ----------------
  const graphData = [
    { label: "Winners", value: player.winners },
    { label: "UE", value: player.unforcedErrors },
    { label: "FE", value: player.forcedErrors },
  ];

  const maxGraph = Math.max(...graphData.map((d) => d.value), 1);

  // ---------------- UI ----------------
  return (
    <div className="max-w-2xl px-4 py-6 mx-auto mb-20">
      <h1 className="mb-6 text-2xl font-bold text-white">
        🎾 Tableau de bord
      </h1>

      {/* TOP */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat icon={<Trophy />} value={wins} label="Victoires" />
        <Stat icon={<TrendingUp />} value={winRate + "%"} label="Win rate" />
        <Stat icon={<Flame />} value={currentStreak} label="Streak 🔥" />
      </div>

      {/* INTERACTIVE */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat
          label="Ratio"
          value={ratioWF}
          active={selectedStat === "ratio"}
          onClick={() => setSelectedStat("ratio")}
        />
        <Stat
          label="Service"
          value={servePct + "%"}
          active={selectedStat === "service"}
          onClick={() => setSelectedStat("service")}
        />
        <Stat
          label="Fautes"
          value={totalErrors}
          active={selectedStat === "errors"}
          onClick={() => setSelectedStat("errors")}
        />
      </div>

      {/* DYNAMIC PANEL */}
      <AnimatePresence mode="wait">
        {selectedStat && (
          <motion.div
            key={selectedStat}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="p-5 mb-6 border border-gray-700 shadow-lg rounded-2xl bg-gray-900/60 backdrop-blur"
          >
            {selectedStat === "ratio" && (
              <>
                <p className="mb-3 font-semibold">🎯 Ratio Winners / Fautes</p>

                <MiniBarChart data={graphData} max={maxGraph} />

                <p className="mt-3 text-sm text-gray-400">
                  {player.winners} winners pour{" "}
                  {player.unforcedErrors} fautes directes
                </p>
              </>
            )}

            {selectedStat === "service" && (
              <>
                <p className="mb-3 font-semibold">⚡ Service</p>
                <MiniBar
                  label="Points gagnés"
                  value={servePct}
                  suffix="%"
                />
                <MiniBar label="Aces/match" value={acesPerMatch} />
                <MiniBar label="DF/match" value={dfPerMatch} />
              </>
            )}

            {selectedStat === "errors" && (
              <>
                <p className="mb-3 font-semibold">⚠️ Fautes</p>
                <MiniBar label="Total" value={totalErrors} />
                <MiniBar
                  label="Directes"
                  value={player.unforcedErrors}
                />
                <MiniBar
                  label="Provoquées"
                  value={player.forcedErrors}
                />
              </>
            )}

            <button
              onClick={() => setSelectedStat(null)}
              className="mt-4 text-xs text-gray-400 underline"
            >
              Fermer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <Link
        href="/new-match"
        className="flex items-center justify-center w-full h-12 gap-2 mb-10 font-semibold border rounded-2xl text-cyan-300/50 border-cyan-300/50 hover:bg-cyan-300/50 hover:text-white"
      >
        <Plus className="w-4 h-4" /> Nouveau match
      </Link>
    </div>
  );
}

// ---------------- COMPONENTS ----------------
function Stat({ icon, value, label, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl cursor-pointer transition text-center
      ${
        active
          ? "bg-cyan-500/20 border border-cyan-400 scale-105"
          : "bg-gray-800/60 hover:bg-gray-700/80"
      }`}
    >
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function MiniBar({ label, value, suffix = "" }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 mt-1 bg-gray-700 rounded">
        <div
          className="h-2 bg-cyan-400 rounded"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function MiniBarChart({ data, max }) {
  return (
    <div className="flex items-end gap-3 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.value / max) * 100}%` }}
            transition={{ duration: 0.4 }}
            className="w-full bg-cyan-400 rounded-t"
          />
          <span className="mt-1 text-xs text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}