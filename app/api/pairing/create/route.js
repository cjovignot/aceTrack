import { pairingStore } from "../store";

function generateToken() {
  return Math.random().toString(36).substring(2, 10);
}

export async function POST() {
  const token = generateToken();

  pairingStore[token] = {
    token,
    match_id: null,
    connected: false,
    created_at: Date.now(),
    expires_at: Date.now() + 1000 * 60 * 10,
  };

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}