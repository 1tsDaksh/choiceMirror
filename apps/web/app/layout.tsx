import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ChoiceMirror",
    template: "%s | ChoiceMirror",
  },
  description:
    "Compare opposing user journeys with inspectable browser evidence.",
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
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="rounded-lg text-lg font-bold text-primary-text hover:text-highlight"
            >
              Choice<span className="text-journey-a">Mirror</span>
            </Link>
            <span className="rounded-full border border-highlight/40 bg-highlight/10 px-3 py-1 text-xs font-medium text-highlight">
              {process.env.PUBLIC_DEMO_ENABLED === "1" ? "Live · controlled demo" : "Evidence-first prototype"}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="mx-auto max-w-7xl border-t border-white/10 px-4 py-6 text-sm text-secondary-text sm:px-6">
          Evidence-first comparisons on controlled synthetic benchmarks. Results
          are not proof of intent, manipulation or regulatory noncompliance.
        </footer>
      </body>
    </html>
  );
}
