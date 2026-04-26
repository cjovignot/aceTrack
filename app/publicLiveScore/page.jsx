"use client";

import { useEffect, useState, useRef } from "react";
import ScoreBoard from "@/components/ScoreBoard";

export default function PublicLiveScore() {
  const [matches, setMatches] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);

  const [match, setMatch] = useState(null);
  const [points, setPoints] = useState([]); // 👈 IMPORTANT

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
     LOAD MATCH + POINTS
  ========================= */
  useEffect(() => {
    if (!selectedToken) return;

    loadMatch(selectedToken);
    loadPoints(selectedToken); // 👈 AJOUT

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      loadMatch(selectedToken);
      loadPoints(selectedToken); // 👈 LIVE UPDATE
    }, 2000);

    return () => clearInterval(intervalRef.current);
  }, [selectedToken]);

  async function loadMatch(token) {
    const res = await fetch(`/api/public/match?token=${token}`);
    if (!res.ok) return;

    const data = await res.json();
    setMatch(data);
  }

  async function loadPoints(token) {
    const res = await fetch(`/api/public/match-points?token=${token}`);
    if (!res.ok) return;

    const data = await res.json();
    setPoints(data || []);
  }

  /* =========================
     UI: LIST
  ========================= */
  if (!selectedToken) {
    return (
      <div className="p-4 text-white bg-black min-h-screen">
        <h1 className="mb-4 text-xl font-bold">Matchs en direct</h1>

        <div className="flex flex-col gap-3">
          {matches.map((m) => (
            <button
              key={m._id}
              onClick={() => setSelectedToken(m.public_token)}
              className="p-4 text-left border border-gray-700 rounded-xl hover:border-white"
            >
              <div className="font-semibold">
                {m.player_name} vs {m.opponent_name}
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
    <div className="flex items-center justify-center min-h-screen text-white bg-black">
      {match ? (
        <ScoreBoard
          score={match.score}
          points={points} // 👈 CRUCIAL FIX
          playerName={match.player_name}
          opponentName={match.opponent_name}
        />
      ) : (
        <p>Chargement...</p>
      )}
    </div>
  );
}