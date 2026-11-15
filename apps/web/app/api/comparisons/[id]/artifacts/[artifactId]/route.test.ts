import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const comparisonId = "cmp_ab12cd34ef567890";
const artifactId = `${comparisonId}-join-start.png`;

async function getArtifact(
  id: string,
  requestedArtifactId: string,
): Promise<Response> {
  const { GET } = await import("./route");
  return GET(
    new Request(
      `http://localhost/api/comparisons/${id}/artifacts/${requestedArtifactId}`,
    ),
    {
      params: Promise.resolve({ id, artifactId: requestedArtifactId }),
    },
  );
}

describe("GET /api/comparisons/[id]/artifacts/[artifactId]", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "cm-artifact-"));
    vi.resetModules();
    vi.stubEnv("CHOICEMIRROR_DATA_DIR", root);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it("serves stored screenshot bytes as image/png", async () => {
    const { getStore } = await import("../../../../../../lib/comparison-store");
    const bytes = Uint8Array.from([137, 80, 78, 71, 1, 2, 3, 4]);
    await getStore().saveScreenshot(comparisonId, artifactId, bytes);

    const response = await getArtifact(comparisonId, artifactId);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=300",
    );
    const received = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(received)).toEqual(Array.from(bytes));
  });

  it("returns 404 for an unknown artifact", async () => {
    const response = await getArtifact(comparisonId, artifactId);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Artifact not found." });
  });

  it("returns 404 for a traversal artifact id", async () => {
    const response = await getArtifact(comparisonId, "../../record.json");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Artifact not found." });
  });

  it("returns 404 for an unknown comparison", async () => {
    const response = await getArtifact("cmp_0000000000000000", artifactId);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Artifact not found." });
  });
});
