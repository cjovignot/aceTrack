import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUser } from "@/lib/auth";
import PointLog from "@/models/PointLog";
import Match from "@/models/Match";
import Pairing from "@/models/Pairing";
import { redis } from "@/lib/redis";

// ---------- AUTH ----------
async function isAuthorized(request, matchId) {
  // 1. USER
  const user = getUser(request);

  if (user) {
    const match = await Match.findOne({
      _id: matchId,
      userId: user.id,
    });

    if (match) return true;
  }

  // 2. DEVICE (watch)
  const token = request.headers.get("x-pairing-token");

  if (token) {
    const pairing = await Pairing.findOne({ token });

    if (
      pairing &&
      pairing.match_id &&
      pairing.match_id.toString() === matchId.toString()
    ) {
      return true;
    }
  }

  return false;
}

// ---------- DELETE (HARD) ----------
export async function DELETE(request, { params }) {
  await connectDB();

  const pointId = params.id;

  if (!pointId) {
    return NextResponse.json({ error: "Point id required" }, { status: 400 });
  }

  const point = await PointLog.findById(pointId);

  if (!point) {
    return NextResponse.json({ error: "Point not found" }, { status: 404 });
  }

  const authorized = await isAuthorized(request, point.match_id);

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await PointLog.findByIdAndDelete(pointId);

  return NextResponse.json({
    success: true,
    deletedPointId: pointId,
  });
}

// ---------- PATCH (SOFT DELETE) ----------
async function isAuthorizedForMatch(request, matchId) {
  const token = request.headers.get("x-pairing-token");

  if (token) {
    const pairingRaw = await redis.get(`pairing:${token}`);

    const pairing =
      typeof pairingRaw === "string" ? JSON.parse(pairingRaw) : pairingRaw;

    if (
      pairing?.connected &&
      pairing?.match_id?.toString() === matchId.toString()
    ) {
      return true;
    }
  }

  const user = getUser(request);

  if (user) {
    const match = await Match.findOne({
      _id: matchId,
      userId: user.id,
    });

    return !!match;
  }

  return false;
}

// ---------- PATCH (SOFT DELETE) ----------
export async function PATCH(request, { params }) {
  await connectDB();

  const pointId = params.id;

  const point = await PointLog.findById(pointId);

  if (!point) {
    return NextResponse.json({ error: "Point not found" }, { status: 404 });
  }

  const authorized = await isAuthorizedForMatch(request, point.match_id);

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await PointLog.findByIdAndUpdate(pointId, {
    is_deleted: true,
  });

  return NextResponse.json({ success: true });
}
