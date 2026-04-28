"use client";

import { useEffect, useState, useRef } from "react";
import ScoreBoard from "@/components/ScoreBoard";

export default function PublicLiveScore() {
  const [search, setSearch] = useState("");
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
    const q = search.toLowerCase();

    return (
      m.player_first_name?.toLowerCase().includes(q) ||
      m.player_last_name?.toLowerCase().includes(q) ||
      m.opponent_first_name?.toLowerCase().includes(q) ||
      m.opponent_last_name?.toLowerCase().includes(q)
    );
  })
  .sort((a, b) => {
    const nameA = `${a.player_last_name} ${a.player_first_name}`.toLowerCase();
    const nameB = `${b.player_last_name} ${b.player_first_name}`.toLowerCase();
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
              <div className="font-semibold text-lg">
                {m.player_first_name} {m.player_last_name}
                <span className="text-gray-500 mx-2">vs</span>
                {m.opponent_first_name} {m.opponent_last_name}
              </div>

              <div className="text-xs text-gray-400 group-hover:text-white transition">
                {m.status}
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