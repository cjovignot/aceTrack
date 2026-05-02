"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import { createInitialScore } from "../../../lib/tennisScoring";
import { ArrowLeft, Play } from "lucide-react";

const surfaces = ["Terre-battue", "Quick", "Green Set", "Terbal"];
const pill = (active) =>
  "flex-1 p-3 rounded-xl border text-sm font-medium transition " +
  (active
    ? "border-cyan-300/40 bg-gray-950 text-cyan-300/70"
    : "border-gray-200 hover:border-gray-300");

export default function NewMatchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🎲 COIN FLIP STATES
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState(null);
  const [coinWinner, setCoinWinner] = useState(null);

  const [form, setForm] = useState({
    player_first_name: "",
    player_last_name: "",
    opponent_first_name: "",
    opponent_last_name: "",
    surface: "Terre-battue",
    sets_to_win: 2,
    games_per_set: 6,
    advantage: true,
    tiebreak: true,
    tiebreak_points: 7,
    super_tiebreak: false,
    super_tiebreak_points: 10,
    serving_first: "player",
  });

  useEffect(() => {
    api
      .get("/api/profile")
      .then((r) => setProfile(r.data))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // 🎲 FLIP
  function flipCoin() {
    if (isFlipping) return;

    setIsFlipping(true);
    setCoinResult(null);
    setCoinWinner(null);

    setTimeout(() => {
      const result = Math.random() < 0.5 ? "PILE" : "FACE";
      setCoinResult(result);

      const winner = result === "PILE" ? "player" : "opponent";
      setCoinWinner(winner);

      setIsFlipping(false);
    }, 1500);
  }

  async function handleStart() {
    if (!form.opponent_first_name.trim()) return;
    setLoading(true);

    const playerName =
      [form.player_first_name, form.player_last_name]
        .filter(Boolean)
        .join(" ") ||
      profile?.display_name ||
      user?.name ||
      "Joueur";

    const opponentName = [form.opponent_first_name, form.opponent_last_name]
      .filter(Boolean)
      .join(" ");

    const rules = {
      sets_to_win: form.sets_to_win,
      games_per_set: form.games_per_set,
      advantage: form.advantage,
      tiebreak: form.tiebreak,
      tiebreak_points: form.tiebreak_points,
      super_tiebreak: form.super_tiebreak,
      super_tiebreak_points: form.super_tiebreak_points,
    };

    const res = await api.post("/api/matches", {
      player_first_name: form.player_first_name,
      player_last_name: form.player_last_name,
      player_name: playerName,
      opponent_first_name: form.opponent_first_name,
      opponent_last_name: form.opponent_last_name,
      opponent_name: opponentName,
      surface: form.surface,
      match_type: "Simple",
      sets_to_win: form.sets_to_win,
      games_per_set: form.games_per_set,
      advantage: form.advantage,
      tiebreak: form.tiebreak,
      tiebreak_points: form.tiebreak_points,
      super_tiebreak: form.super_tiebreak,
      super_tiebreak_points: form.super_tiebreak_points,
      status: "En cours",
      score: createInitialScore(form.serving_first, rules),
      date: new Date().toISOString(),
      match_date_start: null,
    });

    router.push("/watch-connect");
  }

  const playerLabel =
    [form.player_first_name, form.player_last_name].filter(Boolean).join(" ") ||
    profile?.display_name ||
    "Moi";

  const opponentLabel =
    [form.opponent_first_name, form.opponent_last_name]
      .filter(Boolean)
      .join(" ") || "Adversaire";

  return (
    <div className="max-w-lg px-4 py-6 pb-16 mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 mb-6 text-gray-400 hover:text-gray-600"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <h1 className="mb-8 text-2xl font-bold">Nouveau match</h1>

      <div className="space-y-8">
        {/* --- JOUEURS --- */}
        <Section title="Joueurs">
          <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
            Vous
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Field label="Prénom">
              <input
                value={form.player_first_name}
                onChange={(e) => set("player_first_name", e.target.value)}
                placeholder={profile?.display_name.split(" ")[0] || "Prénom"}
                className={inp}
              />
            </Field>
            <Field label="Nom">
              <input
                value={form.player_last_name}
                onChange={(e) => set("player_last_name", e.target.value)}
                placeholder={profile?.display_name.split(" ")[1] || "Nom"}
                className={inp}
              />
            </Field>
          </div>

          <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
            Adversaire *
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Prénom">
              <input
                value={form.opponent_first_name}
                onChange={(e) => set("opponent_first_name", e.target.value)}
                placeholder="Prénom"
                className={inp}
              />
            </Field>
            <Field label="Nom">
              <input
                value={form.opponent_last_name}
                onChange={(e) => set("opponent_last_name", e.target.value)}
                placeholder="Nom"
                className={inp}
              />
            </Field>
          </div>
        </Section>

        {/* --- SURFACE --- */}
        <Section title="Surface">
          <div className="grid grid-cols-2 gap-2">
            {surfaces.map((s) => (
              <button
                key={s}
                onClick={() => set("surface", s)}
                className={pill(form.surface === s)}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>

        {/* --- FORMAT --- */}
        <Section title="Format">
          <Field label="Sets gagnants">
            <div className="flex gap-2">
              {[2, 3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => set("sets_to_win", n)}
                  className={pill(form.sets_to_win === n)}
                >
                  {n} sets
                </button>
              ))}
            </div>
          </Field>

          <Field label="Jeux par set">
            <div className="flex gap-2">
              {[3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => set("games_per_set", n)}
                  className={pill(form.games_per_set === n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* --- RÈGLES --- */}
        <Section title="Règles">
          <SwitchRow
            label="Avantage à 40-40"
            desc={form.advantage ? "Avantage classique" : "Point décisif"}
            checked={form.advantage}
            onChange={(v) => set("advantage", v)}
          />

          <SwitchRow
            label="Tie-break"
            desc={
              form.tiebreak
                ? "Au " + form.games_per_set + "-" + form.games_per_set
                : "Pas de tie-break"
            }
            checked={form.tiebreak}
            onChange={(v) => set("tiebreak", v)}
          />

          {form.tiebreak && (
            <div className="pl-4 ml-4 border-l-2 border-gray-200">
              <Field label="Points tie-break">
                <Stepper
                  value={form.tiebreak_points}
                  min={5}
                  max={15}
                  onChange={(v) => set("tiebreak_points", v)}
                />
              </Field>
            </div>
          )}

          <SwitchRow
            label="Super Tie-break (dernier set)"
            desc={
              form.super_tiebreak ? "Dernier set décisif" : "Dernier set normal"
            }
            checked={form.super_tiebreak}
            onChange={(v) => set("super_tiebreak", v)}
          />

          {form.super_tiebreak && (
            <div className="pl-4 ml-4 border-l-2 border-gray-200">
              <Field label="Points super tie-break">
                <Stepper
                  value={form.super_tiebreak_points}
                  min={7}
                  max={15}
                  onChange={(v) => set("super_tiebreak_points", v)}
                />
              </Field>
            </div>
          )}
        </Section>

        {/* 🎲 COIN FLIP */}
        <Section title="Pile ou Face">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-24 h-24 rounded-full border flex items-center justify-center text-lg font-bold bg-gray-950 ${
                isFlipping ? "animate-coin" : ""
              }`}
            >
              {coinResult || "?"}
            </div>

            <button
              onClick={flipCoin}
              disabled={isFlipping}
              className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-gray-100 disabled:opacity-50"
            >
              {isFlipping ? "Lancement..." : "Lancer la pièce"}
            </button>

            {coinWinner && (
              <>
                <p className="text-sm text-gray-400">
                  {coinWinner === "player" ? playerLabel : opponentLabel} gagne
                  le tirage
                </p>

                <div className="flex w-full gap-2">
                  <button
                    onClick={() => set("serving_first", coinWinner)}
                    className={pill(form.serving_first === coinWinner)}
                  >
                    Servir
                  </button>

                  <button
                    onClick={() =>
                      set(
                        "serving_first",
                        coinWinner === "player" ? "opponent" : "player",
                      )
                    }
                    className={pill(form.serving_first !== coinWinner)}
                  >
                    Recevoir
                  </button>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* --- PREMIER SERVICE --- */}
        <Section title="Premier service">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => set("serving_first", "player")}
              className={pill(form.serving_first === "player")}
            >
              {playerLabel}
            </button>
            <button
              onClick={() => set("serving_first", "opponent")}
              className={pill(form.serving_first === "opponent")}
            >
              {opponentLabel}
            </button>
          </div>
        </Section>

        <button
          onClick={handleStart}
          disabled={!form.opponent_first_name.trim() || loading}
          className="flex items-center justify-center w-full gap-2 font-semibold transition border text-cyan-300 border-cyan-300/20 bg-gray-950 h-14 hover:bg-cyan-300 hover:text-gray-950 disabled:opacity-50 rounded-xl"
        >
          <Play className="w-5 h-5" />
          {loading ? "Création..." : "Démarrer le match"}
        </button>
      </div>
    </div>
  );
}

// --- UI HELPERS (inchangés) ---
const inp =
  "w-full h-11 px-4 rounded-xl border bg-gray-950 border-cyan-300/20 focus:outline-none focus:border-green-500";

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block mb-1 text-xs text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function SwitchRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
          (checked ? "bg-cyan-300/70" : "bg-gray-900")
        }
      >
        <span
          className={
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
            (checked ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}

function Stepper({ value, min, max, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex items-center justify-center w-8 h-8 text-lg font-bold border rounded-full hover:bg-gray-50"
      >
        −
      </button>
      <span className="w-8 text-lg font-bold text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex items-center justify-center w-8 h-8 text-lg font-bold border rounded-full hover:bg-gray-50"
      >
        +
      </button>
    </div>
  );
}
