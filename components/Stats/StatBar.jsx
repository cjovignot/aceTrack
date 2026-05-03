import React from "react";

export default function StatBar({
  label,
  playerUnits,
  opponentUnits,
  playerRatio,
  opponentRatio,
  isPercent = false,
}) {
  const playerU = Number(playerUnits) || 0;
  const opponentU = Number(opponentUnits) || 0;

  // ---------------- MODE PERCENT ----------------
  if (isPercent) {
    const p = Number(playerRatio) || 0;
    const o = Number(opponentRatio) || 0;

    const pWidth = p / 2;
    const oWidth = o / 2;

    return (
      <div className="space-y-1">
        {/* LABEL */}
        <div className="text-xs text-gray-400">{label}</div>

        <div className="flex items-center gap-2">
          {/* UNITS LEFT */}
          <span className="w-5 text-xs text-right text-green-500">
            {playerU || ""}
          </span>

          {/* BAR */}
          <div className="relative flex items-center flex-1 h-3 overflow-hidden rounded-full">
            {/* center line */}
            <div className="absolute w-px h-full -translate-x-1/2 left-1/2 bg-white/30" />

            {/* player side */}
            <div
              className="absolute h-full bg-green-500 rounded-l-full right-1/2"
              style={{ width: `${pWidth}%` }}
            />

            {/* opponent side */}
            <div
              className="absolute h-full bg-orange-400 rounded-r-full left-1/2"
              style={{ width: `${oWidth}%` }}
            />

            {/* % INSIDE BAR */}
            <div className="relative flex justify-between w-full px-1 text-[10px] font-medium">
              <span className="text-white/80">{p.toFixed(0)}%</span>
              <span className="text-white/80">{o.toFixed(0)}%</span>
            </div>
          </div>

          {/* UNITS RIGHT */}
          <span className="w-5 text-xs text-orange-400">{opponentU || ""}</span>
        </div>
      </div>
    );
  }

  // ---------------- MODE UNITÉS ----------------
  const max = Math.max(playerU, opponentU, 1);

  const pPct = (playerU / max) * 100;
  const oPct = (opponentU / max) * 100;

  const isPlayerBetter = playerU > opponentU;

  return (
    <div className="space-y-1">
      {/* LABEL */}
      <div className="text-xs text-gray-400">{label}</div>

      <div className="flex items-center gap-2">
        {/* UNITS LEFT */}
        <span className="w-5 text-xs text-right text-green-500">{playerU}</span>

        {/* BAR */}
        <div className="relative flex flex-1 h-2 overflow-hidden rounded-full">
          {/* PLAYER */}
          <div
            className={`transition-all ${
              isPlayerBetter ? "bg-green-500" : "bg-green-600/60"
            } ${pPct > 0 ? "rounded-full" : ""}`}
            style={{ width: `${pPct}%` }}
          />

          {/* OPPONENT */}
          <div
            className={`transition-all ${
              !isPlayerBetter ? "bg-orange-400" : "bg-orange-500/60"
            } ${oPct > 0 ? "rounded-r-full" : ""}`}
            style={{ width: `${oPct}%` }}
          />

          {/* center hint */}
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/40 pointer-events-none">
            {pPct.toFixed(0)}% | {oPct.toFixed(0)}%
          </div>
        </div>

        {/* UNITS RIGHT */}
        <span className="w-5 text-xs text-orange-400">{opponentU}</span>
      </div>
    </div>
  );
}
