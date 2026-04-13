import { NextResponse } from 'next/server';
import { getUser } from '../../../../lib/auth';
import { connectDB } from '../../../../lib/db';
import User from '../../../../models/User';

export async function GET(request) {
  const payload = getUser(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const user = await User.findById(payload.id).select('-__v');
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}
