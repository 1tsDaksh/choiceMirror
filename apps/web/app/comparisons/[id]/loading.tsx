import { ComparisonState } from "@/components/comparison-state";

export default function ComparisonLoading() {
  return (
    <ComparisonState
      kind="loading"
      title="Loading comparison"
      description="Retrieving the stored run and its supporting evidence."
    />
  );
}
