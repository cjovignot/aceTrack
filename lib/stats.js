export function computeStats(points) {
  const stats = {
    total: 0,

    wins: 0,

    aces: 0,
    doubleFaults: 0,

    winners: 0,
    unforcedErrors: 0,
    forcedErrors: 0,

    forehandWinners: 0,
    backhandWinners: 0,
  };

  points.forEach((p) => {
    stats.total++;
    stats.wins++;

    const type = p.shot_type;

    // SERVICE
    if (type === "ace") stats.aces++;
    if (type === "double_fault") stats.doubleFaults++;

    // WINNERS
    if (p.isWinner) {
      stats.winners++;

      if (type === "Coup droit") stats.forehandWinners++;
      if (type === "Revers") stats.backhandWinners++;
    }

    // ERREURS
    if (!p.isWinner) {
      if (type === "unforced_error") stats.unforcedErrors++;
      else stats.forcedErrors++;
    }
  });

  return stats;
}