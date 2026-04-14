import { redis } from "@/lib/redis";

function generateToken() {
  return Math.random().toString(36).substring(2, 10);
}

export async function POST() {
  const token = generateToken();

  const pairing = {
    token,
    match_id: null,
    connected: false,
    created_at: Date.now(),
  };

  // 🔥 TTL 10 minutes
  await redis.set(`pairing:${token}`, pairing, { ex: 600 });

  return Response.json({ token });
}
