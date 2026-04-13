'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { createInitialScore } from '../../../lib/tennisScoring';
import { ArrowLeft, Play } from 'lucide-react';

const surfaces = ['Terre-battue', 'Quick', 'Green Set', 'Terbal'];
const pill = (active) => 'flex-1 p-3 rounded-xl border text-sm font-medium transition ' + (active ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300');

export default function NewMatchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    player_first_name: '', player_last_name: '',
    opponent_first_name: '', opponent_last_name: '',
    surface: 'Terre-battue', sets_to_win: 2, games_per_set: 6,
    advantage: true, tiebreak: true, tiebreak_points: 7,
    super_tiebreak: false, super_tiebreak_points: 10,
    serving_first: 'player',
  });

  useEffect(() => { api.get('/api/profile').then(r => setProfile(r.data)).catch(() => {}); }, []);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleStart() {
    if (!form.opponent_first_name.trim()) return;
    setLoading(true);
    const playerName = [form.player_first_name, form.player_last_name].filter(Boolean).join(' ') || profile?.display_name || user?.name || 'Joueur';
    const opponentName = [form.opponent_first_name, form.opponent_last_name].filter(Boolean).join(' ');
    const rules = { sets_to_win: form.sets_to_win, games_per_set: form.games_per_set, advantage: form.advantage, tiebreak: form.tiebreak, tiebreak_points: form.tiebreak_points, super_tiebreak: form.super_tiebreak, super_tiebreak_points: form.super_tiebreak_points };
    const res = await api.post('/api/matches', {
      player_first_name: form.player_first_name, player_last_name: form.player_last_name, player_name: playerName,
      opponent_first_name: form.opponent_first_name, opponent_last_name: form.opponent_last_name, opponent_name: opponentName,
      surface: form.surface, match_type: 'Simple',
      sets_to_win: form.sets_to_win, games_per_set: form.games_per_set,
      advantage: form.advantage, tiebreak: form.tiebreak, tiebreak_points: form.tiebreak_points,
      super_tiebreak: form.super_tiebreak, super_tiebreak_points: form.super_tiebreak_points,
      status: 'En cours', score: createInitialScore(form.serving_first, rules), date: new Date().toISOString(),
    });
    router.push('/live-score?matchId=' + res.data._id);
  }

  const playerLabel = [form.player_first_name, form.player_last_name].filter(Boolean).join(' ') || profile?.display_name || 'Moi';
  const opponentLabel = [form.opponent_first_name, form.opponent_last_name].filter(Boolean).join(' ') || 'Adversaire';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-16">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 mb-6 hover:text-gray-600">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h1 className="text-2xl font-bold mb-8">Nouveau match</h1>
      <div className="space-y-8">
        <Section title="Joueurs">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vous</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Field label="Prénom"><input value={form.player_first_name} onChange={e => set('player_first_name', e.target.value)} placeholder={profile?.display_name || 'Prénom'} className={inp} /></Field>
            <Field label="Nom"><input value={form.player_last_name} onChange={e => set('player_last_name', e.target.value)} placeholder="Nom" className={inp} /></Field>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Adversaire *</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Prénom"><input value={form.opponent_first_name} onChange={e => set('opponent_first_name', e.target.value)} placeholder="Prénom" className={inp} /></Field>
            <Field label="Nom"><input value={form.opponent_last_name} onChange={e => set('opponent_last_name', e.target.value)} placeholder="Nom" className={inp} /></Field>
          </div>
        </Section>
        <Section title="Surface">
          <div className="grid grid-cols-2 gap-2">
            {surfaces.map(s => <button key={s} onClick={() => set('surface', s)} className={pill(form.surface === s)}>{s}</button>)}
          </div>
        </Section>
        <Section title="Format">
          <Field label="Sets gagnants">
            <div className="flex gap-2">
              {[2,3,5].map(n => <button key={n} onClick={() => set('sets_to_win', n)} className={pill(form.sets_to_win === n)}>{n} sets</button>)}
            </div>
          </Field>
          <Field label="Jeux par set">
            <div className="flex gap-2">
              {[3,4,5,6].map(n => <button key={n} onClick={() => set('games_per_set', n)} className={pill(form.games_per_set === n)}>{n}</button>)}
            </div>
          </Field>
        </Section>
        <Section title="Règles">
          <SwitchRow label="Avantage à 40-40" desc={form.advantage ? 'Avantage classique' : 'Point décisif'} checked={form.advantage} onChange={v => set('advantage', v)} />
          <SwitchRow label="Tie-break" desc={form.tiebreak ? 'Au ' + form.games_per_set + '-' + form.games_per_set : 'Pas de tie-break'} checked={form.tiebreak} onChange={v => set('tiebreak', v)} />
          {form.tiebreak && <div className="ml-4 pl-4 border-l-2 border-gray-200"><Field label="Points tie-break"><Stepper value={form.tiebreak_points} min={5} max={15} onChange={v => set('tiebreak_points', v)} /></Field></div>}
          <SwitchRow label="Super Tie-break (dernier set)" desc={form.super_tiebreak ? 'Dernier set décisif' : 'Dernier set normal'} checked={form.super_tiebreak} onChange={v => set('super_tiebreak', v)} />
          {form.super_tiebreak && <div className="ml-4 pl-4 border-l-2 border-gray-200"><Field label="Points super tie-break"><Stepper value={form.super_tiebreak_points} min={7} max={15} onChange={v => set('super_tiebreak_points', v)} /></Field></div>}
        </Section>
        <Section title="Premier service">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => set('serving_first', 'player')} className={pill(form.serving_first === 'player')}>{playerLabel}</button>
            <button onClick={() => set('serving_first', 'opponent')} className={pill(form.serving_first === 'opponent')}>{opponentLabel}</button>
          </div>
        </Section>
        <button onClick={handleStart} disabled={!form.opponent_first_name.trim() || loading}
          className="w-full h-14 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition">
          <Play className="w-5 h-5" /> {loading ? 'Création...' : 'Démarrer le match'}
        </button>
      </div>
    </div>
  );
}

const inp = 'w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500';
function Section({ title, children }) { return <div><h3 className="font-semibold text-xs uppercase tracking-wider text-gray-400 mb-3">{title}</h3><div className="space-y-3">{children}</div></div>; }
function Field({ label, children }) { return <div><label className="text-xs text-gray-500 mb-1 block">{label}</label>{children}</div>; }
function SwitchRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
      <button onClick={() => onChange(!checked)} className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (checked ? 'bg-green-600' : 'bg-gray-200')}>
        <span className={'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );
}
function Stepper({ value, min, max, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center text-lg font-bold hover:bg-gray-50">−</button>
      <span className="font-bold text-lg w-8 text-center">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="w-8 h-8 rounded-full border flex items-center justify-center text-lg font-bold hover:bg-gray-50">+</button>
    </div>
  );
}
