import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db";
import { getUser } from "../../../lib/auth";
import PointLog from "../../../models/PointLog";
import Match from "../../../models/Match";
import Pairing from "../../../models/Pairing"; // 🔥 à ajouter

// 🔐 helper centralisé
async function getAuthorizedMatch(request, match_id) {
  const user = getUser(request);

  // ✅ cas user connecté
  if (user) {
    const match = await Match.findOne({ _id: match_id, userId: user.id });
    if (match) return match;
  }

  // 🔥 fallback pairing token (montre)
  const token = request.headers.get("x-pairing-token");
  if (!token) return null;

  const pairing = await Pairing.findOne({ token });

  if (!pairing) return null;

  if (pairing.match_id.toString() !== match_id) return null;

  return await Match.findById(match_id);
}

// ---------- GET ----------
export async function GET(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const match_id = searchParams.get("match_id");

  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  const match = await getAuthorizedMatch(request, match_id);

  if (!match) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const points = await PointLog.find({ match_id }).sort({ createdAt: -1 });

  return NextResponse.json(points);
}

// ---------- POST ----------
export async function POST(request) {
  await connectDB();

  const body = await request.json();
  const { match_id } = body;

  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  const match = await getAuthorizedMatch(request, match_id);

  if (!match) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const point = await PointLog.create({
    ...body,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(point, { status: 201 });
}

// ---------- DELETE (bulk) ----------
export async function DELETE(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const match_id = searchParams.get("match_id");

  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  const match = await getAuthorizedMatch(request, match_id);

  if (!match) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await PointLog.deleteMany({ match_id });

  return NextResponse.json({ success: true });
}
