import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ChoiceMirror controlled benchmark",
    template: "%s | ChoiceMirror benchmark",
  },
  description:
    "Local synthetic fixtures for manually comparing opposing user journeys.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10 bg-surface">
          <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="rounded-lg font-semibold text-primary-text hover:text-highlight"
            >
              ChoiceMirror{" "}
              <span className="font-mono text-xs font-normal text-secondary-text">
                benchmark
              </span>
            </Link>
            <span className="rounded-full border border-journey-a/40 bg-journey-a/10 px-3 py-1 text-xs font-medium text-journey-a">
              Controlled benchmark
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl border-t border-white/10 px-4 py-6 text-sm text-secondary-text sm:px-6">
          Synthetic local data only. No accounts, submissions, or external
          services are used.
        </footer>
      </body>
    </html>
  );
}
