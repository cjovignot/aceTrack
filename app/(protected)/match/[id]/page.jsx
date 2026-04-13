'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import ScoreBoard from '../../../../components/ScoreBoard';
import { ArrowLeft, Trophy, Clock, MapPin, Trash2 } from 'lucide-react';
import { getScoreDisplay } from '../../../../lib/tennisScoring';

export default function MatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [match, setMatch] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/matches/' + id),
      api.get('/api/points?match_id=' + id).catch(() => ({ data: [] })),
    ]).then(([m, p]) => {
      setMatch(m.data);
      setPoints(p.data || []);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    await Promise.all(points.map(p => api.delete('/api/points/' + p._id).catch(() => {})));
    await api.delete('/api/matches/' + id);
    router.push('/dashboard');
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Chargement...</div>;
  if (!match) return <div className="max-w-lg mx-auto px-4 py-6 text-center text-gray-400">Match introuvable</div>;

  const playerPoints = points.filter(p => p.point_winner === 'player');
  const opponentPoints = points.filter(p => p.point_winner === 'opponent');
  const totalPoints = points.length;
  const wins = playerPoints.length;
  const winRate = totalPoints > 0 ? Math.round((wins / totalPoints) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <button onClick={() => setShowConfirm(true)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold text-lg mb-2">Supprimer ce match ?</h2>
            <p className="text-sm text-gray-400 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 h-11 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition">Annuler</button>
              <button onClick={handleDelete} className="flex-1 h-11 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition">Supprimer</button>
            </div>
          </div>
        </div>
      )}
      {match.status === 'Terminé' && (
        <div className={'text-center mb-6 py-4 rounded-2xl ' + (match.winner === 'player' ? 'bg-green-50' : 'bg-gray-100')}>
          <Trophy className={'w-6 h-6 mx-auto mb-1 ' + (match.winner === 'player' ? 'text-yellow-500' : 'text-gray-400')} />
          <p className="font-bold text-lg">{match.winner === 'player' ? 'Victoire' : 'Défaite'}</p>
        </div>
      )}
      <ScoreBoard score={match.score} playerName={match.player_name} opponentName={match.opponent_name} />
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{match.surface}</span>
        {match.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{match.duration_minutes} min</span>}
      </div>
      {totalPoints > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="font-bold text-lg">Statistiques</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Points gagnés" value={wins} sub={'/ ' + totalPoints} />
            <StatBox label="Taux de victoire" value={winRate + '%'} />
            <StatBox label="Aces" value={playerPoints.filter(p => p.shot_type === 'Ace').length} />
            <StatBox label="Doubles fautes" value={playerPoints.filter(p => p.shot_type === 'Double faute').length} neg />
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-semibold text-sm mb-3">Répartition des points</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-green-600">{winRate}%</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 rounded-full" style={{ width: winRate + '%' }} />
              </div>
              <span className="text-sm font-bold text-gray-400">{100 - winRate}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, neg }) {
  return (
    <div className="bg-white rounded-xl border p-3 text-center">
      <p className={'text-2xl font-bold ' + (neg ? 'text-red-500' : 'text-green-600')}>
        {value} {sub && <span className="text-sm text-gray-400 font-normal">{sub}</span>}
      </p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
