export default function ScoreBoard({ score, playerName, opponentName, compact = false }) {
  if (!score) return null;
  const sP = score.sets_player || [];
  const sO = score.sets_opponent || [];
  const sets = Math.max(sP.length, sO.length);

  const fmtName = n => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    return parts.length === 1 ? parts[0].toUpperCase() : parts[0][0].toUpperCase() + '. ' + parts.slice(1).join(' ').toUpperCase();
  };

  if (compact) {
    return (
      <div className="inline-block bg-black/85 text-white text-xs" style={{ backdropFilter: 'blur(4px)' }}>
        <div className="grid border-b border-white/10" style={{ gridTemplateColumns: '90px repeat(' + sets + ', 20px) 28px' }}>
          <div className="px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-white/40">Joueur</div>
          {Array.from({ length: sets }).map((_, i) => <div key={i} className="text-center py-0.5 text-[8px] text-white/40">S{i + 1}</div>)}
          <div className="text-center py-0.5 text-[8px] text-white/40">Pts</div>
        </div>
        {[['player', playerName, sP, score.current_game_player], ['opponent', opponentName, sO, score.current_game_opponent]].map(([who, name, sets_arr, pts], ri) => (
          <div key={who} className={'grid ' + (ri === 0 ? 'border-b border-white/10' : '')} style={{ gridTemplateColumns: '90px repeat(' + sets + ', 20px) 28px' }}>
            <div className="px-1.5 py-1 flex items-center gap-1">
              {score.serving === who ? <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" /> : <div className="w-1.5 h-1.5 flex-shrink-0" />}
              <span className="font-semibold text-[10px] truncate">{fmtName(name)}</span>
            </div>
            {Array.from({ length: sets }).map((_, i) => (
              <div key={i} className="text-center py-1 font-bold text-xs">
                <span className={(sets_arr[i] || 0) > (who === 'player' ? sO[i] : sP[i] || 0) ? 'text-yellow-400' : 'text-white/70'}>{sets_arr[i] ?? ''}</span>
              </div>
            ))}
            <div className="text-center py-1 font-bold text-yellow-400 text-sm">{pts || '0'}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm">
      <div className="text-xs text-green-600 text-center font-medium uppercase tracking-wider mb-3">Set {(score.current_set || 0) + 1}</div>
      <table className="w-full">
        <thead>
          <tr className="text-xs text-gray-400">
            <th className="text-left pb-3 w-1/3">Joueur</th>
            {sP.map((_, i) => <th key={i} className="text-center pb-3 w-10">S{i + 1}</th>)}
            <th className="text-center pb-3 w-14">Pts</th>
          </tr>
        </thead>
        <tbody>
          {[['player', playerName, sP, score.current_game_player], ['opponent', opponentName, sO, score.current_game_opponent]].map(([who, name, sets_arr, pts], ri) => (
            <tr key={who} className={ri === 0 ? 'border-b' : ''}>
              <td className="py-3 pr-2">
                <div className="flex items-center gap-2">
                  {score.serving === who && <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />}
                  <span className="font-semibold text-sm truncate">{name || 'Joueur'}</span>
                </div>
              </td>
              {sets_arr.map((g, i) => (
                <td key={i} className="text-center py-3">
                  <span className={'text-lg font-bold ' + (g > (who === 'player' ? sO[i] || 0 : sP[i] || 0) ? 'text-green-600' : 'text-gray-700')}>{g}</span>
                </td>
              ))}
              <td className="text-center py-3">
                <span className="text-xl font-bold text-yellow-500">{pts || '0'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
