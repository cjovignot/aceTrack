"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConnectPage() {
  const params = useSearchParams();
  const token = params.get("token");

  const [matches, setMatches] = useState([]);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    const res = await fetch("/api/matches", {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": pairingToken,
      },
    });
    const data = await res.json();
    setMatches(data);
  }

  async function connect(match_id) {
    await fetch("/api/pairing/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pairing-token": pairingToken,
      },
      body: JSON.stringify({ token, match_id }),
    });

    alert("Montre connectée !");
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Choisir un match</h2>

      {matches.map((m) => (
        <button
          key={m._id}
          onClick={() => connect(m._id)}
          style={{ display: "block", marginBottom: 10 }}
        >
          {m.player1} vs {m.player2}
        </button>
      ))}
    </div>
  );
}
