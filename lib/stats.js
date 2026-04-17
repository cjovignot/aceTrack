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

    const isWin = p.point_winner === "player";

    if (isWin) stats.wins++;
    else stats.losses++;

    const type = p.shot_type;

    // 🎯 SERVICE
    if (type === "Service gagnant" || type === "Ace") {
      stats.aces++;
    }

    if (type === "Double faute") {
      stats.doubleFaults++;
    }

    // 🎯 WINNERS
    if (isWin && p.isWinner) {
      stats.winners++;

      if (type === "Coup droit") stats.forehandWinners++;
      if (type === "Revers") stats.backhandWinners++;
    }

    // 🎯 ERREURS
    if (!isWin) {
      if (type === "Faute directe") stats.unforcedErrors++;
      else stats.forcedErrors++;
    }
  });

  return stats;
}