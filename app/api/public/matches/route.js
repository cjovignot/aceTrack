import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status"); // live | finished | all
  const search = searchParams.get("search"); // texte

  const query = {};

  // 🎯 FILTER STATUS
  if (status === "live") {
    query.status = "En cours";
  } else if (status === "finished") {
    query.status = "Terminé";
  }

  // 🔍 SEARCH (optionnel)
  if (search) {
    query.$or = [
      { player_name: { $regex: search, $options: "i" } },
      { opponent_name: { $regex: search, $options: "i" } },
    ];
  }

  const matches = await Match.find(query)
    .select(
      "_id player_name opponent_name score updatedAt public_token status createdAt",
    )
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json(matches);
}
