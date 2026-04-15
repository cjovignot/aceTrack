import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUser } from "@/lib/auth";
import PointLog from "@/models/PointLog";
import Match from "@/models/Match";
import Pairing from "@/models/Pairing"; // 🔥 AJOUT

// ---------- HELPER AUTH ----------
async function getAuthorizedMatch(request, id) {
  const user = getUser(request);

  // ✅ cas user connecté
  if (user) {
    return await Match.findOne({ _id: id, userId: user.id });
  }

  // ✅ fallback montre via token
  const token = request.headers.get("x-pairing-token");
  if (!token) return null;

  const pairing = await Pairing.findOne({ token });

  if (!pairing) return null;
  if (pairing.match_id.toString() !== id) return null;

  return await Match.findById(id);
}

// ---------- GET ONE MATCH ----------
export async function GET(request, { params }) {
  const { id } = params;

  await connectDB();

  const match = await getAuthorizedMatch(request, id);

  if (!match) {
    return NextResponse.json(
      { error: "Unauthorized or not found" },
      { status: 401 },
    );
  }

  return NextResponse.json(match);
}

// ---------- UPDATE MATCH ----------
export async function PUT(request, { params }) {
  const { id } = params;

  await connectDB();

  const match = await getAuthorizedMatch(request, id);
  if (!match) {
    return NextResponse.json(
      { error: "Unauthorized or not found" },
      { status: 401 },
    );
  }

  const body = await request.json();

  const updated = await Match.findByIdAndUpdate(id, body, { new: true });

  return NextResponse.json(updated);
}

// ---------- DELETE MATCH ----------
export async function DELETE(request, { params }) {
  const { id } = params;

  await connectDB();

  const match = await getAuthorizedMatch(request, id);
  if (!match) {
    return NextResponse.json(
      { error: "Unauthorized or not found" },
      { status: 401 },
    );
  }

  // cascade delete
  await PointLog.deleteMany({ match_id: id });
  await Match.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
