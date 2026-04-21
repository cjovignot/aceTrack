export function computeStats(points) {
  const stats = {
    total: 0,

    // résultat
    wins: 0,
    losses: 0,

    // service
    aces: 0,
    doubleFaults: 0,
    firstServeIn: 0,
    secondServePoints: 0,

    // jeu
    winners: 0,
    unforcedErrors: 0,
    forcedErrors: 0,

    // détail
    forehandWinners: 0,
    backhandWinners: 0,

    // pression
    breakPointsWon: 0,
    breakPointsTotal: 0,
  };

  points.forEach((p) => {
    stats.total++;

    const isWin = p.isWinner === true;

    if (isWin) stats.wins++;
    else stats.losses++;

    const type = p.shot_type;

    if (type === "ace") {
      stats.aces++;
    }

    if (type === "double_fault") {
      stats.doubleFaults++;
    }

    if (type === "winner") {
      stats.winners++;
      stats.wins++;
    }

    if (type === "unforced_error") {
      stats.unforcedErrors++;
    }
  });

  return stats;
}
