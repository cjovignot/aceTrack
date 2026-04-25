import { redis } from "@/lib/redis";
import Match from "@/models/Match";

export async function POST(req) {
  const { token, match_id } = await req.json();

  const pairingRaw = await redis.get(`pairing:${token}`);

  const pairing =
    typeof pairingRaw === "string" ? JSON.parse(pairingRaw) : pairingRaw;

  if (!pairing) {
    return Response.json({ error: "Token invalide" }, { status: 404 });
  }

  // 🔥 récupérer le public_token
  const match = await Match.findById(match_id).select("public_token");

  if (!match) {
    return Response.json({ error: "Match introuvable" }, { status: 404 });
  }

  const updated = {
    ...pairing,
    connected: true,
    match_id,
    public_token: match.public_token, // ✅ AJOUT CLÉ
  };

  await redis.set(`pairing:${token}`, JSON.stringify(updated), { ex: 600 });

  return Response.json({ success: true });
}