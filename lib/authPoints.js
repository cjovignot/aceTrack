export async function isAuthorizedForMatch(request, matchId) {
  const token = request.headers.get("x-pairing-token");

  // 1. WATCH / DEVICE
  if (token) {
    const pairingRaw = await redis.get(`pairing:${token}`);

    const pairing =
      typeof pairingRaw === "string" ? JSON.parse(pairingRaw) : pairingRaw;

    if (
      pairing?.connected &&
      pairing?.match_id &&
      pairing.match_id.toString() === matchId.toString()
    ) {
      return true;
    }
  }

  // 2. USER
  const user = getUser(request);

  if (user) {
    const match = await Match.findOne({
      _id: matchId,
      userId: user.id,
    });

    return !!match;
  }

  return false;
}
