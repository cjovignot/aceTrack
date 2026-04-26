import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Match from "@/models/Match";
import PointLog from "@/models/PointLog"; // ✅ FIX

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    await connectDB();

    /* =========================
       1. MATCH
    ========================= */
    const match = await Match.findOne({
      public_token: token,
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    /* =========================
       2. POINTS (PointLog ✅)
    ========================= */
    const points = await PointLog.find({
      match_id: match._id,
      is_deleted: { $ne: true },
    })
      .sort({ timestamp: 1 })
      .select("timestamp point_winner shot_type score_at_point")
      .lean();

    return NextResponse.json(points);
  } catch (err) {
    console.error("match-points error:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}