export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const match = await db.matches.findOne({
    public_token: token,
  });

  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json(match);
}