import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeInboxRisk, type RiskFlag } from "@/lib/ai";
import { supabase } from "@/lib/supabase";
import { getOrCreatePlanner } from "@/lib/planner";
import type { GmailMessageSummary } from "@/lib/gmail";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messages } = (await request.json()) as {
    messages: GmailMessageSummary[];
  };

  try {
    const plannerId = await getOrCreatePlanner(
      session.user.email,
      session.user.name
    );

    const { data: cached, error: cacheError } = await supabase
      .from("email_risk_flags")
      .select("gmail_message_id, risk, reason")
      .eq("planner_id", plannerId)
      .in(
        "gmail_message_id",
        messages.map((m) => m.id)
      );

    if (cacheError) throw cacheError;

    const cachedIds = new Set((cached ?? []).map((c) => c.gmail_message_id));
    const uncached = messages.filter((m) => !cachedIds.has(m.id));

    const freshFlags = await analyzeInboxRisk(uncached);

    if (freshFlags.length > 0) {
      const rows = freshFlags.map((f) => {
        const message = messages.find((m) => m.id === f.id)!;
        return {
          planner_id: plannerId,
          gmail_message_id: f.id,
          subject: message.subject,
          from_address: message.from,
          snippet: message.snippet,
          date: message.date,
          risk: f.risk,
          reason: f.reason,
        };
      });

      const { error: insertError } = await supabase
        .from("email_risk_flags")
        .insert(rows);
      if (insertError) throw insertError;
    }

    const flags: RiskFlag[] = [
      ...(cached ?? []).map(
        (c) =>
          ({
            id: c.gmail_message_id,
            risk: c.risk,
            reason: c.reason,
          }) as RiskFlag
      ),
      ...freshFlags,
    ];

    return NextResponse.json({ flags });
  } catch (err) {
    console.error("Failed to analyze inbox risk:", err);
    return NextResponse.json(
      { error: "Couldn't analyze your inbox right now." },
      { status: 500 }
    );
  }
}
