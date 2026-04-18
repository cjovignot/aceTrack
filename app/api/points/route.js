import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUser } from "@/lib/auth";
import PointLog from "@/models/PointLog";
import Match from "@/models/Match";
import Pairing from "@/models/Pairing";
import { redis } from "@/lib/redis";

// ---------- AUTH HELPER ----------
export async function getAuthorizedMatch(request, match_id) {
  await connectDB();

  const token = request.headers.get("x-pairing-token");

  console.log(11111, token);

  // 🔥 1. PRIORITY: DEVICE / WATCH (Redis)
  if (token) {
    const pairingRaw = await redis.get(`pairing:${token}`);

    const pairing =
      typeof pairingRaw === "string" ? JSON.parse(pairingRaw) : pairingRaw;

    if (
      pairing.connected &&
      pairing.match_id &&
      pairing.match_id.toString() === match_id
    ) {
      return await Match.findById(match_id);
    }

    return null;
  }

  // 🔥 2. FALLBACK: USER AUTH
  const user = getUser(request);

  if (user) {
    return await Match.findOne({
      _id: match_id,
      userId: user.id,
    });
  }

  return null;
}

// ---------- GET POINTS ----------
export async function GET(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const match_id = searchParams.get("match_id");

  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  const match = await getAuthorizedMatch(request, match_id);

  if (!match) {
    return NextResponse.json(
      { error: "Unauthorized or match not found" },
      { status: 404 },
    );
  }

  const points = await PointLog.find({ match_id }).sort({
    createdAt: -1,
  });

  return NextResponse.json(points);
}

// ---------- CREATE POINT ----------
export async function POST(request) {
  await connectDB();

  let body;

  try {
    body = await request.json();
    console.log(body);
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const match_id = body?.match_id;

  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  const match = await getAuthorizedMatch(request, match_id);

  if (!match) {
    return NextResponse.json(
      { error: "Unauthorized or match not found" },
      { status: 404 },
    );
  }

  const point = await PointLog.create({
    ...body,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(point, { status: 201 });
}

// ---------- DELETE ALL POINTS (match level) ----------
export async function DELETE(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const match_id = searchParams.get("match_id");

  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  const match = await getAuthorizedMatch(request, match_id);

  if (!match) {
    return NextResponse.json(
      { error: "Unauthorized or match not found" },
      { status: 404 },
    );
  }

  await PointLog.deleteMany({ match_id });

  return NextResponse.json({
    success: true,
    deleted: true,
  });
}
