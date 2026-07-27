import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchRecentMessages } from "@/lib/gmail";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // The refresh attempt in the jwt callback failed — the planner has to
  // re-grant access. Say so explicitly instead of failing as a generic error.
  if (session.error || !session.accessToken) {
    return NextResponse.json(
      {
        error: "Your Google access expired. Please sign in again.",
        reauth: true,
      },
      { status: 401 }
    );
  }

  try {
    const messages = await fetchRecentMessages(session.accessToken, 15);
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Failed to fetch Gmail messages:", err);
    return NextResponse.json(
      { error: "Couldn't load your inbox. Try signing out and back in." },
      { status: 500 }
    );
  }
}
