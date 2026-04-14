import { redis } from "@/lib/redis";

export async function GET(req, { params }) {
  const { token } = await params;

  const pairing = await redis.get(`pairing:${token}`);

  if (!pairing) {
    return Response.json({ error: "Token invalide" }, { status: 404 });
  }

  return Response.json(pairing);
}
