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

  const intervalRef = useRef(null);

  /* =========================
     LOAD MATCH LIST
  ========================= */
  useEffect(() => {
    loadMatches();
    const i = setInterval(loadMatches, 5000);
    return () => clearInterval(i);
  }, []);

  async function loadMatches() {
    const res = await fetch("/api/public/matches");
    if (!res.ok) return;
    const data = await res.json();
    setMatches(data);
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
    setPoints(await res.json() || []);
  }

  const winnerLabel =
    match?.winner === "player"
      ? match.player_name
      : match?.winner === "opponent"
        ? match.opponent_name
        : null;


const filteredMatches = matches
  .filter((m) => {
    // 🔍 SEARCH
    if (search) {
      const q = search.toLowerCase();
      const full = `${m.player_name} ${m.opponent_name}`.toLowerCase();

      if (!full.includes(q)) return false;
    }

    // 🎯 FILTER STATUS
    if (filter === "live" && m.status !== "En cours") return false;
    if (filter === "finished" && m.status !== "Terminé") return false;

    return true;
  })
  .sort((a, b) => {
    const nameA = `${a.player_name} vs ${a.opponent_name}`.toLowerCase();
    const nameB = `${b.player_name} vs ${b.opponent_name}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  /* =========================
     LIST VIEW
  ========================= */
if (!selectedToken) {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Matchs en direct</h1>

      {/* SEARCH BAR */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher un joueur ou adversaire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl bg-gray-900 border border-gray-700 focus:outline-none focus:border-white transition"
        />
      </div>
      
      <div className="flex gap-2 mb-4">
  {["all", "live", "finished"].map((f) => (
    <button
      key={f}
      onClick={() => setFilter(f)}
      className={`px-3 py-1 rounded-lg text-sm border ${
        filter === f
          ? "bg-white text-black"
          : "border-gray-700 text-gray-400"
      }`}
    >
      {f}
    </button>
  ))}
</div>

      {/* MATCH LIST */}
      <div className="grid gap-4">
        {filteredMatches.length === 0 && (
          <div className="text-gray-500 text-sm">
            Aucun match trouvé
          </div>
        )}

        {filteredMatches.map((m) => (
          <button
            key={m._id}
            onClick={() => setSelectedToken(m.public_token)}
            className="group p-4 rounded-2xl border border-gray-800 bg-gray-900 hover:bg-gray-800 hover:border-white transition-all duration-200 text-left"
          >
            <div className="flex justify-between items-center">
<div className="font-semibold text-md">
  {highlight(m.player_name, search)}
  <span className="text-cyan-300 mx-2">vs</span>
  {highlight(m.opponent_name, search)}
</div>

<div className={`text-xs px-2 py-1 rounded-full ${
  m.status === "En cours"
    ? "bg-green-500/20 text-green-400"
    : "bg-gray-700 text-gray-300"
}`}>
  {m.status}
</div>
<div className="text-sm text-gray-400 mt-1">
  {m.score?.sets_player?.join(" - ")} 
  {" / "}
  {m.score?.sets_opponent?.join(" - ")}
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
              {winnerLabel && <div>Vainqueur : {winnerLabel}</div>}
            </div>
          )}
        </>
      ) : (
        <p>Chargement...</p>
      )}
    </div>
  );
}