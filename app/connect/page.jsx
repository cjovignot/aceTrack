"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConnectPage() {
  const params = useSearchParams();
  const token = params.get("token");

  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!token) return;
    loadMatches();
  }, [token]);

  async function loadMatches() {
    const res = await fetch("/api/matches?status=En%20cours", {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": token, // ✅ FIX
      },
    });

    if (!res.ok) return;

    const data = await res.json();
    setMatches(data);
  }

  async function connect(match_id) {
    await fetch("/api/pairing/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": token, // ✅ FIX
      },
      body: JSON.stringify({ token, match_id }),
    });

    alert("Montre connectée !");
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Choisir un match en cours</h2>

      {matches.length === 0 && (
        <p style={{ color: "#666" }}>Aucun match en cours</p>
      )}

      {matches.map((m) => (
        <button
          key={m._id}
          onClick={() => connect(m._id)}
          style={{ display: "block", marginBottom: 10 }}
        >
          {m.player_name} vs {m.opponent_name}
        </button>
      ))}
    </div>
  );
}
