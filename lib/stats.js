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
      totalPoints: 0,
      forehandErrors: 0,
      backhandErrors: 0,
    },
    opponent: {
      aces: 0,
      doubleFaults: 0,
      winners: 0,
      unforcedErrors: 0,
      forcedErrors: 0,
      forehandWinners: 0,
      backhandWinners: 0,
      totalPoints: 0,
      forehandErrors: 0,
      backhandErrors: 0,
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
      stats[winner].totalPoints++;

      const tag = p.extra_tag;

      switch (tag) {
        case "forehand":
          stats[winner].forehandWinners++;
          break;

        case "backhand":
          stats[winner].backhandWinners++;
          break;

        case "serve_winner":
          stats[winner].serveWinners++;
          break;

        case "return_winner":
          stats[winner].returnWinners++;
          break;

        default:
          break; // null ou inconnu → aucun impact
      }

      continue;
    }

    // ---------- UNFORCED ERROR ----------
    if (type === "unforced_error") {
      const tag = p.extra_tag;

      // si pas de tag → erreur directe classique
      if (!tag) {
        stats[loser].unforcedErrors++;
      } else {
        // si tag présent → tu peux considérer que c'était sous pression
        stats[loser].forcedErrors++;
      }

      if (tag === "forehand") {
        stats[loser].forehandErrors++;
      }

      if (tag === "backhand") {
        stats[loser].backhandErrors++;
      }

      stats[winner].winners++;
      stats[winner].totalPoints++;

      continue;
    }
  }

  return stats;
}
