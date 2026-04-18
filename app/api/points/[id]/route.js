import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUser } from "@/lib/auth";
import PointLog from "@/models/PointLog";
import Match from "@/models/Match";
import Pairing from "@/models/Pairing";

// ---------- DELETE ONE POINT ----------
export async function DELETE(request, context) {
  await connectDB();

  const { params } = context;
  const pointId = params.id;

  console.log(params);

  if (!pointId) {
    return NextResponse.json({ error: "Point id required" }, { status: 400 });
  }

  const point = await PointLog.findById(pointId);

  if (!point) {
    return NextResponse.json({ error: "Point not found" }, { status: 404 });
  }

  const matchId = point.match_id;

  let authorized = false;

  const user = getUser(request);

  if (user) {
    const match = await Match.findOne({
      _id: matchId,
      userId: user.id,
    });

    if (match) authorized = true;
  }

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

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await PointLog.findByIdAndDelete(pointId);

  return NextResponse.json({
    success: true,
    deletedPointId: pointId,
  });
}
