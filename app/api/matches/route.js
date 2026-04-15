import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db";
import { getUser } from "../../../lib/auth";
import Match from "../../../models/Match";
import Pairing from "../../../models/Pairing"; // 🔥 à ajouter

export async function GET(request) {
  await connectDB();

  const user = getUser(request);
  const { searchParams } = new URL(request.url);

  // 🔥 CAS 1 : utilisateur connecté
  if (user) {
    const filter = { userId: user.id };

    if (searchParams.get("status")) {
      filter.status = searchParams.get("status");
    }

    const limit = parseInt(searchParams.get("limit")) || 50;

    const matches = await Match.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json(matches);
  }

  // 🔥 CAS 2 : accès via pairing token (montre)
  const token = request.headers.get("x-pairing-token");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pairing = await Pairing.findOne({ token });

  if (!pairing || !pairing.match_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const match = await Match.findById(pairing.match_id);

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // ⚠️ la montre reçoit UN SEUL match
  return NextResponse.json([match]);
}

export async function POST(request) {
  const user = getUser(request);

  // ❌ création interdite depuis la montre
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();

  const match = await Match.create({
    ...body,
    userId: user.id,
  });

  return NextResponse.json(match, { status: 201 });
}
