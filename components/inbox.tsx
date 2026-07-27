"use client";

import { signIn } from "next-auth/react";
import type { GmailMessageSummary } from "@/lib/gmail";
import type { Insight } from "@/lib/ai";
import { senderName, relativeTime, exactTime } from "@/lib/format";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
      {children}
    </h2>
  );
}

/**
 * The urgency signal. Shows the deadline the message actually stated when
 * there is one — a real date is far more actionable than the word "high".
 */
function UrgencyChip({ insight }: { insight: Insight }) {
  const label =
    insight.deadline ?? (insight.risk === "high" ? "Urgent" : "This week");

  const styles =
    insight.risk === "high"
      ? "bg-red-50 text-red-700 ring-red-100"
      : "bg-amber-50 text-amber-800 ring-amber-100";

  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

export function AttentionCard({
  message,
  insight,
}: {
  message: GmailMessageSummary;
  insight: Insight;
}) {
  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-3.5 shadow-card sm:p-4">
      <div className="flex items-center gap-2">
        <UrgencyChip insight={insight} />
        <span className="min-w-0 truncate text-[13px] text-neutral-600">
          {senderName(message.from)}
        </span>
        <time
          className="ml-auto shrink-0 text-xs text-neutral-400"
          title={exactTime(message.date)}
        >
          {relativeTime(message.date)}
        </time>
      </div>

      {/* The action leads, not the subject — the point is what to do next. */}
      <p className="mt-2 text-[15px] font-medium leading-snug text-neutral-900">
        {insight.action || message.subject}
      </p>

      {insight.action && (
        <p className="mt-1 truncate text-xs text-neutral-400">
          {message.subject}
        </p>
      )}
    </li>
  );
}

export function CompactRow({ message }: { message: GmailMessageSummary }) {
  return (
    <li className="py-2.5">
      <div className="flex items-baseline gap-3">
        {/* Sender gets its own column on wide screens; on phones it drops to
            a second line so the subject keeps the full width. */}
        <span className="hidden w-40 shrink-0 truncate text-[13px] text-neutral-500 sm:block">
          {senderName(message.from)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-800">
          {message.subject}
        </span>
        <time
          className="shrink-0 text-xs text-neutral-400"
          title={exactTime(message.date)}
        >
          {relativeTime(message.date)}
        </time>
      </div>
      <p className="mt-0.5 truncate text-xs text-neutral-400 sm:hidden">
        {senderName(message.from)}
      </p>
    </li>
  );
}

export function InboxSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3.5 w-40 rounded bg-neutral-100" />
      <div className="mt-6 space-y-2.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-neutral-200 p-4 shadow-card"
          >
            <div className="h-3 w-32 rounded bg-neutral-100" />
            <div className="mt-3 h-3.5 w-3/4 rounded bg-neutral-100" />
            <div className="mt-2 h-3 w-1/2 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder for the attention section while the model is still deciding,
 *  so the list doesn't visibly reshuffle when the verdicts land. */
export function AttentionSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-2.5">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-neutral-200 p-4 shadow-card"
        >
          <div className="h-3 w-28 rounded bg-neutral-100" />
          <div className="mt-3 h-3.5 w-2/3 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export function SignInPrompt({ body, cta }: { body: string; cta: string }) {
  return (
    <Centered>
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Sparks AI
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">
          {body}
        </p>
        <button
          onClick={() => signIn("google")}
          className="mt-7 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          {cta}
        </button>
      </div>
    </Centered>
  );
}

export function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      {children}
    </div>
  );
}
