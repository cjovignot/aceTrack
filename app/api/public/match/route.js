import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";

export async function GET(req) {
  await connectDB(); // ✅ correct

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const match = await Match.findOne({
    public_token: token,
  }).lean();

  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 🔥 filtrer les données exposées
  const safeMatch = {
    _id: match._id,
    score: match.score,
    status: match.status,
    player_name: match.player_name,
    opponent_name: match.opponent_name,
    updatedAt: match.updatedAt,
    public_token: match.public_token,
    match_date_start: match.match_date_start,
    match_date_end: match.match_date_end,
  };

  return NextResponse.json(safeMatch);
}
