import { pairingStore } from "../store";

export async function GET(req, { params }) {
  const { token } = await params; // ✅ obligatoire

  const pairing = pairingStore[token];

  if (!pairing) {
    return Response.json({ error: "Token invalide" }, { status: 404 });
  }

  if (Date.now() > pairing.expires_at) {
    delete pairingStore[token];
    return Response.json({ error: "Token expiré" }, { status: 410 });
  }

  return Response.json(pairing);
}
