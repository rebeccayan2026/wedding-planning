import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

/**
 * Fraunces — a soft serif with optical-size, softness and "wonk" axes, drawn
 * to look drawn rather than specified. Headings only.
 *
 * next/font downloads and self-hosts this at build time, so unlike the
 * `@import` from fonts.googleapis.com this replaces, it actually loads for
 * readers in mainland China.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "Sparks AI — Wedding Planner Assistant",
  description: "An AI assistant for wedding planners, built on your inbox.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={display.variable}>
      {/* Paper rather than screen-white: warm enough to notice next to the
          cards, not so warm it turns into cream. */}
      <body className="bg-[#FCFCFA] text-stone-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
