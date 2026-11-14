import Link from "next/link";

export default function ScenarioNotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-surface p-6 text-center">
      <p className="font-mono text-sm text-warning">Fixture unavailable</p>
      <h1 className="mt-2 text-2xl font-bold">Unknown benchmark scenario</h1>
      <p className="mt-3 text-secondary-text">
        This address does not match a controlled fixture in the catalog.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-highlight px-5 font-semibold text-canvas hover:opacity-90"
      >
        Return to fixtures
      </Link>
    </div>
  );
}
