import { scenarios } from "@choicemirror/contracts";

export async function GET() {
  return Response.json(scenarios);
}
