"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConnectPage() {
  const params = useSearchParams();
  const router = useRouter(); // ✅

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
        "x-pairing-token": token,
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
        "x-pairing-token": token,
      },
      body: JSON.stringify({ token, match_id }),
    });

    // ✅ UX propre (optionnel)
    const ok = confirm("Montre connectée ! Aller au stream ?");

    if (ok) {
      router.push(`/stream?matchId=${match_id}`);
    }
  }

  return (
    <div className="max-w-xl px-4 py-8 mx-auto">
      <h2 className="mb-2 text-2xl font-bold">Connecter la montre</h2>
      <p className="mb-6 text-sm text-gray-400">
        Sélectionnez un match en cours pour synchroniser le score en direct
      </p>

      {matches.length === 0 ? (
        <div className="p-6 text-center bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm text-gray-500">Aucun match en cours</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((m) => (
            <button
              key={m._id}
              onClick={() => connect(m._id)}
              className="flex items-center justify-between w-full p-4 text-left transition bg-white border border-gray-200 rounded-2xl hover:border-black hover:shadow-sm"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {m.player_name} <span className="text-gray-400">vs</span>{" "}
                  {m.opponent_name}
                </p>
                <p className="mt-1 text-xs text-gray-400">Match en cours</p>
              </div>

              <div className="text-xs font-semibold text-green-600">
                Connecter →
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
