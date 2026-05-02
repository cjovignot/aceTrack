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

// ---------- AUTHORIZING ----------
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
  const { id } = await params;
  const pointId = id;

  if (!pointId) {
    return NextResponse.json({ error: "Missing point id" }, { status: 400 });
  }

  const body = await request.json();

  const point = await PointLog.findById(pointId);

  if (!point) {
    return NextResponse.json({ error: "Point not found" }, { status: 404 });
  }

  const authorized = await isAuthorizedForMatch(request, point.match_id);

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 🧠 UPDATE dynamique
  const update = {};

  // ---- SOFT DELETE ----
  if (typeof body.is_deleted === "boolean") {
    update.is_deleted = body.is_deleted;
  }

  // ---- EXTRA TAG ----
  if (body.extra_tag) {
    const allowedTags = [
      "serve_winner",
      "return_winner",
      "forehand",
      "backhand",
    ];

    if (!allowedTags.includes(body.extra_tag)) {
      return NextResponse.json({ error: "Invalid extra_tag" }, { status: 400 });
    }

    update.extra_tag = body.extra_tag;
  }

  // ---- RIEN À UPDATE ----
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await PointLog.findByIdAndUpdate(pointId, update, {
    new: true,
  });

  return NextResponse.json({
    success: true,
    point: updated,
  });
}
