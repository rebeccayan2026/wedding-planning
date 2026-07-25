import type { GmailMessageSummary } from "@/lib/gmail";

export type RiskFlag = {
  id: string;
  risk: "high" | "medium" | "low";
  reason: string;
};

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "anthropic/claude-opus-4-8";

export async function analyzeInboxRisk(
  messages: GmailMessageSummary[]
): Promise<RiskFlag[]> {
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
        {
          role: "system",
          content:
            'You are a wedding planning assistant. Review the inbox messages and flag which ones need the planner\'s attention — vendor date changes, payment reminders, contract issues, cancellations, or urgent client requests. Give every message a risk level and a one-sentence reason. Most everyday emails should be "low". Respond with ONLY a JSON object of the shape {"flags":[{"id":string,"risk":"high"|"medium"|"low","reason":string}]} — no other text, no markdown fences.',
        },
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

  const parsed = JSON.parse(extractJson(content)) as { flags: RiskFlag[] };
  return parsed.flags;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return text;
  return text.slice(start, end + 1);
}
