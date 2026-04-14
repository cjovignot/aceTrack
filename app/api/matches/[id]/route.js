import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUser } from "@/lib/auth";
import PointLog from "@/models/PointLog";
import Match from "@/models/Match";

// ---------- GET ONE MATCH ----------
export async function GET(request, { params }) {
  const { id } = await params; // 🔥 OBLIGATOIRE en Next 15

  const user = getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const match = await Match.findOne({
    _id: id,
    userId: user.id,
  });

  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(match);
}

// ---------- UPDATE MATCH ----------
export async function PUT(request, { params }) {
  const { id } = await params; // 🔥 pareil ici

  const user = getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();

  const match = await Match.findOneAndUpdate(
    { _id: id, userId: user.id },
    body,
    { new: true },
  );

  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(match);
}

export async function DELETE(request, { params }) {
  const user = getUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // 1. vérifier que le match appartient à l'utilisateur
  const match = await Match.findOne({
    _id: params.id,
    userId: user.id,
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // 2. supprimer tous les points liés (cascade)
  await PointLog.deleteMany({ match_id: params.id });

  // 3. supprimer le match
  await Match.findByIdAndDelete(params.id);

  return NextResponse.json({ success: true });
}
