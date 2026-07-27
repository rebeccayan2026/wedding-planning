"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { GmailMessageSummary } from "@/lib/gmail";
import type { Insight } from "@/lib/ai";
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
  const [insights, setInsights] = useState<Record<string, Insight>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [showRest, setShowRest] = useState(false);

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
        if (data.insights) {
          const byId: Record<string, Insight> = {};
          for (const insight of data.insights as Insight[]) {
            byId[insight.id] = insight;
          }
          setInsights(byId);
        }
      })
      .catch(() => {})
      .finally(() => setAnalyzing(false));
  }

  const { urgent, soon, rest, filteredAds } = useMemo(() => {
    const all = messages ?? [];

    // Marketing that slipped past Gmail's own category filter — never shown.
    const ads = all.filter((m) => insights[m.id]?.category === "promotional");
    const adIds = new Set(ads.map((m) => m.id));
    const keep = all.filter((m) => !adIds.has(m.id));

    const byRisk = (risk: Insight["risk"]) =>
      keep
        .filter((m) => insights[m.id]?.risk === risk)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date));

    const urgent = byRisk("high");
    const soon = byRisk("medium");
    const flagged = new Set([...urgent, ...soon].map((m) => m.id));

    return {
      urgent,
      soon,
      rest: keep.filter((m) => !flagged.has(m.id)),
      filteredAds: ads.length,
    };
  }, [messages, insights]);

  if (status === "loading") {
    return <Centered>{null}</Centered>;
  }

  if (status !== "authenticated") {
    return (
      <SignInPrompt
        body="Connect your Gmail and Sparks AI will tell you what needs doing today — date changes, unpaid invoices, contracts waiting on you."
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

  const needsAttention = urgent.length + soon.length;

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
            {analyzing ? (
              <>
                <p className="inline-flex items-center gap-2 text-[13px] text-neutral-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
                  Working out what needs you…
                </p>
                <AttentionSkeleton />
              </>
            ) : (
              <>
                <p className="text-[13px] text-neutral-500">
                  {urgent.length > 0 && (
                    <span className="font-medium text-red-700">
                      {urgent.length} urgent
                    </span>
                  )}
                  {urgent.length > 0 && soon.length > 0 && (
                    <span className="mx-1.5 text-neutral-300">·</span>
                  )}
                  {soon.length > 0 && (
                    <span className="text-neutral-700">
                      {soon.length} this week
                    </span>
                  )}
                  {needsAttention > 0 && (
                    <span className="mx-1.5 text-neutral-300">·</span>
                  )}
                  {rest.length} other{rest.length === 1 ? "" : "s"}
                </p>

                {needsAttention > 0 && (
                  <section className="mt-6 space-y-6">
                    {urgent.length > 0 && (
                      <div>
                        <SectionLabel>Needs you today</SectionLabel>
                        <ul className="mt-3 space-y-2.5">
                          {urgent.map((m) => (
                            <AttentionCard
                              key={m.id}
                              message={m}
                              insight={insights[m.id]}
                            />
                          ))}
                        </ul>
                      </div>
                    )}

                    {soon.length > 0 && (
                      <div>
                        <SectionLabel>Before the week is out</SectionLabel>
                        <ul className="mt-3 space-y-2.5">
                          {soon.map((m) => (
                            <AttentionCard
                              key={m.id}
                              message={m}
                              insight={insights[m.id]}
                            />
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {needsAttention === 0 && (
                  <p className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-6 text-center text-[13px] text-neutral-500">
                    Nothing needs your attention right now.
                  </p>
                )}

                {rest.length > 0 && (
                  <section className="mt-10">
                    <button
                      onClick={() => setShowRest((v) => !v)}
                      className="flex w-full items-center gap-2 rounded-md py-1 text-left transition-colors hover:opacity-70"
                    >
                      <SectionLabel>
                        Everything else ({rest.length})
                      </SectionLabel>
                      <span className="text-[11px] text-neutral-400">
                        {showRest ? "Hide" : "Show"}
                      </span>
                    </button>

                    {showRest && (
                      <ul className="mt-1 divide-y divide-neutral-100">
                        {rest.map((m) => (
                          <CompactRow key={m.id} message={m} />
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                {filteredAds > 0 && (
                  <p className="mt-6 text-xs text-neutral-400">
                    {filteredAds} promotional message
                    {filteredAds === 1 ? "" : "s"} hidden.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
