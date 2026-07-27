"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { GmailMessageSummary } from "@/lib/gmail";
import type { RiskFlag } from "@/lib/ai";
import {
  AttentionCard,
  AttentionSkeleton,
  Centered,
  CompactRow,
  InboxSkeleton,
  SectionLabel,
  SignInPrompt,
} from "@/components/inbox";

export default function Home() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<GmailMessageSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskFlags, setRiskFlags] = useState<Record<string, RiskFlag>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    setLoading(true);
    setError(null);

    fetch("/api/emails")
      .then((res) => res.json())
      .then((data) => {
        if (data.reauth) {
          setNeedsReauth(true);
        } else if (data.error) {
          setError(data.error);
        } else {
          setMessages(data.messages);
          analyzeMessages(data.messages);
        }
      })
      .catch(() => setError("Something went wrong loading your inbox."))
      .finally(() => setLoading(false));
  }, [status]);

  function analyzeMessages(messages: GmailMessageSummary[]) {
    if (messages.length === 0) return;

    setAnalyzing(true);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.flags) {
          const byId: Record<string, RiskFlag> = {};
          for (const flag of data.flags as RiskFlag[]) {
            byId[flag.id] = flag;
          }
          setRiskFlags(byId);
        }
      })
      .catch(() => {})
      .finally(() => setAnalyzing(false));
  }

  // Split the inbox by what actually needs the planner: flagged mail gets a
  // full card, everything else collapses to one scannable line.
  const { attention, rest } = useMemo(() => {
    const all = messages ?? [];
    const rank: Record<string, number> = { high: 0, medium: 1 };

    const attention = all
      .filter((m) => {
        const risk = riskFlags[m.id]?.risk;
        return risk === "high" || risk === "medium";
      })
      .sort((a, b) => {
        const byRisk = rank[riskFlags[a.id].risk] - rank[riskFlags[b.id].risk];
        if (byRisk !== 0) return byRisk;
        return +new Date(b.date) - +new Date(a.date);
      });

    const flagged = new Set(attention.map((m) => m.id));
    return { attention, rest: all.filter((m) => !flagged.has(m.id)) };
  }, [messages, riskFlags]);

  if (status === "loading") {
    return <Centered>{null}</Centered>;
  }

  if (status !== "authenticated") {
    return (
      <SignInPrompt
        body="Connect your Gmail and Sparks AI will flag the messages that need you first — date changes, payment reminders, anything urgent."
        cta="Connect Google account"
      />
    );
  }

  // Google access lapsed and couldn't be renewed silently — most likely the
  // refresh token expired (Google caps these at 7 days while the OAuth app is
  // still in "Testing"). Ask for a fresh grant rather than showing an error.
  if (needsReauth) {
    return (
      <SignInPrompt
        body="Your Google access has expired. Reconnect to keep reading your wedding inbox."
        cta="Reconnect Google account"
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900">
            Sparks AI
          </span>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden truncate text-xs text-neutral-400 sm:block">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        {loading && <InboxSkeleton />}

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {messages && messages.length === 0 && (
          <p className="py-16 text-center text-sm text-neutral-400">
            Your inbox is empty.
          </p>
        )}

        {messages && messages.length > 0 && (
          <>
            <p className="text-[13px] text-neutral-500">
              {analyzing ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
                  Checking {messages.length} messages…
                </span>
              ) : (
                <>
                  <span className="font-medium text-neutral-900">
                    {attention.length}
                  </span>
                  {attention.length === 1 ? " needs" : " need"} attention
                  <span className="mx-1.5 text-neutral-300">·</span>
                  {rest.length} other{rest.length === 1 ? "" : "s"}
                </>
              )}
            </p>

            {analyzing && <AttentionSkeleton />}

            {!analyzing && attention.length > 0 && (
              <section className="mt-6">
                <SectionLabel>Needs attention</SectionLabel>
                <ul className="mt-3 space-y-2.5">
                  {attention.map((m) => (
                    <AttentionCard
                      key={m.id}
                      message={m}
                      flag={riskFlags[m.id]}
                    />
                  ))}
                </ul>
              </section>
            )}

            {!analyzing && attention.length === 0 && (
              <p className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-6 text-center text-[13px] text-neutral-500">
                Nothing needs your attention right now.
              </p>
            )}

            {rest.length > 0 && (
              <section className="mt-10">
                <SectionLabel>
                  {attention.length > 0 || analyzing
                    ? "Everything else"
                    : "Recent"}
                </SectionLabel>
                <ul className="mt-1 divide-y divide-neutral-100">
                  {rest.map((m) => (
                    <CompactRow key={m.id} message={m} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
