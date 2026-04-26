import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    const client = await clientPromise;
    const db = client.db();

    /* =========================
       1. FIND MATCH BY TOKEN
    ========================= */
    const match = await db.collection("matches").findOne({
      public_token: token,
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    /* =========================
       2. FETCH POINTS
    ========================= */
    const points = await db
      .collection("points")
      .find({
        match_id: new ObjectId(match._id),
        is_deleted: { $ne: true },
      })
      .sort({ timestamp: 1 })
      .toArray();

    /* =========================
       3. NORMALIZE OUTPUT
    ========================= */
    const formatted = points.map((p) => ({
      _id: p._id,
      timestamp: p.timestamp,
      point_winner: p.point_winner,
      shot_type: p.shot_type,
      score_at_point: p.score_at_point,
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("match-points error:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}