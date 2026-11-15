import path from "node:path";

import { createFileStore, type ComparisonStore } from "@choicemirror/storage";

let store: ComparisonStore | null = null;

export function getStore(): ComparisonStore {
  if (!store) {
    const root =
      process.env.CHOICEMIRROR_DATA_DIR ?? path.join(process.cwd(), "data");
    store = createFileStore(root);
  }

  return store;
}
