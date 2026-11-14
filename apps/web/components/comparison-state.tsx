import type { ReactNode } from "react";

type ComparisonStateProps = {
  kind: "loading" | "error" | "empty";
  title: string;
  description: string;
  action?: ReactNode;
  /** Heading level: 1 for standalone pages, 2 when embedded under a page h1. */
  level?: 1 | 2;
};

const stateLabels: Record<ComparisonStateProps["kind"], string> = {
  loading: "Loading",
  error: "Error",
  empty: "No data",
};

const stateStyles: Record<ComparisonStateProps["kind"], string> = {
  loading: "border-highlight/40 bg-highlight/5",
  error: "border-error/40 bg-error/5",
  empty: "border-warning/40 bg-warning/5",
};

const stateText: Record<ComparisonStateProps["kind"], string> = {
  loading: "text-highlight",
  error: "text-error",
  empty: "text-warning",
};

export function ComparisonState({
  kind,
  title,
  description,
  action,
  level = 1,
}: ComparisonStateProps) {
  const Heading = level === 2 ? "h2" : "h1";

  return (
    <section
      className={`mx-auto max-w-xl rounded-2xl border p-6 text-center ${stateStyles[kind]}`}
      aria-labelledby={`comparison-${kind}-title`}
    >
      <p className={`font-mono text-sm font-semibold ${stateText[kind]}`}>
        {stateLabels[kind]}
      </p>
      <Heading
        id={`comparison-${kind}-title`}
        className="mt-2 text-2xl font-bold"
      >
        {title}
      </Heading>
      <p className="mt-3 text-secondary-text">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}
