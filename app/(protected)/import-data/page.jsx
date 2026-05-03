"use client";

import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { csvToJSON } from "@/lib/csvToJSON";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { createInitialScore } from "@/lib/tennisScoring";

export default function ImportDataPage() {
  const { user } = useAuth();

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const first = user?.name?.split(" ")[0] || "";
  const last = user?.name?.split(" ")[1] || "";

  const [form, setForm] = useState({
    player_first_name: first,
    player_last_name: last,
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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const surfaces = ["Terre-battue", "Quick", "Green Set", "Terbal"];

  const pill = (active) =>
    "flex-1 p-3 rounded-xl border text-sm font-medium transition " +
    (active
      ? "border-cyan-300/40 bg-gray-950 text-cyan-300/70"
      : "border-gray-400 hover:border-gray-200 text-gray-400");

  const inp =
    "w-full h-10 px-4 rounded-xl border bg-gray-950 border-cyan-300/20 focus:outline-none focus:border-green-500";

  // ---------------- FILE HANDLING ----------------

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  }

  function handleDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function removeFile() {
    setFile(null);
  }

  // ---------------- STEP 1: PREVIEW ----------------

  async function handleImport() {
    if (!file) return;

    setLoading(true);

    try {
      const text = await file.text();
      const data = csvToJSON(text);

      setPreviewData(data);

      console.log("PREVIEW DATA:", data);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  // ---------------- STEP 2: CONFIRM ----------------

  async function handleConfirmImport() {
    if (!previewData.length) return;

    setLoading(true);

    try {
      const playerName =
        [form.player_first_name, form.player_last_name]
          .filter(Boolean)
          .join(" ") || "Player";

      const opponentName =
        [form.opponent_first_name, form.opponent_last_name]
          .filter(Boolean)
          .join(" ") || "Opponent";

      const rules = {
        sets_to_win: form.sets_to_win,
        games_per_set: form.games_per_set,
        advantage: form.advantage,
        tiebreak: form.tiebreak,
        tiebreak_points: form.tiebreak_points,
        super_tiebreak: form.super_tiebreak,
        super_tiebreak_points: form.super_tiebreak_points,
      };

      const score = createInitialScore
        ? createInitialScore(form.serving_first, rules)
        : null;

      // CREATE MATCH
      const matchRes = await api.post("/api/matches", {
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

        serving_first: form.serving_first,

        status: "En cours",

        score,
        date: new Date().toISOString(),
        match_date_start: null,
      });

      const matchId = matchRes.data._id;

      // ENRICH + SEND
      const enriched = previewData.map((row) => ({
        ...row,
        match_id: matchId,
      }));

      await api.post("/api/pointlogs/bulk", {
        match_id: matchId,
        logs: enriched,
      });

      console.log("IMPORT CONFIRMED");

      // RESET
      setPreviewData([]);
      setFile(null);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-lg px-4 py-6 mx-auto mb-20 text-white">
      <h1 className="mb-6 text-2xl font-bold">📥 Import Datas (.csv)</h1>

      <div className="space-y-6">
        {/* PLAYERS */}
        <section className="relative rounded-2xl bg-gray-950">
          <div className="relative grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <input
                placeholder="Prénom"
                className={inp}
                value={form.player_first_name}
                onChange={(e) => set("player_first_name", e.target.value)}
              />
              <input
                placeholder="Nom"
                className={inp}
                value={form.player_last_name}
                onChange={(e) => set("player_last_name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <input
                placeholder="Prénom"
                className={inp}
                value={form.opponent_first_name}
                onChange={(e) => set("opponent_first_name", e.target.value)}
              />
              <input
                placeholder="Nom"
                className={inp}
                value={form.opponent_last_name}
                onChange={(e) => set("opponent_last_name", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* IMPORT */}
        <section className="p-4 border rounded-2xl border-cyan-300/20 bg-gray-950">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex flex-col items-center p-6 border-2 border-dashed rounded-xl"
          >
            <Upload />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="fileInput"
            />
            <label htmlFor="fileInput">Choisir un fichier</label>
          </div>

          {file && (
            <div className="flex justify-between mt-4">
              <span>{file.name}</span>
              <button onClick={removeFile}>
                <X />
              </button>
            </div>
          )}

          {/* IMPORT BUTTON */}
          <button onClick={handleImport} disabled={!file || loading}>
            {loading ? "Chargement..." : "Importer (Preview)"}
          </button>

          {/* CONFIRM BUTTON */}
          <button
            onClick={handleConfirmImport}
            disabled={!previewData.length || loading}
          >
            {loading ? "Envoi..." : "Valider l’import"}
          </button>

          {/* TABLE */}
          {previewData.length > 0 && (
            <div className="mt-6 overflow-auto">
              <p className="text-xs text-gray-500">
                Affichage limité à 50 lignes ({previewData.length} total)
              </p>

              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-gray-900">
                  <tr>
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {previewData.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((value, j) => (
                        <td key={j}>
                          {typeof value === "boolean"
                            ? value
                              ? "✅"
                              : "❌"
                            : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}