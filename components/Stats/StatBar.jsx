import React from "react";

export default function StatBar({ label, playerValue, opponentValue }) {
  const total = playerValue + opponentValue;

  const playerPct = total > 0 ? (playerValue / total) * 100 : 0;
  const opponentPct = total > 0 ? (opponentValue / total) * 100 : 0;

  return (
    <div className="space-y-1">
      {/* LABEL */}
      <div className="text-xs text-gray-500">{label}</div>

      {/* VALUES + BAR */}
      <div className="flex items-center gap-2">
        {/* PLAYER VALUE */}
        <span className="text-xs font-semibold text-green-600">
          {playerValue}
        </span>

        {/* BAR */}
        <div className="flex flex-1 h-2 overflow-hidden bg-gray-200 rounded">
          {/* PLAYER SIDE */}
          <div
            className="h-2 transition-all duration-300 bg-green-600"
            style={{ width: `${playerPct}%` }}
          />

          {/* OPPONENT SIDE */}
          <div
            className="h-2 transition-all duration-300 bg-orange-400"
            style={{ width: `${opponentPct}%` }}
          />
        </div>

        {/* OPPONENT VALUE */}
        <span className="text-xs font-semibold text-orange-400">
          {opponentValue}
        </span>
      </div>

      {/* OPTIONAL PERCENTAGES */}
      <div className="flex justify-between text-[10px] text-gray-400">
        <span className="text-green-600">{playerPct.toFixed(0)}%</span>
        <span className="text-orange-400">{opponentPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
