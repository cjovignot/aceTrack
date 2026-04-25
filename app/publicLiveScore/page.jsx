"use client";

import { useEffect, useRef, useState } from "react";

export default function PublicLiveScore() {
  const [pairingToken, setPairingToken] = useState(null);
  const [publicToken, setPublicToken] = useState(null);
  const [match, setMatch] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const pairingIntervalRef = useRef(null);
  const matchIntervalRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const hasStarted = useRef(false);

  // ---------- INIT ----------
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    createPairing();
  }, []);

  // ---------- CREATE PAIRING (viewer) ----------
  async function createPairing() {
    const res = await fetch("/api/pairing/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "viewer" }), // 🔥 important
    });

    if (!res.ok) return;

    const data = await res.json();
    if (!data.token) return;

    setPairingToken(data.token);
    startPairingPolling(data.token);
  }

  // ---------- POLLING PAIRING ----------
  function startPairingPolling(token) {
    if (pairingIntervalRef.current) return;

    pairingIntervalRef.current = setInterval(async () => {
      const res = await fetch(`/api/pairing/${token}`);
      if (!res.ok) return;

      const data = await res.json();

      // 🔥 on attend le public_token (clé du système)
      if (data.connected && data.public_token) {
        setIsConnected(true);
        setPublicToken(data.public_token);

        clearInterval(pairingIntervalRef.current);
        pairingIntervalRef.current = null;
      }
    }, 1500);
  }

  // ---------- MATCH POLLING (PUBLIC) ----------
  useEffect(() => {
    if (!publicToken) return;

    async function loadMatch() {
      const res = await fetch(
        `/api/public/match?token=${publicToken}`
      );

      if (!res.ok) return;

      const data = await res.json();
      setMatch(data);

      startMatchPolling(publicToken);
    }

    loadMatch();

    return () => clearInterval(matchIntervalRef.current);
  }, [publicToken]);

  function startMatchPolling(token) {
    if (matchIntervalRef.current) return;

    matchIntervalRef.current = setInterval(async () => {
      const res = await fetch(
        `/api/public/match?token=${token}`
      );

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

  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ---------- QR CODE ---------- */}
      {!isConnected && pairingToken && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#4ade80", marginBottom: 10 }}>
            Scannez pour afficher le score en direct
          </p>

          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
              `${window.location.origin}/connect?token=${pairingToken}`
            )}`}
            width={220}
          />
        </div>
      )}

      {/* ---------- SCORE ---------- */}
      {isConnected && match && (
        <div style={{ textAlign: "center" }}>
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
      )}
    </div>
  );
}