'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { Save, LogOut, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ display_name: '', club: '', level: '', ranking: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/profile').then(r => {
      if (r.data) {
        setProfile(r.data);
        setForm({ display_name: r.data.display_name || '', club: r.data.club || '', level: r.data.level || '', ranking: r.data.ranking || '' });
      } else {
        setForm(f => ({ ...f, display_name: user?.name || '' }));
      }
    }).catch(() => {});
  }, [user]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    if (profile) { await api.put('/api/profile', form); }
    else { const r = await api.post('/api/profile', form); setProfile(r.data); }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>
      <div className="flex items-center gap-4 mb-8">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-bold">
            {(form.display_name || '?')[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>
      <div className="space-y-4 mb-8">
        {[{ key: 'display_name', label: "Nom d'affichage" }, { key: 'club', label: 'Club' }, { key: 'ranking', label: 'Classement (ex: 15/1)' }].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">{label}</label>
            <input value={form[key]} onChange={e => set(key, e.target.value)} className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500" />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Niveau</label>
          <select value={form.level} onChange={e => set('level', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 bg-white">
            <option value="">Choisir...</option>
            {['Débutant', 'Intermédiaire', 'Avancé', 'Expert', 'Professionnel'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} className="w-full h-12 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition mb-3">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Sauvegardé !' : saving ? 'Enregistrement...' : 'Sauvegarder'}
      </button>
      <button onClick={logout} className="w-full h-12 border border-gray-200 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition text-gray-600">
        <LogOut className="w-4 h-4" /> Se déconnecter
      </button>
    </div>
  );
}
