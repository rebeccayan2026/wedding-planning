import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchRecentMessages } from "@/lib/gmail";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const messages = await fetchRecentMessages((session as any).accessToken, 15);
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Failed to fetch Gmail messages:", err);
    return NextResponse.json(
      { error: "Couldn't load your inbox. Try signing out and back in." },
      { status: 500 }
    );
  }
}
