import { redis } from "@/lib/redis";

export async function POST(req) {
  const { token, match_id } = await req.json();

  const pairing = await redis.get(`pairing:${token}`);

  if (!pairing) {
    return Response.json({ error: "Token invalide" }, { status: 404 });
  }

  const updated = {
    ...pairing,
    connected: true,
    match_id,
  };

  await redis.set(`pairing:${token}`, updated, { ex: 600 });

  return Response.json({ success: true });
}
