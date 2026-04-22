export default function ScoreBoard({
  score,
  playerName,
  opponentName,
  compact = false,
}) {
  if (!score) return null;
  const sP = score.sets_player || [];
  const sO = score.sets_opponent || [];
  const sets = Math.max(sP.length, sO.length);

  const fmtName = (n) => {
    if (!n) return "?";
    const parts = n.trim().split(" ");
    return parts.length === 1
      ? parts[0].toUpperCase()
      : parts[0][0].toUpperCase() +
          ". " +
          parts.slice(1).join(" ").toUpperCase();
  };

  if (compact) {
    return (
      <div
        className="inline-block text-xs text-white bg-black/85"
        style={{ backdropFilter: "blur(4px)" }}
      >
        <div
          className="grid border-b border-white/10"
          style={{
            gridTemplateColumns: "90px repeat(" + sets + ", 20px) 28px",
          }}
        >
          <div className="px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-white/40">
            Joueur
          </div>
          {Array.from({ length: sets }).map((_, i) => (
            <div
              key={i}
              className="text-center py-0.5 text-[8px] text-white/40"
            >
              S{i + 1}
            </div>
          ))}
          <div className="text-center py-0.5 text-[8px] text-white/40">Pts</div>
        </div>
        {[
          ["player", playerName, sP, score.current_game_player],
          ["opponent", opponentName, sO, score.current_game_opponent],
        ].map(([who, name, sets_arr, pts], ri) => (
          <div
            key={who}
            className={"grid " + (ri === 0 ? "border-b border-white/10" : "")}
            style={{
              gridTemplateColumns: "90px repeat(" + sets + ", 20px) 28px",
            }}
          >
            <div className="px-1.5 py-1 flex items-center gap-1">
              {score.serving === who ? (
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
              ) : (
                <div className="w-1.5 h-1.5 flex-shrink-0" />
              )}
              <span className="font-semibold text-[10px] truncate">
                {fmtName(name)}
              </span>
            </div>
            {Array.from({ length: sets }).map((_, i) => (
              <div key={i} className="py-1 text-xs font-bold text-center">
                <span
                  className={
                    (sets_arr[i] || 0) > (who === "player" ? sO[i] : sP[i] || 0)
                      ? "text-yellow-400"
                      : "text-white/70"
                  }
                >
                  {sets_arr[i] ?? ""}
                </span>
              </div>
            ))}
            <div className="py-1 text-sm font-bold text-center text-yellow-400">
              {pts || "0"}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      // className="p-4 shadow-sm bg-gray-700/80 rounded-2xl"
      className="p-5 border border-cyan-300/80 bg-gray/85 rounded-2xl"
    >
      <div className="mb-6 font-bold tracking-wider text-center text-green-600 uppercase text-md">
        Set {(score.current_set || 0) + 1}
      </div>
      <div className="w-full">
        {/* HEADER */}
        <div
          className="grid items-center pb-3 text-xs text-gray-400"
          style={{
            gridTemplateColumns: `1fr repeat(${sP.length}, 40px) 60px`,
          }}
        >
          <div className="font-bold text-left text-md">JOUEUR</div>

          {sP.map((_, i) => (
            <div key={i} className="font-bold text-center text-md">
              SET {i + 1}
            </div>
          ))}

          <div className="font-bold text-right text-md">PTS</div>
        </div>

        {/* ROWS */}
        {[
          ["player", playerName, sP, score.current_game_player],
          ["opponent", opponentName, sO, score.current_game_opponent],
        ].map(([who, name, sets_arr, pts], ri) => (
          <div
            key={who}
            className={
              "grid items-center py-3 " +
              (ri === 0 ? "border-b border-gray-800" : "")
            }
            style={{
              gridTemplateColumns: `1fr repeat(${sP.length}, 40px) 60px`,
            }}
          >
            {/* PLAYER NAME */}
            <div className="flex items-center min-w-0 gap-2 pr-2">
              {score.serving === who && (
                <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full" />
              )}
              <span className="text-sm text-white truncate">
                {name || "Joueur"}
              </span>
            </div>

            {/* SETS */}
            {sets_arr.map((g, i) => (
              <div key={i} className="text-center">
                <span
                  className={
                    "text-lg font-bold " +
                    (g > (who === "player" ? sO[i] || 0 : sP[i] || 0)
                      ? "text-green-600"
                      : "text-gray-400")
                  }
                >
                  {g}
                </span>
              </div>
            ))}

            {/* POINTS FIXED RIGHT */}
            <div className="text-right">
              <span className="text-xl font-bold text-yellow-500">
                {pts || "0"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
