"use client";

import { useEffect, useState, useRef } from "react";
import ScoreBoard from "@/components/ScoreBoard";

export default function PublicLiveScore() {
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

  /* =========================
     LIST VIEW
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

              <div className="text-xs text-gray-400">
                {m.status}
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