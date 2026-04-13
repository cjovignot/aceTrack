import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUser } from '../../../../lib/auth';
import Match from '../../../../models/Match';

export async function GET(request, { params }) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const match = await Match.findOne({ _id: params.id, userId: user.id });
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(match);
}

export async function PATCH(request, { params }) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const match = await Match.findOne({ _id: params.id, userId: user.id });
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json();
  Object.assign(match, body);
  await match.save();
  return NextResponse.json(match);
}

export async function DELETE(request, { params }) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const match = await Match.findOne({ _id: params.id, userId: user.id });
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await match.deleteOne();
  return NextResponse.json({ ok: true });
}
