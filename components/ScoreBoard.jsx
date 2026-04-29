import React from "react";

export default function ScoreBoard({
  score,
  points = [],
  matchStatus,
  durationMinutes,
  playerName,
  opponentName,
  match,
}) {
  if (!score) return null;

  const sP = score.sets_player || [];
  const sO = score.sets_opponent || [];
  const sets = Math.max(sP.length, sO.length);

  /* =========================
     ⏱️ LIVE CLOCK
  ========================= */
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* =========================
     🧠 TIMESTAMPS
  ========================= */
  const matchStartTs = React.useMemo(() => {
    if (match?.match_date_start === null) return "En préparation";

    const ms = new Date(match.match_date_start).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [match]);

  const lastPointTs = React.useMemo(() => {
    const valid = points.filter((p) => !p.is_deleted);
    if (!valid.length) return null;

    const ms = new Date(valid.at(-1).timestamp).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [points]);

  const isFinished = matchStatus === "Terminé";

  /* =========================
     🧮 DURATION SAFE
  ========================= */
  const start = matchStartTs;

  const rawDuration =
    start != null ? (isFinished ? (lastPointTs ?? now) : now) - start : 0;

  const liveDuration =
    Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;

  const duration =
    isFinished && durationMinutes != null
      ? durationMinutes * 60 * 1000
      : liveDuration;

  /* =========================
     ⏱️ FORMAT
  ========================= */
  const formatDuration = (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return "00:00:00";

    const totalSec = Math.floor(ms / 1000);

    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (iso) => {
    if (iso === null) return "Joueurs en préparation";
    const date = new Date(iso);

    const day = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(
      date,
    );
    const dayNum = date.getDate();
    const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(
      date,
    );
    const year = date.getFullYear();

    const time = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

    return `${day} ${dayNum} ${month} ${year} - ${time}`;
  };

  const formatMatchDuration = (iso) => {
    if (!iso) return "00:00";

    const start = new Date(iso);
    const now = match.match_date_end
      ? new Date(match.match_date_end)
      : new Date();

    let diff = Math.floor((now - start) / 1000); // en secondes

    if (diff < 0) diff = 0; // sécurité si date future

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    const pad = (n) => String(n).padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }

    return `${pad(minutes)}:${pad(seconds)}`;
  };

  /* =========================
     NAME FORMAT
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
    const oppSets = who === "player" ? sO : sP;

    return (
      <div
        className="grid items-center py-3 border-b border-white/10"
        style={{
          gridTemplateColumns: `18px 1.2fr repeat(${sets}, 44px) 70px`,
        }}
      >
        <div className="flex justify-center">
          <div
            className={
              "w-2.5 h-2.5 rounded-full " +
              (score.serving === who ? "bg-yellow-400" : "opacity-0")
            }
          />
        </div>

        <div className="text-sm font-semibold text-white uppercase truncate">
          {fmtName(name)}
        </div>

        {sets_arr.map((g, i) => {
          const opp = oppSets[i] || 0;
          const lead = g > opp;

          return (
            <div key={i} className="text-center">
              <span
                className={
                  "font-bold tabular-nums " +
                  (lead ? "text-yellow-400" : "text-white/60")
                }
              >
                {g}
              </span>
            </div>
          );
        })}

        <div className="font-bold text-right text-yellow-400">{pts || "0"}</div>
      </div>
    );
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="w-full max-w-3xl p-4 mx-auto border border-white/10 rounded-xl bg-black/90">
      {/* HEADER */}
      <div
        className="grid mb-2 text-xs uppercase text-white/50"
        style={{
          gridTemplateColumns: `18px 1.2fr repeat(${sets}, 44px) 70px`,
        }}
      >
        <div />
        <div>Joueur</div>
        {Array.from({ length: sets }).map((_, i) => (
          <div key={i} className="text-center">
            S{i + 1}
          </div>
        ))}
        <div className="text-right">Pts</div>
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
      <div className="flex justify-between mt-3 text-xs text-white/40">
        <span>SET {(score.current_set || 0) + 1}</span>

        <span className="font-mono text-white/60">
          {formatMatchDuration(match?.match_date_start)}
        </span>
      </div>
    </div>
  );
}
