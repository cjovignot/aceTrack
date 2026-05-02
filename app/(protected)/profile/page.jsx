"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";
import api from "../../../lib/api";
import { Save, LogOut, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    display_name: "",
    club: "",
    level: "",
    ranking: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get("/api/profile")
      .then((r) => {
        if (r.data) {
          setProfile(r.data);
          setForm({
            display_name: r.data.display_name || "",
            club: r.data.club || "",
            level: r.data.level || "",
            ranking: r.data.ranking || "",
          });
        } else {
          setForm((f) => ({ ...f, display_name: user?.name || "" }));
        }
      })
      .catch(() => {});
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    if (profile) {
      await api.put("/api/profile", form);
    } else {
      const r = await api.post("/api/profile", form);
      setProfile(r.data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg px-4 py-6 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">Mon profil</h1>
      <div className="flex items-center gap-4 mb-8">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-16 h-16 rounded-full"
          />
        ) : (
          <div className="flex items-center justify-center w-16 h-16 text-2xl font-bold text-green-700 bg-green-100 rounded-full">
            {(form.display_name || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>
      <div className="mb-8 space-y-4">
        {[
          { key: "display_name", label: "Nom d'affichage" },
          { key: "club", label: "Club" },
          { key: "ranking", label: "Classement (ex: 15/1)" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block mb-1 text-xs tracking-wider text-gray-500 uppercase">
              {label}
            </label>
            <input
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              className="w-full px-4 border border-cyan-300/30 bg-gray-950 h-11 rounded-xl focus:outline-none focus:border-cyan-300/70"
            />
          </div>
        ))}
        <div>
          <label className="block mb-1 text-xs tracking-wider text-gray-500 uppercase">
            Niveau
          </label>
          <select
            value={form.level}
            onChange={(e) => set("level", e.target.value)}
            className="w-full px-4 border border-cyan-300/30 bg-gray-950 h-11 rounded-xl focus:outline-none focus:border-cyan-300/70"
          >
            <option value="">Choisir...</option>
            {[
              "Débutant",
              "Intermédiaire",
              "Avancé",
              "Expert",
              "Professionnel",
            ].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Link href={"/import-data"}>Importer un match</Link>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center justify-center w-full h-12 gap-2 mb-3 font-semibold text-white transition border border-cyan-300/30 bg-cyan-300/70 disabled:opacity-50 hover:bg-gray-950 hover:text-cyan-300/70 rounded-xl"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saved ? "Sauvegardé !" : saving ? "Enregistrement..." : "Sauvegarder"}
      </button>
      <button
        onClick={logout}
        className="flex items-center justify-center w-full h-12 gap-2 font-semibold text-gray-600 transition border border-gray-200 rounded-xl hover:bg-gray-50"
      >
        <LogOut className="w-4 h-4" /> Se déconnecter
      </button>
    </div>
  );
}
