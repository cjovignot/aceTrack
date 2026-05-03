import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PointLog from "@/models/PointLog";
import Match from "@/models/Match";
import { getUser } from "@/lib/auth";
import { mergeDateWithTime } from "@/lib/format";

export async function POST(request) {
  await connectDB();

  const user = getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { match_id, points, final_score } = body;

  if (!match_id || !Array.isArray(points)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // 🔥 FETCH MATCH (IMPORTANT)
  const match = await Match.findById(match_id);

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // 🔥 INSERT POINTS
  const inserted = await PointLog.insertMany(points);

  // 🔥 SORT LAST POINT
  const lastPoint = inserted
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .at(-1);

  // 🔥 BUILD END DATE
  const match_date_end = lastPoint
    ? mergeDateWithTime(match.match_date_start, lastPoint.createdAt)
    : null;

  // 🔥 UPDATE MATCH
  await Match.findByIdAndUpdate(match_id, {
    score: final_score,
    match_date_end,
  });

  return NextResponse.json({
    success: true,
    inserted: points.length,
    match_date_end,
  });
}
