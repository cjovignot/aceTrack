import { redis } from "@/lib/redis";

export async function GET(req, { params }) {
  const { token } = await params;

  const pairingRaw = await redis.get(`pairing:${token}`);

  const pairing =
    typeof pairingRaw === "string" ? JSON.parse(pairingRaw) : pairingRaw;

  if (!pairing) {
    return Response.json({ error: "Token invalide" }, { status: 404 });
  }

  return Response.json(pairing);
}
