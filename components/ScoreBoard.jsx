import React from "react";

export default function ScoreBoard({
  score,
  points = [],
  playerName,
  opponentName,
  compact = false,
}) {
  if (!score) return null;

  const sP = score.sets_player || [];
  const sO = score.sets_opponent || [];
  const sets = Math.max(sP.length, sO.length);

  /* =========================
     🧠 SAFE JSON PARSE
  ========================= */
  const parseScore = (p) => {
    if (!p?.score_at_point) return null;

    try {
      return JSON.parse(p.score_at_point);
    } catch {
      return null;
    }
  };

  /* =========================
     🎯 MATCH START DETECTION
  ========================= */
  const getMatchStartTimestamp = (pts) => {
    if (!pts?.length) return null;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.is_deleted) continue;

      const sc = parseScore(p);
      if (!sc) continue;

      const isStart =
        (sc.sets_player?.[0] ?? 0) === 0 &&
        (sc.sets_opponent?.[0] ?? 0) === 0 &&
        (sc.current_set ?? 0) === 0;

      if (isStart) {
        const ms = new Date(p.timestamp).getTime();
        if (Number.isFinite(ms)) return ms;
      }
    }

    return null;
  };

  /* =========================
     ⏱️ LIVE TIMER
  ========================= */
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* =========================
     🧠 TIMESTAMPS
  ========================= */
  const firstPointTs = React.useMemo(
    () => getMatchStartTimestamp(points),
    [points]
  );

  const lastPointTs = React.useMemo(() => {
    const valid = points?.filter((p) => !p.is_deleted);
    if (!valid?.length) return null;

    const ms = new Date(valid[valid.length - 1].timestamp).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [points]);

  const isFinished =
    score.status === "Terminé" || score.status === "finished";

  /* =========================
     🧮 SAFE DURATION
  ========================= */
  const safeStart =
    firstPointTs ??
    (points?.[0] ? new Date(points[0].timestamp).getTime() : null) ??
    (score.createdAt?.$date
      ? new Date(score.createdAt.$date).getTime()
      : null);

  const rawDuration =
    safeStart != null
      ? (isFinished ? lastPointTs ?? now : now) - safeStart
      : 0;

  const duration =
    Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;

  /* =========================
     ⏱️ FORMAT DURATION
  ========================= */
  const formatDuration = (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return "00:00";

    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;

    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  /* =========================
     🧾 FORMAT NAME
  ========================= */
  const fmtName = (n) => {
    if (!n) return "?";
    const parts = n.trim().split(" ");
    return parts.length === 1
      ? parts[0].toUpperCase()
      : parts[0][0].toUpperCase() +
          ". " +
          parts.slice(1).join(" ").toUpperCase();
  };

  /* =========================
     ROW
  ========================= */
  const Row = ({ who, name, sets_arr, pts }) => {
    const isPlayer = who === "player";
    const oppSets = isPlayer ? sO : sP;

    return (
      <div
        className="grid items-center py-3 border-b border-white/10"
        style={{
          gridTemplateColumns: `18px 1.2fr repeat(${sets}, 44px) 70px`,
        }}
      >
        {/* SERVICE */}
        <div className="flex items-center justify-center">
          <div
            className={
              "w-2.5 h-2.5 rounded-full transition-all " +
              (score.serving === who
                ? "bg-yellow-400 shadow-[0_0_8px_rgba(255,215,0,0.8)]"
                : "opacity-0")
            }
          />
        </div>

        {/* NAME */}
        <div className="flex items-center min-w-0 pr-2">
          <span className="text-sm font-semibold tracking-wide text-white uppercase truncate">
            {fmtName(name)}
          </span>
        </div>

        {/* SETS */}
        {sets_arr.map((g, i) => {
          const opp = oppSets[i] || 0;
          const lead = g > opp;

          return (
            <div key={i} className="text-center">
              <span
                className={
                  "text-lg font-bold tabular-nums " +
                  (lead ? "text-yellow-400" : "text-white/60")
                }
              >
                {g}
              </span>
            </div>
          );
        })}

        {/* POINTS */}
        <div className="pr-2 text-right">
          <span className="text-2xl font-bold text-yellow-400 tabular-nums">
            {pts || "0"}
          </span>
        </div>
      </div>
    );
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="w-full max-w-3xl p-4 mx-auto overflow-hidden border border-white/10 rounded-xl bg-gradient-to-b from-black/95 to-black/80 backdrop-blur-md">
      {/* HEADER */}
      <div
        className="grid items-center px-3 py-2 text-xs text-white/50 uppercase tracking-[0.2em]"
        style={{
          gridTemplateColumns: `18px 1.2fr repeat(${sets}, 44px) 70px`,
        }}
      >
        <div></div>
        <div>Joueur</div>

        {Array.from({ length: sets }).map((_, i) => (
          <div key={i} className="text-center">
            S{i + 1}
          </div>
        ))}

        <div className="text-right">Points</div>
      </div>

      {/* ROWS */}
      <Row
        who="player"
        name={playerName}
        sets_arr={sP}
        pts={score.current_game_player}
      />
      <Row
        who="opponent"
        name={opponentName}
        sets_arr={sO}
        pts={score.current_game_opponent}
      />

      {/* FOOTER */}
      <div className="px-3 py-2 text-xs text-white/40 bg-black/60 flex justify-between items-center">
        <span>
          SET {(score.current_set || 0) + 1} • SERVICE{" "}
          {score.serving === "player"
            ? fmtName(playerName)
            : fmtName(opponentName)}
        </span>

        {/* ⏱️ MATCH DURATION */}
        <span className="font-mono text-white/60">
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}