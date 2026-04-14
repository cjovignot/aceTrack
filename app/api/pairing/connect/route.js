import { pairingStore } from "../store";

export async function POST(req) {
  const body = await req.json();
  const { token, match_id } = body;

  const pairing = pairingStore[token];

  if (!pairing) {
    return Response.json({ error: "Token invalide" }, { status: 404 });
  }

  pairing.connected = true;
  pairing.match_id = match_id;

  return Response.json({ success: true });
}