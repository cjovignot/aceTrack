import { redis } from "@/lib/redis";

export async function POST(req) {
  const { token, match_id } = await req.json();

  const pairingRaw = await redis.get(`pairing:${token}`);

  const pairing =
    typeof pairingRaw === "string" ? JSON.parse(pairingRaw) : pairingRaw;

  if (!pairing) {
    return Response.json({ error: "Token invalide" }, { status: 404 });
  }

  const updated = {
    ...pairing,
    connected: true,
    match_id,
  };

  await redis.set(`pairing:${token}`, JSON.stringify(updated), { ex: 600 });

  console.log("PAIRING CONNECT:", { token, match_id });
  console.log("PAIRING BEFORE:", pairing);
  console.log("PAIRING AFTER:", updated);

  return Response.json({ success: true });
}
