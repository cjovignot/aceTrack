import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getUser } from "../../../lib/auth";

export async function POST(request) {
  const user = getUser(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const { data } = await request.json();
  const result = await cloudinary.uploader.upload(data, {
    folder: "acetrack",
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  });

  return NextResponse.json({ url: result.secure_url });
}
