import Link from "next/link";

import { ComparisonState } from "@/components/comparison-state";

export default function ComparisonNotFound() {
  return (
    <ComparisonState
      kind="empty"
      title="No stored comparison"
      description="This ID has no stored run. Start a comparison from the scenario launcher to capture evidence."
      action={
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90"
        >
          Return to scenario launcher
        </Link>
      }
    />
  );
}
