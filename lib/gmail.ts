export interface GmailMessageSummary {
  id: string;
  /** Gmail's web UI addresses conversations, not messages — deep links need this. */
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Fetches the most recent inbox messages for the signed-in user.
 * Uses `format=metadata` so we only pull headers + snippet, not full
 * bodies — cheaper and enough for a first "what's in my inbox" view.
 */
/**
 * Lean on Gmail's own categorisation to drop the obvious noise before it ever
 * reaches the model: marketing blasts and social notifications are never work.
 * `updates` is deliberately kept — receipts and booking confirmations from
 * vendors often land there.
 */
const INBOX_QUERY = "in:inbox -category:promotions -category:social";

export async function fetchRecentMessages(
  accessToken: string,
  maxResults = 25
): Promise<GmailMessageSummary[]> {
  const listRes = await fetch(
    `${GMAIL_API_BASE}/messages?maxResults=${maxResults}&q=${encodeURIComponent(
      INBOX_QUERY
    )}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    throw new Error(`Gmail list request failed: ${listRes.status}`);
  }

  const listData: { messages?: { id: string }[] } = await listRes.json();
  const ids = (listData.messages ?? []).map((m) => m.id);

  const messages = await Promise.all(
    ids.map((id) => fetchMessageSummary(accessToken, id))
  );

  return messages;
}

async function fetchMessageSummary(
  accessToken: string,
  id: string
): Promise<GmailMessageSummary> {
  const res = await fetch(
    `${GMAIL_API_BASE}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Gmail message request failed: ${res.status}`);
  }

  const data = await res.json();
  const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name === name)?.value ?? "";

  return {
    id,
    threadId: data.threadId ?? id,
    subject: getHeader("Subject") || "(no subject)",
    from: getHeader("From"),
    date: getHeader("Date"),
    snippet: data.snippet ?? "",
  };
}
