"use client";

import { useEffect, useState, useRef } from "react";
import ScoreBoard from "@/components/ScoreBoard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatName, formatISODate } from "@/lib/format";

export default function PublicLiveScore() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [matches, setMatches] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);

  const [match, setMatch] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const intervalRef = useRef(null);

  /* =========================
     LOAD MATCH LIST
  ========================= */
  useEffect(() => {
    loadMatches();
  }, [filter, search]);

  async function loadMatches() {
    setLoading(true);

    const params = new URLSearchParams();

    if (filter !== "all") {
      params.append("status", filter);
    }

    if (search) {
      params.append("search", search);
    }

    try {
      const res = await fetch(`/api/public/matches?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();

      // 🔥 TRI : live en premier
      const sorted = [...data].sort((a, b) => {
        if (a.status === "En cours" && b.status !== "En cours") return -1;
        if (b.status === "En cours" && a.status !== "En cours") return 1;
        return 0;
      });

      setMatches(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     LOAD LIVE MATCH
  ========================= */
  useEffect(() => {
    if (!selectedToken) return;

    loadMatch(selectedToken);
    loadPoints(selectedToken);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        const resMatch = await fetch(
          `/api/public/match?token=${selectedToken}`,
        );
        if (!resMatch.ok) return;

        const matchData = await resMatch.json();
        setMatch(matchData);

        if (matchData.status === "Terminé") {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return;
        }

        const resPoints = await fetch(
          `/api/public/match-points?token=${selectedToken}`,
        );

        if (resPoints.ok) {
          const pts = await resPoints.json();
          setPoints(pts || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(intervalRef.current);
  }, [selectedToken]);

  /* =========================
     HELPERS
  ========================= */
  function highlight(text, query) {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));

    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="font-bold text-yellow-400">
          {part}
        </span>
      ) : (
        part
      ),
    );
  }

  async function loadMatch(token) {
    const res = await fetch(`/api/public/match?token=${token}`);
    if (!res.ok) return;
    setMatch(await res.json());
  }

  async function loadPoints(token) {
    const res = await fetch(`/api/public/match-points?token=${token}`);
    if (!res.ok) return;
    setPoints((await res.json()) || []);
  }

  const winnerLabel =
    match?.winner === "player"
      ? match.player_name
      : match?.winner === "opponent"
        ? match.opponent_name
        : null;

  /* =========================
     LIST VIEW
  ========================= */
  if (!selectedToken) {
    return (
      <div className="min-h-screen p-6 text-white">
        {/* HEADER */}
        <div className="mb-6 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">
            AceTrack Live Scores
          </h1>

          <input
            type="text"
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 transition bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* FILTERS */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "all", label: "Tous" },
            { key: "live", label: "En cours" },
            { key: "finished", label: "Terminés" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm transition ${
                filter === f.key
                  ? "bg-cyan-400 text-black font-semibold"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="mb-4 text-sm text-gray-500 animate-pulse">
            Chargement...
          </div>
        )}

        {/* EMPTY */}
        {matches.length === 0 && !loading && (
          <div className="py-20 text-center text-gray-500">
            <div className="text-lg">Aucun match</div>
            <div className="mt-2 text-sm">
              Essaie une autre recherche ou filtre
            </div>
          </div>
        )}

        {/* MATCH LIST */}
        <div className="grid gap-4">
          {matches.map((m) => (
            <button
              key={m._id}
              onClick={() => setSelectedToken(m.public_token)}
              className="text-left transition duration-100 border-gray-800 shadow-lg group rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 hover:border-cyan-400 hover:shadow-cyan-500/10"
            >
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
                      {highlight(formatName(m.player_name), search)}
                    </h2>
                  </div>
                  <h1 className="font-semibold leading-tight text-md">
                    {highlight(formatName(m.opponent_name), search)}
                  </h1>
                </div>

                {/* SCORE */}
                <div className="flex flex-col justify-between">
                  <div className="grid grid-cols-3 gap-3">
                    {m.score.sets_player.map((s, i) => {
                      const opponentScore = m.score.sets_opponent[i];
                      const isHigher = s > opponentScore;

                      return (
                        <span
                          key={i}
                          className={
                            isHigher ? "text-yellow-400 font-bold" : ""
                          }
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
                          className={
                            isHigher ? "text-yellow-400 font-bold" : ""
                          }
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
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* =========================
     LIVE VIEW
  ========================= */
  return (
    <div>
      {/* BACK BUTTON */}
      <button
        onClick={() => setSelectedToken(null)}
        className="absolute flex items-center gap-1 text-sm text-gray-400 top-6 left-6 hover:text-white"
      >
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="flex items-center justify-center min-h-screen p-6 text-white">
        {match ? (
          <>
            <ScoreBoard
              match={match}
              score={match.score}
              points={points}
              matchStatus={match.status}
              playerName={match.player_name}
              opponentName={match.opponent_name}
            />

            {match.status === "Terminé" && (
              <div className="absolute text-sm text-center text-yellow-400 bottom-6">
                <div>Match terminé</div>
                {winnerLabel && <div>Vainqueur : {winnerLabel}</div>}
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-400 animate-pulse">Chargement...</p>
        )}
      </div>
    </div>
  );
}
