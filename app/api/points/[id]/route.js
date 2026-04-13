import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUser } from '../../../../lib/auth';
import PointLog from '../../../../models/PointLog';

export async function DELETE(request, { params }) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  await PointLog.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
