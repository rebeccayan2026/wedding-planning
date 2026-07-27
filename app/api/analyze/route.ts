import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeInbox, type Insight } from "@/lib/ai";
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
      .select("gmail_message_id, risk, category, action, deadline")
      .eq("planner_id", plannerId)
      .in(
        "gmail_message_id",
        messages.map((m) => m.id)
      );

    if (cacheError) throw cacheError;

    const cachedIds = new Set((cached ?? []).map((c) => c.gmail_message_id));
    const uncached = messages.filter((m) => !cachedIds.has(m.id));

    const fresh = await analyzeInbox(uncached);

    if (fresh.length > 0) {
      const rows = fresh.map((insight) => {
        const message = messages.find((m) => m.id === insight.id)!;
        return {
          planner_id: plannerId,
          gmail_message_id: insight.id,
          subject: message.subject,
          from_address: message.from,
          snippet: message.snippet,
          date: message.date,
          risk: insight.risk,
          category: insight.category,
          action: insight.action,
          deadline: insight.deadline,
        };
      });

      const { error: insertError } = await supabase
        .from("email_risk_flags")
        .insert(rows);
      if (insertError) throw insertError;
    }

    const insights: Insight[] = [
      ...(cached ?? []).map(
        (c) =>
          ({
            id: c.gmail_message_id,
            risk: c.risk,
            category: c.category ?? "other",
            action: c.action ?? "",
            deadline: c.deadline,
          }) as Insight
      ),
      ...fresh,
    ];

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("Failed to analyze inbox:", err);
    return NextResponse.json(
      { error: "Couldn't analyze your inbox right now." },
      { status: 500 }
    );
  }
}
