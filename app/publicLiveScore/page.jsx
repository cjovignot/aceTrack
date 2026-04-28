"use client";

import { useEffect, useState, useRef } from "react";
import ScoreBoard from "@/components/ScoreBoard";

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
          `/api/public/match?token=${selectedToken}`
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
          `/api/public/match-points?token=${selectedToken}`
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
        <span key={i} className="text-yellow-400 font-bold">
          {part}
        </span>
      ) : (
        part
      )
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
      <div className="min-h-screen bg-black text-white p-6">
        {/* HEADER */}
        <div className="mb-6 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Live Scores
          </h1>

          <input
            type="text"
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
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
          <div className="text-sm text-gray-500 mb-4 animate-pulse">
            Chargement...
          </div>
        )}

        {/* EMPTY */}
        {matches.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-lg">Aucun match</div>
            <div className="text-sm mt-2">
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
              className="group p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 hover:border-cyan-400 transition-all duration-200 text-left shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="flex justify-between items-start">
                {/* PLAYERS */}
                <div>
                  <div className="font-semibold text-lg leading-tight">
                    {highlight(m.player_name, search)}
                  </div>
                  <div className="text-gray-500 text-sm">
                    vs {highlight(m.opponent_name, search)}
                  </div>
                </div>

                {/* STATUS */}
                <div
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    m.status === "En cours"
                      ? "bg-green-500/20 text-green-400 animate-pulse"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {m.status}
                </div>
              </div>

              {/* SCORE */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-2xl font-bold tracking-wider">
                  {m.score?.sets_player?.join(" ")}
                  <span className="text-gray-500 mx-2">-</span>
                  {m.score?.sets_opponent?.join(" ")}
                </div>

                <div className="text-xs text-gray-500">
                  Voir →
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
    <div className="relative flex items-center justify-center min-h-screen text-white bg-black">
      {/* BACK BUTTON */}
      <button
        onClick={() => setSelectedToken(null)}
        className="absolute top-6 left-6 text-sm text-gray-400 hover:text-white"
      >
        ← Retour
      </button>

      {match ? (
        <>
          <ScoreBoard
            score={match.score}
            points={points}
            matchStatus={match.status}
            playerName={match.player_name}
            opponentName={match.opponent_name}
          />

          {match.status === "Terminé" && (
            <div className="absolute bottom-6 text-center text-yellow-400 text-sm">
              <div>Match terminé</div>
              {winnerLabel && (
                <div>Vainqueur : {winnerLabel}</div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-400 animate-pulse">
          Chargement...
        </p>
      )}
    </div>
  );
}