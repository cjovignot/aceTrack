"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import api from "../../lib/api";
import { addPoint } from "../../lib/tennisScoring";

// Map game score string to number of points
function gameScoreToNum(s) {
  if (!s || s === "0") return 0;
  if (s === "15") return 1;
  if (s === "30") return 2;
  if (s === "40") return 3;
  if (s === "AD") return 4;
  return parseInt(s) || 0;
}

// Returns "deuce" (right side) or "ad" (left side)
function getServeSide(score) {
  if (!score) return "deuce";
  const p = gameScoreToNum(score.current_game_player);
  const o = gameScoreToNum(score.current_game_opponent);
  return (p + o) % 2 === 0 ? "deuce" : "ad";
}

export default function WatchPage() {
  const params = useSearchParams();
  const matchId = params.get("matchId");

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastPoint, setLastPoint] = useState(null);
  const [serviceFaults, setServiceFaults] = useState(0);
  const [pointHistory, setPointHistory] = useState([]);

  useEffect(() => {
    // Black background fullscreen
    document.documentElement.style.cssText =
      "margin:0;padding:0;background:#000;height:100%;overflow:hidden";
    document.body.style.cssText =
      "margin:0;padding:0;background:#000;height:100%;overflow:hidden";
    return () => {
      document.documentElement.style.cssText = "";
      document.body.style.cssText = "";
    };
  }, []);

  useEffect(() => {
    const load = matchId
      ? api.get("/api/matches/" + matchId)
      : api
          .get("/api/matches?status=En%20cours&limit=1")
          .then((r) => ({ data: r.data[0] }));
    load
      .then((r) => {
        if (r.data) setMatch(r.data);
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  async function scorePoint(
    winner,
    shotType = "Coup droit",
    isWinner = true,
    isUnforcedError = false,
  ) {
    if (!match) return;
    setServiceFaults(0);
    const result = addPoint(match.score, winner);
    const newScore = result.score;
    const updates = { score: newScore };
    if (result.matchWon) {
      updates.status = "Terminé";
      updates.winner = result.matchWinner;
    }
    setMatch((m) => ({ ...m, ...updates }));
    setLastPoint(winner);
    setTimeout(() => setLastPoint(null), 600);
    await api.patch("/api/matches/" + match._id, updates);
    const pr = await api
      .post("/api/points", {
        match_id: match._id,
        point_winner: winner,
        shot_type: shotType,
        is_winner: isWinner,
        is_unforced_error: isUnforcedError,
        timestamp: new Date().toISOString(),
        set_number: newScore.current_set,
      })
      .catch(() => null);
    if (pr?.data)
      setPointHistory((prev) => [
        { id: pr.data._id, prevScore: match.score, prevStatus: match.status },
        ...prev,
      ]);
  }

  async function handleUndo() {
    if (pointHistory.length === 0 || !match) return;
    const { id, prevScore, prevStatus } = pointHistory[0];
    setPointHistory((prev) => prev.slice(1));
    setServiceFaults(0);
    setMatch((m) => ({
      ...m,
      score: prevScore,
      status: prevStatus,
      winner: undefined,
    }));
    await api.patch("/api/matches/" + match._id, {
      score: prevScore,
      status: prevStatus,
      winner: null,
    });
    await api.delete("/api/points/" + id).catch(() => {});
  }

  function handleServiceFault() {
    if (serviceFaults === 0) {
      setServiceFaults(1);
    } else {
      const server = match?.score?.serving;
      const receiver = server === "player" ? "opponent" : "player";
      scorePoint(receiver, "Double faute", false, true);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          background: "#000",
          color: "#fff",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "3px solid #333",
            borderTopColor: "#4ade80",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    );
  }

  if (!match) {
    return (
      <div
        style={{
          background: "#000",
          color: "#fff",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
        }}
      >
        <p style={{ color: "#555", fontSize: 13 }}>Aucun match en cours</p>
      </div>
    );
  }

  const score = match.score || {};
  const setsP = score.sets_player || [];
  const setsO = score.sets_opponent || [];
  const serving = score.serving;
  const isFinished = match.status === "Terminé";
  const serveSide = getServeSide(score);

  const cellBtn = (bg, active = false) => ({
    background: active ? "#facc15" : bg,
    color: active ? "#000" : "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    padding: 2,
    textAlign: "center",
    lineHeight: 1.2,
    whiteSpace: "pre-line",
  });

  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        position: "fixed",
        inset: 0,
        fontFamily: "-apple-system, system-ui, sans-serif",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr 1fr 1fr",
        gap: 3,
        padding: 3,
        boxSizing: "border-box",
      }}
    >
      {/* Zone 1 — Faute adversaire → point joueur */}
      <button
        onClick={() => scorePoint("player", "Faute directe", false, true)}
        style={cellBtn("#4a1515")}
      >
        Faute
      </button>

      {/* Zone 2 — Gagnant adversaire */}
      <button
        onClick={() => scorePoint("opponent", "Coup droit", true)}
        style={{
          ...cellBtn("#1e3a5f"),
          transform: lastPoint === "opponent" ? "scale(0.93)" : "scale(1)",
          transition: "transform 0.1s",
        }}
      >
        Gagnant
      </button>

      {/* Zone 3 — vide */}
      <div style={{ background: "#000" }} />

      {/* Zones 4/5/7/8 — Score display (2 cols × 2 rows) */}
      <div
        style={{
          gridColumn: "1 / 3",
          gridRow: "2 / 4",
          background: "#0a0a0a",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          position: "relative",
        }}
      >
        {/* Serve side ball */}
        <div
          style={{
            position: "absolute",
            ...(serving === "player"
              ? serveSide === "deuce"
                ? { bottom: 5, right: 5 }
                : { bottom: 5, left: 5 }
              : serveSide === "deuce"
                ? { top: 5, left: 5 }
                : { top: 5, right: 5 }),
            background: "#facc15",
            borderRadius: "50%",
            width: 10,
            height: 10,
          }}
        />

        {/* Adversaire (ligne du haut) */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {serving === "opponent" && (
            <span style={{ color: "#facc15", fontSize: 10 }}>●</span>
          )}
          {setsO.map((s, i) => (
            <span
              key={i}
              style={{
                color: s > (setsP[i] || 0) ? "#4ade80" : "#444",
                fontSize: 22,
                fontWeight: 700,
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {s}
            </span>
          ))}
          <span
            style={{
              color: "#facc15",
              fontSize: 30,
              fontWeight: 900,
              minWidth: 34,
              textAlign: "center",
            }}
          >
            {score.current_game_opponent || "0"}
          </span>
        </div>
        <div style={{ width: "70%", height: 1, background: "#222" }} />
        {/* Joueur (ligne du bas) */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {serving === "player" && (
            <span style={{ color: "#facc15", fontSize: 10 }}>●</span>
          )}
          {setsP.map((s, i) => (
            <span
              key={i}
              style={{
                color: s > (setsO[i] || 0) ? "#4ade80" : "#444",
                fontSize: 22,
                fontWeight: 700,
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {s}
            </span>
          ))}
          <span
            style={{
              color: "#facc15",
              fontSize: 30,
              fontWeight: 900,
              minWidth: 34,
              textAlign: "center",
            }}
          >
            {score.current_game_player || "0"}
          </span>
        </div>
      </div>

      {/* Zone 6 — Faute de service / Double faute */}
      <button
        onClick={handleServiceFault}
        style={{
          ...cellBtn(
            serviceFaults === 1 ? "#92400e" : "#2d1a00",
            serviceFaults === 1,
          ),
          gridColumn: "3",
          gridRow: "2",
          fontSize: 12,
        }}
      >
        {serviceFaults === 1 ? "Double faute" : "Faute service"}
      </button>

      {/* Zone 9 — Service gagnant */}
      <button
        onClick={() => scorePoint(serving, "Service gagnant", true)}
        style={{
          gridColumn: "3",
          gridRow: "3",
          background: "#1a1a2e",
          border: "1px solid #334",
          borderRadius: 6,
          color: "#a78bfa",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          lineHeight: 1.3,
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
        }}
      >
        Service gagnant
      </button>

      {/* Zone 10 — Faute joueur → point adversaire */}
      <button
        onClick={() => scorePoint("opponent", "Faute directe", false, true)}
        style={cellBtn("#4a1515")}
      >
        Faute
      </button>

      {/* Zone 11 — Gagnant joueur */}
      <button
        onClick={() => scorePoint("player", "Coup droit", true)}
        style={{
          ...cellBtn("#14532d"),
          transform: lastPoint === "player" ? "scale(0.93)" : "scale(1)",
          transition: "transform 0.1s",
        }}
      >
        Gagnant
      </button>

      {/* Zone 12 — Undo */}
      <button
        onClick={handleUndo}
        disabled={pointHistory.length === 0}
        style={{
          background: "#111",
          border: "1px solid #222",
          borderRadius: 6,
          color: pointHistory.length === 0 ? "#333" : "#888",
          fontWeight: 700,
          fontSize: 20,
          cursor: pointHistory.length === 0 ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        ↩
      </button>

      {/* Match terminé overlay */}
      {isFinished && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            color: "#4ade80",
          }}
        >
          {match.winner === "player" ? "🏆 Victoire !" : "💪 Défaite"}
        </div>
      )}
    </div>
  );
}
