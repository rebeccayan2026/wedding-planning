import type { GmailMessageSummary } from "@/lib/gmail";

export type Insight = {
  id: string;
  risk: "high" | "medium" | "low";
  /** `promotional` is filtered out of the UI entirely. */
  category: "vendor" | "client" | "admin" | "promotional" | "other";
  /** Imperative, a few words — what the planner has to *do*, not what the mail says. */
  action: string;
  /** Only when the message states one outright; never inferred. */
  deadline: string | null;
};

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "anthropic/claude-opus-4-8";

const SYSTEM_PROMPT = `You triage the inbox of a wedding planner. For each message decide what the planner must DO about it, not what the message says.

Return ONLY a JSON object shaped like:
{"insights":[{"id":string,"risk":"high"|"medium"|"low","category":"vendor"|"client"|"admin"|"promotional"|"other","action":string,"deadline":string|null}]}
No prose, no markdown fences. One entry per message you were given, same id.

risk:
- "high": money, dates, or contracts are at stake, or someone is explicitly waiting on the planner. Acting late causes real damage.
- "medium": needs a reply or a decision, but not today.
- "low": informational. Confirmations, receipts, newsletters, anything already handled.

category:
- "promotional": marketing, newsletters, sales blasts, automated offers. Be aggressive here — if it is a mass mailing rather than a real person or a real transaction, it is promotional.
- "vendor": venues, florists, caterers, photographers, DJs, rentals.
- "client": the couple, their family, guests.
- "admin": invoices, contracts, banking, insurance, legal, platform notices.
- "other": anything else.

action: the concrete next step, imperative, at most 8 words. Write it in the same language as the message. Examples: "Confirm whether September works", "Pay the final invoice", "Sign and return the contract". For anything low-risk or promotional use exactly "No action needed".

deadline: copy the due date or time window ONLY if the message states one explicitly ("by Friday", "within 48 hours", "due July 31"). Keep it under 6 words. If the message does not state one, use null. Never guess or infer a deadline.`;

export async function analyzeInbox(
  messages: GmailMessageSummary[]
): Promise<Insight[]> {
  if (messages.length === 0) return [];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify(
            messages.map((m) => ({
              id: m.id,
              from: m.from,
              subject: m.subject,
              snippet: m.snippet,
            }))
          ),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter request failed: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json();
  const content: string | undefined = data.choices?.[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(extractJson(content)) as {
    insights?: Insight[];
    // Older prompt shape, kept so a stray response doesn't throw.
    flags?: Insight[];
  };

  const insights = parsed.insights ?? parsed.flags ?? [];
  const known = new Set(messages.map((m) => m.id));

  // The model occasionally invents or drops ids; only trust ones we asked about.
  return insights
    .filter((i) => i && known.has(i.id))
    .map((i) => ({
      id: i.id,
      risk: i.risk === "high" || i.risk === "medium" ? i.risk : "low",
      category: i.category ?? "other",
      action: (i.action ?? "").trim(),
      deadline: i.deadline?.trim() ? i.deadline.trim() : null,
    }));
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return text;
  return text.slice(start, end + 1);
}
