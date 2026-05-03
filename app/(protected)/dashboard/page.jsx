"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import { Plus, Trophy, TrendingUp, Flame, ChevronRight } from "lucide-react";
import { computeStats } from "../../../lib/stats";
import { motion, AnimatePresence } from "framer-motion";
import StatsPieChart from "@/components/Stats/PieChart";
import { formatISODate, formatName } from "@/lib/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStat, setSelectedStat] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const matchRes = await api.get("/api/matches");
        const matchesData = matchRes.data || [];
        setMatches(matchesData);

        const pointsPromises = matchesData.map((m) =>
          api
            .get(`/api/points?match_id=${m._id}`)
            .then((res) => res.data || [])
            .catch(() => []),
        );

        const pointsPerMatch = await Promise.all(pointsPromises);
        setPoints(pointsPerMatch.flat());
      } catch (err) {
        console.error("Erreur chargement dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ---------------- LOGIQUE INTACTE ----------------
  const wins = matches.filter((m) => m.winner === "player").length;
  const winRate =
    matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;

  const finishedMatches = matches.filter((m) => m.status === "Terminé");

  let currentStreak = 0;
  const sortedMatches = [...finishedMatches].reverse();
  for (const m of sortedMatches) {
    if (m.winner === "player") currentStreak++;
    else break;
  }

  const stats = computeStats(points);
  const player = stats.player;

  console.log(stats.player);

  // ---------------- UI HELPERS ----------------
  const card =
    "p-4 rounded-2xl border border-cyan-300/20 bg-gray-950 backdrop-blur";

  const pill = (active) =>
    "flex-1 p-3 rounded-xl border text-sm font-medium transition " +
    (active
      ? "border-cyan-300/40 bg-gray-950 text-cyan-300"
      : "border-gray-700 text-gray-400 hover:border-gray-400");

  // ---------------- UI ----------------
  return (
    <div className="max-w-lg px-4 py-6 mx-auto mb-20 text-white">
      <h1 className="mb-6 text-2xl font-bold">🎾 Tableau de bord</h1>

      {/* ---------------- TOP STATS ---------------- */}
      <section className="grid grid-cols-3 gap-3 mb-6">
        <Stat icon={<Trophy />} value={wins} label="Victoires" />
        <Stat icon={<TrendingUp />} value={winRate + "%"} label="Win rate" />
        <Stat icon={<Flame />} value={currentStreak} label="Série 🔥" />
      </section>

      {/* ---------------- INTERACTIVE ---------------- */}
      <section className={`${card} mb-6 space-y-4`}>
        <h2 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Performances
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedStat("ratio")}
            className={pill(selectedStat === "ratio")}
          >
            Ratio
          </button>

          <button
            onClick={() => setSelectedStat("service")}
            className={pill(selectedStat === "service")}
          >
            Service
          </button>

          <button
            onClick={() => setSelectedStat("score")}
            className={pill(selectedStat === "score")}
          >
            Score
          </button>
        </div>
      </section>

      {/* ---------------- DETAIL PANEL ---------------- */}
      <AnimatePresence mode="wait">
        {selectedStat && (
          <motion.div
            key={selectedStat}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`${card} mb-6`}
          >
            {selectedStat === "ratio" && (
              <StatsPieChart
                label="🎯 Répartition W/F"
                graphData={[
                  { label: "Coups gagnant", value: player.winners },
                  { label: "Fautes directes", value: player.unforcedErrors },
                  { label: "Fautes provoquées", value: player.forcedErrors },
                ]}
              />
            )}

            {selectedStat === "service" && (
              <div className="space-y-3">
                <MiniBar
                  label="Points gagnés au service"
                  value={player.serviceRatio || 0}
                  suffix="%"
                />
                <MiniBar label="Aces / match" value={player.aces} />
                <MiniBar label="Doubles fautes" value={player.doubleFaults} />
              </div>
            )}

            {selectedStat === "score" && (
              <div className="space-y-4">
                <MiniBar label="Coups gagnants" value={player.winners} />
                <MiniBar
                  label="Fautes directes"
                  value={player.unforcedErrors}
                />
                <MiniBar
                  label="Fautes provoquées"
                  value={player.forcedErrors}
                />
              </div>
            )}

            <button
              onClick={() => setSelectedStat(null)}
              className="mt-4 text-xs text-gray-500 underline"
            >
              Fermer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- CTA ---------------- */}
      <Link
        href="/new-match"
        className="flex items-center justify-center w-full h-12 gap-2 mb-8 font-semibold transition border rounded-xl border-cyan-300/30 text-cyan-300 hover:bg-cyan-300 hover:text-black"
      >
        <Plus className="w-4 h-4" />
        Nouveau match
      </Link>

      {/* ---------------- MATCH LIST ---------------- */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Matchs récents
        </h2>

        {loading ? (
          <p className="py-8 text-center text-gray-500">Chargement...</p>
        ) : matches.length === 0 ? (
          <div className="py-12 text-center text-gray-500">🎾 Aucun match</div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <MatchItem key={m._id} match={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- COMPONENTS ----------------

function Stat({ icon, value, label }) {
  return (
    <div className="p-4 text-center border rounded-2xl border-cyan-300/20 bg-gray-950">
      {icon && <div className="flex justify-center mb-2">{icon}</div>}
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function MiniBar({ label, value, suffix = "" }) {
  const percentage = Math.min(value, 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>
          {value}
          {suffix}
        </span>
      </div>

      <div className="h-2 mt-1 bg-gray-800 rounded">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-2 rounded bg-cyan-300"
        />
      </div>
    </div>
  );
}

function MatchItem({ match: m }) {
  return (
    <Link href={"/match/" + m._id}>
      <div className="p-4 transition border rounded-2xl border-cyan-300/10 bg-gray-950 hover:border-cyan-300/40">
        <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
          <span className="text-white">{formatISODate(m.createdAt)}</span>

          <span
            className={
              m.status === "En cours"
                ? "text-green-400 animate-pulse"
                : "text-gray-400"
            }
          >
            {m.status}
          </span>
        </div>

        <div className="flex justify-between">
          <div>
            <p className="font-semibold">{formatName(m.player_name)}</p>
            <p className="text-gray-400">{formatName(m.opponent_name)}</p>
          </div>

          <ChevronRight className="text-cyan-300" />
        </div>
      </div>
    </Link>
  );
}
