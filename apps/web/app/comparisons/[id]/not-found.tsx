import Link from "next/link";

import { ComparisonState } from "@/components/comparison-state";

export default function ComparisonNotFound() {
  return (
    <ComparisonState
      kind="empty"
      title="No stored comparison"
      description="Phase 1 has not recorded a comparison run. Automated execution and evidence capture arrive with Phase 2."
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
