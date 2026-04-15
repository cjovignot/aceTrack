import Pairing from "../models/Pairing";
import { getUser } from "./auth";

export async function getUserOrPairing(request) {
  const user = getUser(request);
  if (user) return { type: "user", user };

  const token = request.headers.get("x-pairing-token");
  if (!token) return null;

  const pairing = await Pairing.findOne({ token });
  if (!pairing) return null;

  return {
    type: "pairing",
    matchId: pairing.match_id,
  };
}
