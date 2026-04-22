export function computeStats(points) {
  const stats = {
    player: {
      aces: 0,
      doubleFaults: 0,
      winners: 0,
      unforcedErrors: 0,
      forcedErrors: 0,
      forehandWinners: 0,
      backhandWinners: 0,
    },
    opponent: {
      aces: 0,
      doubleFaults: 0,
      winners: 0,
      unforcedErrors: 0,
      forcedErrors: 0,
      forehandWinners: 0,
      backhandWinners: 0,
    },
  };

  for (const p of points) {
    if (p.is_deleted) continue;

    const winner = p.point_winner;
    const loser = winner === "player" ? "opponent" : "player";

    const type = p.shot_type;

    // ---------- ACE ----------
    if (type === "ace") {
      stats[winner].aces++;
      stats[winner].winners++;
      continue;
    }

    // ---------- DOUBLE FAULT ----------
    if (type === "double_fault") {
      // ⚠️ IMPORTANT : la faute est du côté du loser (serveur fautif)
      stats[loser].doubleFaults++;
      stats[winner].winners++; // point gagné
      continue;
    }

    // ---------- WINNER ----------
    if (type === "winner") {
      stats[winner].winners++;

      if (p.stroke_type === "forehand") {
        stats[winner].forehandWinners++;
      }

      if (p.stroke_type === "backhand") {
        stats[winner].backhandWinners++;
      }

      continue;
    }

    // ---------- UNFORCED ERROR ----------
    if (type === "unforced_error") {
      stats[loser].unforcedErrors++;
      continue;
    }

    // ---------- FORCED ERROR ----------
    if (type === "forced_error") {
      stats[loser].forcedErrors++;
      continue;
    }
  }

  return stats;
}
