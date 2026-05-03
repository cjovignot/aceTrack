// ---------------- CSV PARSER (RAW ONLY + TRANSFORM PIPELINE) ----------------

export function csvToJSON(text) {
  const rows = [];
  let current = [];
  let value = "";
  let insideQuotes = false;

  text = text
    .replace(/\uFEFF/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if ((char === "," || char === ";") && !insideQuotes) {
      current.push(value.trim());
      value = "";
      continue;
    }

    if (char === "\n" && !insideQuotes) {
      current.push(value.trim());
      rows.push(current);
      current = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value || current.length) {
    current.push(value.trim());
    rows.push(current);
  }

  const headers = rows[0].map((h) =>
    h.toLowerCase().trim().replace(/\s+/g, "_"),
  );

  const parsedRows = rows
    .slice(1)
    .filter((r) => r.length > 1)
    .map((row) => {
      const obj = {};

      headers.forEach((h, i) => {
        obj[h] = row[i] ?? null;
      });

      return obj;
    });

  // 🔥 IMPORTANT: transform HERE (correct usage)
  return parsedRows.map(toPointLog);
}

// ---------------- POINT LOG TRANSFORM ----------------

// ---------------- POINT LOG TRANSFORM ----------------

function toPointLog(row) {
  const isHost = row.point_winner === "host";
  const detail = (row.detail || "").toLowerCase();

  const point_winner = isHost ? "player" : "opponent";

  // ✅ NEW: serveur du point
  const server = row.match_server === "host" ? "player" : "opponent";
const isServing = server === "player";

  // ---------------- SHOT TYPE ----------------
  let shot_type = "winner";

  if (detail.includes("ace")) shot_type = "ace";
  else if (detail.includes("double")) shot_type = "double_fault";
  else if (detail.includes("error")) shot_type = "unforced_error";

  // ---------------- FLAGS ----------------
  const is_unforced_error = detail.includes("error");

  const is_winner =
    point_winner === "player" &&
    !is_unforced_error &&
    !detail.includes("double");

  // ---------------- EXTRA TAGS ----------------
  const extra_tags = [];

  if (row.serve_state === "first") extra_tags.push("serve_winner");
  if (row.serve_state === "second") extra_tags.push("return_winner");

  if (detail.includes("forehand")) extra_tags.push("forehand");
  if (detail.includes("backhand")) extra_tags.push("backhand");

  return {
    set_number: Number(row.set),
    game_number: Number(row.game),

    point_winner,
    shot_type,

    // ✅ NEW FIELD
    isServing,

    shot_direction: row.detail || null,

    is_winner,
    is_unforced_error,

    score_at_point: `${row.host_game_score ?? 0}-${row.guest_game_score ?? 0}`,

    timestamp: row.start_time || null,

    extra_tag: extra_tags.length ? extra_tags.join(",") : null,

    tagged_at: null,
    is_deleted: false,
  };
}