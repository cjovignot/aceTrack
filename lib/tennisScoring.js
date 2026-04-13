const POINT_VALUES = ['0', '15', '30', '40'];

const DEFAULT_RULES = {
  sets_to_win: 2, games_per_set: 6, advantage: true,
  tiebreak: true, tiebreak_points: 7, super_tiebreak: false, super_tiebreak_points: 10,
};

export function createInitialScore(serving = 'player', rules = {}) {
  return { sets_player: [0], sets_opponent: [0], current_game_player: '0', current_game_opponent: '0', current_set: 0, serving, config: { ...DEFAULT_RULES, ...rules }, is_super_tiebreak_set: false };
}

function getRules(score) { return { ...DEFAULT_RULES, ...(score.config || {}) }; }

export function addPoint(score, winner) {
  const s = JSON.parse(JSON.stringify(score));
  const rules = getRules(s);
  const setIdx = s.current_set;
  const pGames = s.sets_player[setIdx] || 0;
  const oGames = s.sets_opponent[setIdx] || 0;
  if (s.is_super_tiebreak_set) return handleSuperTiebreak(s, winner, rules.super_tiebreak_points, rules);
  if (rules.tiebreak && pGames === rules.games_per_set && oGames === rules.games_per_set) return handleTiebreak(s, winner, rules.tiebreak_points, rules);
  return handleRegularGame(s, winner, rules);
}

function handleSuperTiebreak(score, winner, targetPoints, rules) {
  const pPts = parseInt(score.current_game_player) || 0;
  const oPts = parseInt(score.current_game_opponent) || 0;
  const newP = winner === 'player' ? pPts + 1 : pPts;
  const newO = winner === 'opponent' ? oPts + 1 : oPts;
  score.current_game_player = String(newP);
  score.current_game_opponent = String(newO);
  const winnerPts = winner === 'player' ? newP : newO;
  const loserPts = winner === 'player' ? newO : newP;
  if (winnerPts >= targetPoints && winnerPts - loserPts >= 2) {
    const setIdx = score.current_set;
    score.sets_player[setIdx] = newP; score.sets_opponent[setIdx] = newO;
    score.current_game_player = '0'; score.current_game_opponent = '0';
    score.serving = score.serving === 'player' ? 'opponent' : 'player';
    const setsWonP = score.sets_player.filter((g, i) => g > (score.sets_opponent[i] || 0)).length;
    return { score, gameWon: true, setWon: true, matchWon: true, matchWinner: setsWonP >= rules.sets_to_win ? 'player' : 'opponent' };
  }
  if ((newP + newO) % 2 === 1) score.serving = score.serving === 'player' ? 'opponent' : 'player';
  return { score, gameWon: false, setWon: false, matchWon: false };
}

function handleTiebreak(score, winner, targetPoints, rules) {
  const pPts = parseInt(score.current_game_player) || 0;
  const oPts = parseInt(score.current_game_opponent) || 0;
  const newP = winner === 'player' ? pPts + 1 : pPts;
  const newO = winner === 'opponent' ? oPts + 1 : oPts;
  score.current_game_player = String(newP);
  score.current_game_opponent = String(newO);
  if ((winner === 'player' ? newP : newO) >= targetPoints && Math.abs(newP - newO) >= 2) return winGame(score, winner, rules);
  if ((newP + newO) % 2 === 1) score.serving = score.serving === 'player' ? 'opponent' : 'player';
  return { score, gameWon: false, setWon: false, matchWon: false };
}

function handleRegularGame(score, winner, rules) {
  const isPlayer = winner === 'player';
  const curP = score.current_game_player; const curO = score.current_game_opponent;
  if (!rules.advantage && curP === '40' && curO === '40') return winGame(score, winner, rules);
  if (isPlayer) {
    if (curP === '40' && curO === '40') { score.current_game_player = 'AD'; }
    else if (curP === 'AD') { return winGame(score, 'player', rules); }
    else if (curO === 'AD') { score.current_game_opponent = '40'; }
    else if (curP === '40') { return winGame(score, 'player', rules); }
    else { score.current_game_player = POINT_VALUES[POINT_VALUES.indexOf(curP) + 1]; }
  } else {
    if (curO === '40' && curP === '40') { score.current_game_opponent = 'AD'; }
    else if (curO === 'AD') { return winGame(score, 'opponent', rules); }
    else if (curP === 'AD') { score.current_game_player = '40'; }
    else if (curO === '40') { return winGame(score, 'opponent', rules); }
    else { score.current_game_opponent = POINT_VALUES[POINT_VALUES.indexOf(curO) + 1]; }
  }
  return { score, gameWon: false, setWon: false, matchWon: false };
}

function winGame(score, winner, rules) {
  const setIdx = score.current_set;
  if (winner === 'player') score.sets_player[setIdx]++; else score.sets_opponent[setIdx]++;
  score.current_game_player = '0'; score.current_game_opponent = '0';
  score.serving = score.serving === 'player' ? 'opponent' : 'player';
  const pG = score.sets_player[setIdx]; const oG = score.sets_opponent[setIdx]; const gps = rules.games_per_set;
  const setWon = (pG >= gps && pG - oG >= 2) || (oG >= gps && oG - pG >= 2) || pG === gps + 1 || oG === gps + 1;
  if (!setWon) return { score, gameWon: true, setWon: false, matchWon: false };
  const setsWonP = score.sets_player.filter((g, i) => g > (score.sets_opponent[i] || 0)).length;
  const setsWonO = score.sets_opponent.filter((g, i) => g > (score.sets_player[i] || 0)).length;
  if (setsWonP >= rules.sets_to_win || setsWonO >= rules.sets_to_win) {
    return { score, gameWon: true, setWon: true, matchWon: true, matchWinner: setsWonP >= rules.sets_to_win ? 'player' : 'opponent' };
  }
  score.current_set++; score.sets_player.push(0); score.sets_opponent.push(0); score.is_super_tiebreak_set = false;
  if (rules.super_tiebreak) {
    const nP = score.sets_player.filter((g, i) => i < score.current_set && g > (score.sets_opponent[i] || 0)).length;
    const nO = score.sets_opponent.filter((g, i) => i < score.current_set && g > (score.sets_player[i] || 0)).length;
    if (nP === rules.sets_to_win - 1 && nO === rules.sets_to_win - 1) score.is_super_tiebreak_set = true;
  }
  return { score, gameWon: true, setWon: true, matchWon: false };
}

export function getScoreDisplay(score) {
  if (!score) return '';
  return (score.sets_player || []).map((g, i) => g + '-' + (score.sets_opponent[i] || 0)).join(', ');
}
