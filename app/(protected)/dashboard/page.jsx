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
        // 1. Récupérer les matchs
        const matchRes = await api.get("/api/matches");
        const matchesData = matchRes.data || [];

        setMatches(matchesData);

        // 2. Récupérer les points de CHAQUE match
        const pointsPromises = matchesData.map((m) =>
          api
            .get(`/api/points?match_id=${m._id}`)
            .then((res) => res.data || [])
            .catch(() => []),
        );

        const pointsPerMatch = await Promise.all(pointsPromises);

        // 3. Flatten
        const allPoints = pointsPerMatch.flat();

        setPoints(allPoints);
      } catch (err) {
        console.error("Erreur chargement dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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

  const normalizedPoints = points
    .filter((p) => !p.is_deleted)
    .map((p) => ({
      ...p,
      shot_type: normalizeShotType(p.shot_type || p.type),
      extra_tag: normalizeTag(p.extra_tag),
      point_winner: p.point_winner,
      is_deleted: p.is_deleted || false,
      score: safeParse(p.score_at_point),
    }));

  function safeParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  // ---------------- GLOBAL STATS ----------------
  const stats = computeStats(normalizedPoints);
  const player = stats.player;

  const totalMatches = matches.length || 1;

  const totalErrors = player.unforcedErrors + player.forcedErrors;

  const totalShots =
    player.winners + player.unforcedErrors + player.forcedErrors;

  const ratioWF =
    totalShots > 0
      ? ((player.winners / totalShots) * 100).toFixed(1) + "%"
      : "0%";

  const acesPerMatch = (player.aces / totalMatches).toFixed(1);
  const dfPerMatch = (player.doubleFaults / totalMatches).toFixed(1);

  // ---------------- PLAYER SCORE ----------------
  const totalActions =
    player.winners + player.unforcedErrors + player.doubleFaults || 1;

  const efficiency = player.winners / totalActions;

  const playerScore = Math.round(efficiency * 100);

  function getScoreLabel(score) {
    if (score > 70) return "🔥 Très solide";
    if (score > 55) return "💪 Bon niveau";
    if (score > 45) return "⚖️ Moyen";
    if (score > 35) return "⚠️ Irrégulier";
    return "❌ Trop de fautes";
  }

  // ---------------- TAGS ----------------
  function normalizeTag(tag) {
    if (!tag) return null;

    const t = tag.toLowerCase();

    if (t.includes("forehand")) return "forehand";
    if (t.includes("backhand")) return "backhand";
    if (t.includes("serve")) return "serve_winner";
    if (t.includes("return")) return "return_winner";

    return null;
  }

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

  // ---------------- GRAPH ----------------
  const graphData = [
    { label: "Coups gagnant", value: player.winners },
    { label: "Fautes directes", value: player.unforcedErrors },
    { label: "Fautes provoquées", value: player.forcedErrors },
    { label: "Fautes coup droit", value: player.forehandErrors },
    { label: "Fautes revers", value: player.backhandErrors },
  ];

  // ---------------- ERROR RATE ----------------
  const forehandShots = player.forehandWinners + player.forehandErrors;

  const backhandShots = player.backhandWinners + player.backhandErrors;

  const forehandSuccessRate =
    forehandShots + player.forehandErrors > 0
      ? (
          (forehandShots / (forehandShots + player.forehandErrors)) *
          100
        ).toFixed(1)
      : 0;

  const backhandSuccessRate =
    backhandShots + player.backhandErrors > 0
      ? (
          (backhandShots / (backhandShots + player.backhandErrors)) *
          100
        ).toFixed(1)
      : 0;

  const maxGraph = Math.max(...graphData.map((d) => d.value), 1);

  // ---------------- UI ----------------
  return (
    <div className="max-w-2xl px-4 py-6 mx-auto mb-20">
      <h1 className="mb-6 text-2xl font-bold text-white">🎾 Tableau de bord</h1>

      {/* TOP STATS */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat icon={<Trophy />} value={wins} label="Victoires" />
        <Stat icon={<TrendingUp />} value={winRate + "%"} label="Win rate" />
        <Stat icon={<Flame />} value={currentStreak} label="Série 🔥" />
      </div>

      {/* INTERACTIVE STATS */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat
          label="Points réussis"
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
        {/* <Stat
          label="Style"
          value={player.winners}
          active={selectedStat === "style"}
          onClick={() => setSelectedStat("style")}
        /> */}

        <Stat
          label="Efficacité"
          value={playerScore}
          active={selectedStat === "score"}
          onClick={() => setSelectedStat("score")}
        />
      </div>

      {/* DETAIL PANEL */}
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
                <StatsPieChart
                  label="🎯 Répartition W/F"
                  graphData={graphData}
                />{" "}
              </>
            )}

            {selectedStat === "service" && (
              <>
                <p className="mb-3 font-semibold">⚡ Service</p>
                <MiniBar
                  label="Points gagnés au service"
                  value={servePct}
                  suffix="%"
                />
                <MiniBar label="Aces / match" value={acesPerMatch} />
                <MiniBar label="Doubles Fautes / match" value={dfPerMatch} />
              </>
            )}

            {selectedStat === "score" && (
              <>
                {/* HEADER */}
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold">
                    📊 Niveau de jeu — {getScoreLabel(playerScore)}
                  </p>
                  <span
                    className={`text-lg font-bold ${
                      playerScore > 30
                        ? "text-green-400"
                        : playerScore > 0
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {playerScore}
                  </span>
                </div>

                {/* GLOBAL BAR */}
                <MiniBar label="Score global" value={playerScore} suffix="%" />
                <div className="my-8 border-t border-gray-700/50" />

                {/* SECTIONS */}
                <div className="mt-4 space-y-4">
                  {/* SERVICE */}
                  <div className="p-3 rounded-xl bg-gray-800/50">
                    <p className="mb-2 text-xs font-semibold tracking-wide text-cyan-300/70">
                      ⚡ Service
                    </p>
                    <MiniBar label="Aces" value={player.aces} />
                    <MiniBar
                      label="Double fautes"
                      value={player.doubleFaults}
                    />
                  </div>

                  {/* JEU */}
                  <div className="p-3 rounded-xl bg-gray-800/50">
                    <p className="mb-2 text-xs font-semibold tracking-wide text-cyan-300/70">
                      🎾 Jeu
                    </p>
                    <MiniBar label="Coups gagnants" value={player.winners} />
                    <MiniBar
                      label="Fautes directes"
                      value={player.unforcedErrors}
                    />
                    <MiniBar
                      label="Réussite Coup droit"
                      value={forehandSuccessRate}
                      suffix=" %"
                    />
                    <MiniBar
                      label="Réussite Revers"
                      value={backhandSuccessRate}
                      suffix=" %"
                    />
                  </div>

                  {/* PRESSION */}
                  <div className="p-3 rounded-xl bg-gray-800/50">
                    <p className="mb-2 text-xs font-semibold tracking-wide text-cyan-300/70">
                      🔥 Pression subie
                    </p>
                    <MiniBar
                      label="Fautes provoquées"
                      value={player.forcedErrors}
                    />
                    <MiniBar
                      label="Fautes directes"
                      value={player.unforcedErrors}
                    />
                  </div>
                </div>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* EN COURS */}
          <div>
            <h3 className="mb-2 text-sm text-green-400/70">En cours</h3>
            {matches
              .filter((m) => m.status === "En cours")
              .map((m) => (
                <MatchItem key={m._id} match={m} />
              ))}
          </div>

          {/* TERMINÉS */}
          <div>
            <h3 className="mb-2 text-sm text-red-400/70">Terminés</h3>
            {matches
              .filter((m) => m.status === "Terminé")
              .map((m) => (
                <MatchItem key={m._id} match={m} />
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------------- COMPONENTS ----------------
function Stat({ icon, value, label, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl cursor-pointer text-center transition
      ${active ? "bg-cyan-500/20 border border-cyan-400 scale-105" : "bg-gray-800/60 hover:bg-gray-700/80"}`}
    >
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function MiniBar({ label, value, suffix = "" }) {
  const percentage = Math.min(value, 100);

  return (
    <div className="mb-3">
      {/* LABEL */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>
          {value}
          {suffix}
        </span>
      </div>

      {/* BAR BG */}
      <div className="h-2 mt-1 overflow-hidden bg-gray-700 rounded">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-2 rounded bg-cyan-400"
        />
      </div>
    </div>
  );
}

function MiniBarChart({ data, max }) {
  const chartHeight = 70;

  return (
    <div className="grid w-full grid-cols-3 gap-3 mt-4">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center">
          {/* BAR */}
          <div className="flex items-end justify-center h-24">
            <motion.div
              initial={{ height: 0 }}
              animate={{
                height: Math.max((d.value / max) * chartHeight, 4),
              }}
              transition={{ duration: 0.4 }}
              className="relative flex items-start justify-center w-6 text-xs text-white rounded-t bg-cyan-400"
            >
              <p className="absolute -top-5">{d.value}</p>
            </motion.div>
          </div>

          {/* LABEL */}
          <div className="mt-1 text-xs text-center text-gray-400">
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchItem({ match: m }) {
  return (
    <Link href={"/match/" + m._id} className="">
      <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-white transition-colors duration-300 rounded-t-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-sm group-hover:text-cyan-300">
        <span className="z-10">{formatISODate(m.createdAt)}</span>
        {/* STATUS */}
        <span
          className={`text-xs px-2 py-[0.5] rounded-full font-medium ${
            m.status === "En cours"
              ? "bg-green-500/20 text-green-400 animate-pulse"
              : "bg-gray-700 text-gray-300"
          }`}
        >
          {m.status}
        </span>

        {/* underline animée */}
        <span
          className="
      absolute left-0 bottom-0 h-[0.8px] w-full
      bg-cyan-400
      origin-left
      scale-x-0
      transition-transform duration-300 ease-out
      group-hover:scale-x-100
    "
        />
      </div>
      <div className="flex justify-between p-3">
        <div className="flex flex-col justify-between">
          {/* PLAYERS */}
          <div className="grid grid-cols-2 gap-3">
            <h2 className="font-semibold leading-tight text-md">
              {formatName(m.player_name)}
            </h2>
          </div>
          <h1 className="font-semibold leading-tight text-md">
            {formatName(m.opponent_name)}
          </h1>
        </div>

        {/* SCORE */}
        <div className="flex justify-end gap-8">
          <div className="flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-3">
              {m.score.sets_player.map((s, i) => {
                const opponentScore = m.score.sets_opponent[i];
                const isHigher = s > opponentScore;

                return (
                  <span
                    key={i}
                    className={isHigher ? "text-yellow-400 font-bold" : ""}
                  >
                    {s}
                  </span>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {m.score.sets_opponent.map((s, i) => {
                const playerScore = m.score.sets_player[i];
                const isHigher = s > playerScore;

                return (
                  <span
                    key={i}
                    className={isHigher ? "text-yellow-400 font-bold" : ""}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-xs text-cyan-400">
              <ChevronRight />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
