"use client";

import { ComparisonState } from "@/components/comparison-state";

type ComparisonErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ComparisonError({
  error,
  reset,
}: ComparisonErrorProps) {
  return (
    <ComparisonState
      kind="error"
      title="Comparison could not be displayed"
      description={
        error.message ||
        "An unexpected error occurred while retrieving this comparison."
      }
      action={
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90"
        >
          Try again
        </button>
      }
    />
  );
}
