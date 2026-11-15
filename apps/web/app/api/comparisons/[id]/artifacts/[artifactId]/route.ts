import { artifactIdSchema, parseComparisonId } from "@choicemirror/contracts";

import { getStore } from "../../../../../../lib/comparison-store";

type RouteContext = {
  params: Promise<{ id: string; artifactId: string }>;
};

function notFound(): Response {
  return Response.json({ error: "Artifact not found." }, { status: 404 });
}

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { id, artifactId } = await params;

  // Validate both segments before any path construction: traversal strings
  // must land on 404, never on the filesystem.
  const comparisonId = parseComparisonId(id);
  if (!comparisonId || !artifactIdSchema.safeParse(artifactId).success) {
    return notFound();
  }

  const bytes = await getStore().getScreenshot(comparisonId, artifactId);
  if (!bytes) {
    return notFound();
  }

  // Copy into an ArrayBuffer-backed view: the response body must satisfy
  // BufferSource, and the stored bytes may share a pooled buffer.
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=300",
    },
  });
}
