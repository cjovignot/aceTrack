import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUser } from "@/lib/auth";
import Match from "@/models/Match";

// ---------- GET MATCHES ----------
export async function GET(request) {
  try {
    await connectDB();

    const user = getUser(request);

    const { searchParams } = new URL(request.url);

    const filter = {};

    // ⚠️ sécurité : seulement si user connecté
    if (user) {
      filter.userId = user.id;
    }

    const status = searchParams.get("status");
    if (status) filter.status = status;

    const limitRaw = searchParams.get("limit");
    const limit = Number.isNaN(parseInt(limitRaw)) ? 50 : parseInt(limitRaw);

    const matches = await Match.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json(matches);
  } catch (err) {
    console.error("GET /api/matches ERROR:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------- CREATE MATCH ----------
export async function POST(request) {
  try {
    await connectDB();

    const user = getUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const match = await Match.create({
      ...body,
      userId: user.id,
    });

    return NextResponse.json(match, { status: 201 });
  } catch (err) {
    console.error("POST /api/matches ERROR:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
