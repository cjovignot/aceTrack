"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConnectPage() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");

  const [matches, setMatches] = useState([]);

  // ✅ modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

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

    // 👉 au lieu de confirm()
    setSelectedMatch(match_id);
    setShowModal(true);
  }

  function isInPWA() {
    return window.matchMedia("(display-mode: standalone)").matches;
  }

  function goToStream() {
    router.push(`/stream?matchId=${selectedMatch}`);
  }

  function openInApp() {
    const url = `/stream?matchId=${selectedMatch}`;

    // tentative ouverture PWA
    window.location.href = url;

    // fallback navigateur
    setTimeout(() => {
      window.open(url, "_blank");
    }, 500);
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

      {/* ✅ MODAL */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
            <h3 className="mb-2 text-lg font-bold">
              Montre connectée ✅
            </h3>

            <p className="mb-4 text-sm text-gray-500">
              Où veux-tu continuer ?
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={goToStream}
                className="w-full p-3 text-white bg-black rounded-xl"
              >
                Aller au stream
              </button>

              {!isInPWA() && (
                <button
                  onClick={openInApp}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                >
                  Ouvrir dans l’app
                </button>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full p-2 text-sm text-gray-400"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}