import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import { getUser } from '../../../lib/auth';
import PointLog from '../../../models/PointLog';
import Match from '../../../models/Match';

export async function GET(request) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(request.url);
  const match_id = searchParams.get('match_id');
  if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 });
  const match = await Match.findOne({ _id: match_id, userId: user.id });
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  const points = await PointLog.find({ match_id }).sort({ createdAt: -1 });
  return NextResponse.json(points);
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await request.json();
  const point = await PointLog.create({ ...body, timestamp: new Date().toISOString() });
  return NextResponse.json(point, { status: 201 });
}
