type MetricCardProps = {
  label: string;
  value: string;
  unit?: string;
  definition: string;
  /** True when the metric is unobservable — value shows an em dash, never a fake zero. */
  unavailable?: boolean;
};

export function MetricCard({
  label,
  value,
  unit,
  definition,
  unavailable = false,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4">
      <p className="font-mono text-xs uppercase tracking-widest text-secondary-text">
        {label}
      </p>
      <p className="mt-2 font-mono text-[32px] font-semibold leading-none tabular-nums text-primary-text">
        {value}
      </p>
      {unavailable ? (
        <p className="mt-1 text-xs font-medium text-warning">Not available</p>
      ) : null}
      {unit ? (
        <p className="mt-1 text-xs text-secondary-text">{unit}</p>
      ) : null}
      <p className="mt-2 text-xs text-secondary-text">{definition}</p>
    </div>
  );
}
