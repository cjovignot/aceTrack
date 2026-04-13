import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '../../../../lib/db';
import User from '../../../../models/User';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const { access_token } = await tokenRes.json();

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + access_token },
  });
  const profile = await profileRes.json();
  if (!profile.sub) return NextResponse.json({ error: 'Invalid Google profile' }, { status: 400 });

  await connectDB();
  let user = await User.findOne({ googleId: profile.sub });
  if (!user) {
    user = await User.create({ googleId: profile.sub, email: profile.email, name: profile.name, avatar: profile.picture });
  }

  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 604800, path: '/' });
  return response;
}
