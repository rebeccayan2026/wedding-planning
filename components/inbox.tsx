"use client";

import { signIn } from "next-auth/react";
import type { GmailMessageSummary } from "@/lib/gmail";
import type { Insight } from "@/lib/ai";
import { senderName, relativeTime, exactTime, gmailUrl } from "@/lib/format";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
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
      ? "bg-clay-50 text-clay-700 ring-clay-100"
      : "bg-ochre-50 text-ochre-700 ring-ochre-100";

  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

/**
 * `urgent` items get card chrome; `soon` items stay flat. Colour alone was
 * doing all the work of separating the two, which read as one long list.
 *
 * The action itself stays on the system stack rather than the display face:
 * it is written in the language of the message, so a Latin serif would apply
 * to the English cards and silently fall back on the Chinese ones.
 */
export function AttentionCard({
  message,
  insight,
  tone,
  account,
}: {
  message: GmailMessageSummary;
  insight: Insight;
  tone: "urgent" | "soon";
  account?: string | null;
}) {
  const urgent = tone === "urgent";

  return (
    <li>
      <a
        href={gmailUrl(account, message.threadId)}
        target="_blank"
        rel="noopener noreferrer"
        className={
          urgent
            ? "block rounded-lg border border-stone-200/80 bg-white p-3.5 shadow-card transition-colors hover:border-sage-200 hover:bg-sage-50/30 sm:p-4"
            : "block rounded-md px-2 py-3 transition-colors hover:bg-sage-50/40"
        }
      >
        <div className="flex items-center gap-2">
          <UrgencyChip insight={insight} />
          <span className="min-w-0 truncate text-[13px] text-stone-500">
            {senderName(message.from)}
          </span>
          <time
            className="ml-auto shrink-0 text-xs text-stone-500"
            title={exactTime(message.date)}
          >
            {relativeTime(message.date)}
          </time>
        </div>

        {/* The action leads, not the subject — the point is what to do next. */}
        <p
          className={
            urgent
              ? "mt-2 text-[17px] font-semibold leading-snug tracking-[-0.011em] text-stone-900"
              : "mt-2 text-[15px] font-medium leading-snug text-stone-900"
          }
        >
          {insight.action || message.subject}
        </p>

        {insight.action && (
          <p className="mt-1 truncate text-xs text-stone-500">
            {message.subject}
          </p>
        )}
      </a>
    </li>
  );
}

export function CompactRow({
  message,
  account,
}: {
  message: GmailMessageSummary;
  account?: string | null;
}) {
  return (
    <li>
      <a
        href={gmailUrl(account, message.threadId)}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-md px-2 py-2.5 transition-colors hover:bg-sage-50/40"
      >
        <div className="flex items-baseline gap-3">
          {/* Sender gets its own column on wide screens; on phones it drops to
              a second line so the subject keeps the full width. */}
          <span className="hidden w-40 shrink-0 truncate text-[13px] text-stone-500 sm:block">
            {senderName(message.from)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-stone-800">
            {message.subject}
          </span>
          <time
            className="shrink-0 text-xs text-stone-500"
            title={exactTime(message.date)}
          >
            {relativeTime(message.date)}
          </time>
        </div>
        <p className="mt-0.5 truncate text-xs text-stone-500 sm:hidden">
          {senderName(message.from)}
        </p>
      </a>
    </li>
  );
}

export function InboxSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-52 rounded bg-stone-100" />
      <div className="mt-2 h-3.5 w-32 rounded bg-stone-100" />
      <div className="mt-6 space-y-2.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-stone-200/80 bg-white p-4 shadow-card"
          >
            <div className="h-3 w-32 rounded bg-stone-100" />
            <div className="mt-3 h-4 w-3/4 rounded bg-stone-100" />
            <div className="mt-2 h-3 w-1/2 rounded bg-stone-100" />
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
          className="rounded-lg border border-stone-200/80 bg-white p-4 shadow-card"
        >
          <div className="h-3 w-28 rounded bg-stone-100" />
          <div className="mt-3 h-4 w-2/3 rounded bg-stone-100" />
        </div>
      ))}
    </div>
  );
}

/** Shown when the triage ran and genuinely found nothing — the count matters,
 *  otherwise this is indistinguishable from the analysis never having run. */
export function AllClear({ checked }: { checked: number }) {
  return (
    <div className="mt-6 rounded-lg border border-sage-100 bg-sage-50/60 px-4 py-9 text-center">
      <p className="font-display text-lg text-sage-700">
        Nothing needs you today.
      </p>
      <p className="mt-1.5 text-xs text-stone-500">
        Checked {checked} message{checked === 1 ? "" : "s"}.
      </p>
    </div>
  );
}

export function SignInPrompt({ body, cta }: { body: string; cta: string }) {
  return (
    <Centered>
      <div className="w-full max-w-sm px-6 text-center">
        <h1 className="font-display text-2xl text-stone-900">Sparks AI</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-stone-500">
          {body}
        </p>
        <button
          onClick={() => signIn("google")}
          className="mt-7 w-full rounded-lg bg-sage-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sage-700/90"
        >
          {cta}
        </button>
      </div>
    </Centered>
  );
}

export function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {children}
    </div>
  );
}
