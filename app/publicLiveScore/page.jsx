"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PublicLivePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [match, setMatch] = useState(null);

  const intervalRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // ---------- LOAD + POLLING ----------
  useEffect(() => {
    if (!token) return;

    async function loadMatch() {
      const res = await fetch(`/api/public/match?token=${token}`);
      if (!res.ok) return;

      const data = await res.json();
      setMatch(data);
      startPolling();
    }

    loadMatch();

    return () => clearInterval(intervalRef.current);
  }, [token]);

  function startPolling() {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/public/match?token=${token}`);
      if (!res.ok) return;

      const updated = await res.json();

      const serverTime = new Date(updated.updatedAt || 0).getTime();

      if (serverTime <= lastUpdateRef.current) return;

      lastUpdateRef.current = serverTime;
      setMatch(updated);
    }, 2000);
  }

  // ---------- UI ----------
  const score = match?.score || {};

  if (!token) {
    return <div>Token manquant</div>;
  }

  if (!match) {
    return <div>Chargement...</div>;
  }

  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 32 }}>
        <div>
          {score.sets_opponent?.join(" ")} |{" "}
          {score.current_game_opponent || 0}
        </div>

        <div style={{ marginTop: 10 }}>
          {score.sets_player?.join(" ")} |{" "}
          {score.current_game_player || 0}
        </div>
      </div>
    </div>
  );
}