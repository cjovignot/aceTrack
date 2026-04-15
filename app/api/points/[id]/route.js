import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUser } from "@/lib/auth";
import PointLog from "@/models/PointLog";
import Match from "@/models/Match";
import Pairing from "@/models/Pairing";

// ---------- DELETE ONE POINT ----------
export async function DELETE(request, { params }) {
  await connectDB();

  const pointId = params.id;

  if (!pointId) {
    return NextResponse.json({ error: "Point id required" }, { status: 400 });
  }

  // 1. récupérer le point
  const point = await PointLog.findById(pointId);

  if (!point) {
    return NextResponse.json({ error: "Point not found" }, { status: 404 });
  }

  const matchId = point.match_id;

  let authorized = false;

  // ---------- CAS 1 : USER CONNECTÉ ----------
  const user = getUser(request);

  if (user) {
    const match = await Match.findOne({
      _id: matchId,
      userId: user.id,
    });

    if (match) authorized = true;
  }

  // ---------- CAS 2 : WATCH / PAIRING TOKEN ----------
  if (!authorized) {
    const token = request.headers.get("x-pairing-token");

    if (token) {
      const pairing = await Pairing.findOne({ token });

      if (
        pairing &&
        pairing.match_id &&
        pairing.match_id.toString() === matchId.toString()
      ) {
        authorized = true;
      }
    }
  }

  // ---------- REFUS FINAL ----------
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ---------- DELETE ----------
  await PointLog.findByIdAndDelete(pointId);

  return NextResponse.json({
    success: true,
    deletedPointId: pointId,
  });
}
