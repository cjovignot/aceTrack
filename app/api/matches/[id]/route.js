import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUser } from "@/lib/auth";
import PointLog from "@/models/PointLog";
import Match from "@/models/Match";
import { redis } from "@/lib/redis";
// import Pairing from "@/models/Pairing";

// ---------- AUTH HELPER ----------
async function getAuthorizedMatch(request, id) {
  const user = getUser(request);

  if (user) {
    return await Match.findOne({ _id: id, userId: user.id });
  }

  const token = request.headers.get("x-pairing-token");
  if (!token) return null;

  const pairingRaw = await redis.get(`pairing:${token}`);
  if (!pairingRaw) return null;

  const pairing =
    typeof pairingRaw === "string" ? JSON.parse(pairingRaw) : pairingRaw;

  if (!pairing.connected) return null;

  const pairingMatchId = pairing.match_id?.toString();
  const requestMatchId = id?.toString();

  if (pairingMatchId !== requestMatchId) return null;

  return await Match.findById(id);
}

// ---------- GET MATCH ----------
export async function GET(request, context) {
  await connectDB();

  const params = await context.params;
  const id = params.id;

  // ---------- DEBUG HEADERS ----------
  const headers = Object.fromEntries(request.headers.entries());

  const cookieToken = request.cookies.get("token")?.value || null;
  const pairingToken = request.headers.get("x-pairing-token");

  // console.log("========== API MATCH DEBUG ==========");
  // console.log("MATCH ID:", id);
  // console.log("URL:", request.url);
  // console.log("METHOD:", request.method);

  // console.log("---------- AUTH INFO ----------");
  // console.log("Cookie token:", cookieToken);
  // console.log("Pairing token:", pairingToken);

  // console.log("---------- HEADERS ----------");
  // console.log(headers);

  // ---------- MATCH QUERY DEBUG ----------
  const match = await Match.findById(id);

  // console.log("---------- DB MATCH ----------");
  // console.log("Match found:", !!match);
  // console.log("Match userId:", match?.userId);

  if (match) {
    console.log("Match full:", {
      id: match._id,
      userId: match.userId,
      status: match.status,
    });
  }

  // ---------- AUTH RESULT ----------
  const authorizedMatch = await getAuthorizedMatch(request, id);

  // console.log("---------- AUTH RESULT ----------");
  // console.log("Authorized match:", !!authorizedMatch);

  if (!authorizedMatch) {
    // console.log("❌ REJECTED REQUEST (NO ACCESS)");
    // console.log("Reason: match not found OR auth failed");

    return NextResponse.json(
      {
        error: "Match not found or unauthorized",
        debug: {
          matchId: id,
          hasCookie: !!cookieToken,
          hasPairing: !!pairingToken,
          matchExists: !!match,
        },
      },
      { status: 404 },
    );
  }

  // console.log("✅ ACCESS GRANTED");

  return NextResponse.json(authorizedMatch);
}

// ---------- UPDATE MATCH ----------
export async function PATCH(request, context) {
  await connectDB();

  const params = await context.params;
  const id = params.id;

  const match = await getAuthorizedMatch(request, id);

  if (!match) {
    return NextResponse.json(
      { error: "Match not found or unauthorized" },
      { status: 404 },
    );
  }

  const body = await request.json();

  const updated = await Match.findByIdAndUpdate(id, body, {
    new: true,
  });

  return NextResponse.json(updated);
}

// ---------- DELETE MATCH (CASCADE POINTS) ----------
export async function DELETE(request, context) {
  await connectDB();

  const params = await context.params;
  const id = params.id;

  const match = await getAuthorizedMatch(request, id);

  if (!match) {
    return NextResponse.json(
      { error: "Match not found or unauthorized" },
      { status: 404 },
    );
  }

  await PointLog.deleteMany({ match_id: id });
  await Match.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
