import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import { getUser } from '../../../lib/auth';
import PlayerProfile from '../../../models/PlayerProfile';

export async function GET(request) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const profile = await PlayerProfile.findOne({ userId: user.id });
  return NextResponse.json(profile || null);
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await request.json();
  const profile = await PlayerProfile.create({ ...body, userId: user.id });
  return NextResponse.json(profile, { status: 201 });
}

export async function PUT(request) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await request.json();
  const profile = await PlayerProfile.findOneAndUpdate({ userId: user.id }, body, { new: true, upsert: true });
  return NextResponse.json(profile);
}
