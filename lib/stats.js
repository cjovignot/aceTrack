export function computeStats(points) {
  const stats = {
    player: {
      aces: 0,
      doubleFaults: 0,
      winners: 0,
      serveWinners: 0,
      serviceRatio: 0,
      returnWinners: 0,
      unforcedErrors: 0,
      forcedErrors: 0,
      forehandWinners: 0,
      backhandWinners: 0,
      totalPoints: 0,
      forehandErrors: 0,
      backhandErrors: 0,

      servicePoints: 0,
      servicePointsWon: 0,
    },

    opponent: {
      aces: 0,
      doubleFaults: 0,
      winners: 0,
      serveWinners: 0,
      returnWinners: 0,
      serviceRatio: 0,
      unforcedErrors: 0,
      forcedErrors: 0,
      forehandWinners: 0,
      backhandWinners: 0,
      totalPoints: 0,
      forehandErrors: 0,
      backhandErrors: 0,

      servicePoints: 0,
      servicePointsWon: 0,
    },

    ratios: {},
  };

  // ---------------- UTIL ----------------
  function ratio(p, o) {
    const total = p + o;
    if (total === 0) return { player: 0, opponent: 0 };

    return {
      player: (p / total) * 100,
      opponent: (o / total) * 100,
    };
  }

  // ---------------- LOOP POINTS ----------------
  for (const p of points) {
    if (p.is_deleted) continue;

    const winner = p.point_winner;
    const loser = winner === "player" ? "opponent" : "player";
    const type = p.shot_type;

    // ---------- SERVICE TRACKING ----------
    if (p.isServing) {
      stats.player.servicePoints++;
      if (winner === "player") stats.player.servicePointsWon++;
    } else {
      stats.opponent.servicePoints++;
      if (winner === "opponent") stats.opponent.servicePointsWon++;
    }

    // ---------- ACE ----------
    if (type === "ace") {
      stats[winner].aces++;
      stats[winner].winners++;
      continue;
    }

    // ---------- DOUBLE FAULT ----------
    if (type === "double_fault") {
      stats[loser].doubleFaults++;
      stats[winner].winners++;
      continue;
    }

    // ---------- WINNER ----------
    if (type === "winner") {
      stats[winner].winners++;
      stats[winner].totalPoints++;

      switch (p.extra_tag) {
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
      }

      continue;
    }

    // ---------- UNFORCED ERROR ----------
    if (type === "unforced_error") {
      const tag = p.extra_tag;

      if (!tag) {
        stats[loser].unforcedErrors++;
      } else {
        stats[loser].forcedErrors++;
      }

      if (tag === "forehand") stats[loser].forehandErrors++;
      if (tag === "backhand") stats[loser].backhandErrors++;

      stats[winner].winners++;
      stats[winner].totalPoints++;

      continue;
    }
  }

  // ---------------- SERVICE RATIO ----------------
  stats.player.serviceRatio =
    stats.player.servicePoints > 0
      ? (stats.player.servicePointsWon / stats.player.servicePoints) * 100
      : 0;

  stats.opponent.serviceRatio =
    stats.opponent.servicePoints > 0
      ? (stats.opponent.servicePointsWon / stats.opponent.servicePoints) * 100
      : 0;

  // ---------------- RATIOS (DUELS) ----------------
  stats.ratios = {
    serviceRatio: {
      player: stats.player.serviceRatio,
      opponent: stats.opponent.serviceRatio,
    },

    aces: ratio(stats.player.aces, stats.opponent.aces),
    doubleFaults: ratio(stats.player.doubleFaults, stats.opponent.doubleFaults),
    winners: ratio(stats.player.winners, stats.opponent.winners),
    unforcedErrors: ratio(
      stats.player.unforcedErrors,
      stats.opponent.unforcedErrors,
    ),
    forcedErrors: ratio(stats.player.forcedErrors, stats.opponent.forcedErrors),
    forehandWinners: ratio(
      stats.player.forehandWinners,
      stats.opponent.forehandWinners,
    ),
    backhandWinners: ratio(
      stats.player.backhandWinners,
      stats.opponent.backhandWinners,
    ),
  };

  return stats;
}
