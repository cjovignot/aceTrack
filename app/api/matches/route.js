import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db";
import { getUser } from "../../../lib/auth";
import Match from "../../../models/Match";

export async function GET(request) {
  const user = getUser(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(request.url);
  const filter = { userId: user.id };
  if (searchParams.get("status")) filter.status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit")) || 50;
  const matches = await Match.find(filter).sort({ createdAt: -1 }).limit(limit);
  return NextResponse.json(matches);
}

export async function POST(request) {
  const user = getUser(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await request.json();
  const match = await Match.create({ ...body, userId: user.id });
  return NextResponse.json(match, { status: 201 });
}
