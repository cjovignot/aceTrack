import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { getUser } from "../../../../lib/auth";
import PointLog from "../../../../models/PointLog";
import Match from "../../../../models/Match";
import Pairing from "../../../../models/Pairing";

export async function DELETE(request, { params }) {
  await connectDB();

  const user = getUser(request);

  // 1. récupérer le point
  const point = await PointLog.findById(params.id);
  if (!point) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let authorized = false;

  // 🔥 CAS 1 : user connecté
  if (user) {
    const match = await Match.findOne({
      _id: point.match_id,
      userId: user.id,
    });

    if (match) authorized = true;
  }

  // 🔥 CAS 2 : pairing token (montre)
  if (!authorized) {
    const token = request.headers.get("x-pairing-token");

    if (token) {
      const pairing = await Pairing.findOne({ token });

      if (
        pairing &&
        pairing.match_id.toString() === point.match_id.toString()
      ) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. suppression
  await PointLog.findByIdAndDelete(params.id);

  return NextResponse.json({ ok: true });
}
