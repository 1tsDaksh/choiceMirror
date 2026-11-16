"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Element-binding fixture for the observation/execution safety invariant:
 * a hidden control with the same label as visible ones sits FIRST in DOM
 * order, so any index computed over an unfiltered population shifts onto
 * the wrong node. Each control increments only its own counter, rendered
 * into page text, so a test can prove exactly which control was activated.
 */
export default function ElementBindingPage() {
  const [first, setFirst] = useState(0);
  const [second, setSecond] = useState(0);
  const [hidden, setHidden] = useState(0);
  const [labelled, setLabelled] = useState(0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="rounded-lg text-sm text-secondary-text hover:text-highlight"
        >
          ← All fixtures
        </Link>
        <span className="rounded-full border border-white/10 bg-elevated px-3 py-1 text-xs font-medium text-secondary-text">
          Synthetic local state
        </span>
      </div>

      <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-journey-b">
          safety · element binding
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          Element binding check
        </h1>
        <p className="mt-3 text-secondary-text">
          Every control records its own activations. The hidden control below
          shares the visible label on purpose.
        </p>
      </section>

      <section
        aria-live="polite"
        className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6"
      >
        <div className="space-y-5">
          <p className="font-mono text-sm text-primary-text">
            first={first} second={second} hidden={hidden} labelled={labelled}
          </p>

          {/* Hidden duplicate: first in DOM order, never visible. */}
          <button
            type="button"
            style={{ display: "none" }}
            onClick={() => setHidden(hidden + 1)}
          >
            Continue
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setFirst(first + 1)}
              className="min-h-11 rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setSecond(second + 1)}
              className="min-h-11 rounded-xl border border-white/15 px-5 font-semibold text-primary-text hover:border-highlight hover:text-highlight"
            >
              Continue
            </button>
          </div>

          {/* Accessible name differs from the visible text. */}
          <button
            type="button"
            aria-label="Save the current draft"
            onClick={() => setLabelled(labelled + 1)}
            className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-medium text-secondary-text hover:border-highlight hover:text-highlight"
          >
            <span>  Save   draft  </span>
          </button>
        </div>
      </section>
    </div>
  );
}
