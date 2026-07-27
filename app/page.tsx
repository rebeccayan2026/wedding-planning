"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import type { GmailMessageSummary } from "@/lib/gmail";
import type { RiskFlag } from "@/lib/ai";

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

  if (status === "loading") {
    return <Centered>Loading…</Centered>;
  }

  // Google access lapsed and couldn't be renewed silently — most likely the
  // refresh token expired (Google caps these at 7 days while the OAuth app is
  // still in "Testing"). Ask for a fresh grant rather than showing an error.
  if (needsReauth) {
    return (
      <Centered>
        <div className="max-w-sm text-center space-y-6 px-6">
          <h1 className="font-serif text-3xl text-stone-800">Sparks AI</h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            Your Google access has expired. Reconnect to keep reading your
            wedding inbox.
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full rounded-full bg-stone-800 text-white py-3 text-sm tracking-wide hover:bg-stone-700 transition-colors"
          >
            Reconnect Google account
          </button>
        </div>
      </Centered>
    );
  }

  if (status !== "authenticated") {
    return (
      <Centered>
        <div className="max-w-sm text-center space-y-6 px-6">
          <h1 className="font-serif text-3xl text-stone-800">Sparks AI</h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            Connect your Gmail to see a live view of your wedding inbox —
            nothing is stored, this reads straight from your account.
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full rounded-full bg-stone-800 text-white py-3 text-sm tracking-wide hover:bg-stone-700 transition-colors"
          >
            Connect Google account
          </button>
        </div>
      </Centered>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-start justify-between mb-10">
          <div>
            <h1 className="font-serif text-2xl text-stone-800">Sparks AI</h1>
            <p className="text-xs text-stone-400 mt-1">
              Signed in as {session?.user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-xs text-stone-400 hover:text-stone-700 underline underline-offset-2"
          >
            Sign out
          </button>
        </header>

        {loading && (
          <p className="text-stone-400 text-sm">Loading your inbox…</p>
        )}
        {analyzing && (
          <p className="text-stone-400 text-sm">
            Checking for anything that needs your attention…
          </p>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {messages && messages.length === 0 && (
          <p className="text-stone-400 text-sm">Your inbox is empty.</p>
        )}

        {messages && messages.length > 0 && (
          <ul className="divide-y divide-stone-200 border-t border-b border-stone-200">
            {messages.map((m) => {
              const flag = riskFlags[m.id];
              return (
                <li key={m.id} className="py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm font-medium text-stone-800 truncate flex items-center gap-2">
                      {flag && flag.risk !== "low" && (
                        <span
                          className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                            flag.risk === "high" ? "bg-red-500" : "bg-amber-500"
                          }`}
                          title={flag.reason}
                        />
                      )}
                      {m.subject}
                    </p>
                    <p className="text-xs text-stone-400 shrink-0 whitespace-nowrap">
                      {m.date}
                    </p>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 truncate">
                    {m.from}
                  </p>
                  <p className="text-sm text-stone-600 mt-2 line-clamp-2">
                    {m.snippet}
                  </p>
                  {flag && flag.risk !== "low" && (
                    <p
                      className={`text-xs mt-2 ${
                        flag.risk === "high" ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {flag.reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {children}
    </div>
  );
}
