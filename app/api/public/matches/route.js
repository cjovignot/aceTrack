import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";

export async function GET() {
  await connectDB();

  const matches = await Match.find({
    status: "En cours",
  })
    .select("_id player_name opponent_name score updatedAt public_token")
    .lean();

  return NextResponse.json(matches);
}