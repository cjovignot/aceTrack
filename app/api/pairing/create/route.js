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

  // 🔥 IMPORTANT : Redis stocke du string
  await redis.set(
    `pairing:${token}`,
    JSON.stringify(pairing),
    { ex: 60 * 60 * 6 }, // 6h
  );

  return Response.json({ token });
}
