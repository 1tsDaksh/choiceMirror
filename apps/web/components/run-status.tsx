export function RunStatus() {
  return (
    <div
      className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-left"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold text-warning">Automated run unavailable</p>
      <p className="mt-1 text-sm text-secondary-text">
        The browser runner arrives in Phase 2. Explore the selected fixture
        manually now; this shell will not fabricate comparison results.
      </p>
    </div>
  );
}
