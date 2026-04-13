import jwt from 'jsonwebtoken';

export function getUser(request) {
  const token = request.cookies?.get?.('token')?.value
    || (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}
