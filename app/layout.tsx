import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

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
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
