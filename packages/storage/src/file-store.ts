import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  artifactIdSchema,
  comparisonIdSchema,
  comparisonRecordSchema,
  journeyIdSchema,
  journeyRecordSchema,
  type ComparisonRecord,
  type JourneyRecord,
} from "@choicemirror/contracts";

export type ComparisonStore = {
  saveComparison(record: ComparisonRecord): Promise<void>;
  getComparison(id: string): Promise<ComparisonRecord | null>;
  saveJourney(journey: JourneyRecord): Promise<void>;
  getJourneys(comparisonId: string): Promise<JourneyRecord[]>;
  saveScreenshot(
    comparisonId: string,
    artifactId: string,
    bytes: Uint8Array,
  ): Promise<void>;
  getScreenshot(
    comparisonId: string,
    artifactId: string,
  ): Promise<Uint8Array | null>;
};

function assertComparisonId(id: string): void {
  if (!comparisonIdSchema.safeParse(id).success) {
    throw new Error("Invalid storage id");
  }
}

function assertJourneyId(comparisonId: string, journeyId: string): void {
  if (
    !comparisonIdSchema.safeParse(comparisonId).success ||
    !journeyIdSchema.safeParse(journeyId).success ||
    !journeyId.startsWith(`${comparisonId}-`)
  ) {
    throw new Error("Invalid storage id");
  }
}

function assertArtifactId(comparisonId: string, artifactId: string): void {
  if (
    !comparisonIdSchema.safeParse(comparisonId).success ||
    !artifactIdSchema.safeParse(artifactId).success
  ) {
    throw new Error("Invalid storage id");
  }
}

async function readJsonOr<T>(
  filePath: string,
  parse: (value: unknown) => T | null,
): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return parse(JSON.parse(raw) as unknown);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }
    // Corrupt or unreadable records are treated as missing; log the id only.
    console.warn(`Ignoring unreadable storage file at ${filePath}`);
    return null;
  }
}

export function createFileStore(rootDir: string): ComparisonStore {
  const comparisonDir = (comparisonId: string): string =>
    path.join(rootDir, "comparisons", comparisonId);

  return {
    async saveComparison(record) {
      assertComparisonId(record.id);
      const parsed = comparisonRecordSchema.parse(record);
      const dir = comparisonDir(parsed.id);
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "record.json"),
        JSON.stringify(parsed, null, 2),
        "utf8",
      );
    },

    async getComparison(id) {
      assertComparisonId(id);
      return readJsonOr(path.join(comparisonDir(id), "record.json"), (value) => {
        const parsed = comparisonRecordSchema.safeParse(value);
        if (!parsed.success) {
          console.warn(`Ignoring corrupt comparison record for ${id}`);
          return null;
        }
        return parsed.data;
      });
    },

    async saveJourney(journey) {
      assertJourneyId(journey.comparisonId, journey.id);
      const parsed = journeyRecordSchema.parse(journey);
      const dir = path.join(comparisonDir(parsed.comparisonId), "journeys");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, `${parsed.id}.json`),
        JSON.stringify(parsed, null, 2),
        "utf8",
      );
    },

    async getJourneys(comparisonId) {
      assertComparisonId(comparisonId);
      const dir = path.join(comparisonDir(comparisonId), "journeys");

      let files: string[];
      try {
        files = await readdir(dir);
      } catch {
        return [];
      }

      const journeys: JourneyRecord[] = [];
      for (const file of files.sort()) {
        if (!file.endsWith(".json")) {
          continue;
        }
        const journey = await readJsonOr(path.join(dir, file), (value) => {
          const parsed = journeyRecordSchema.safeParse(value);
          if (!parsed.success || parsed.data.comparisonId !== comparisonId) {
            console.warn(`Ignoring unreadable journey file ${file}`);
            return null;
          }
          return parsed.data;
        });
        if (journey) {
          journeys.push(journey);
        }
      }
      return journeys;
    },

    async saveScreenshot(comparisonId, artifactId, bytes) {
      assertArtifactId(comparisonId, artifactId);
      const dir = path.join(comparisonDir(comparisonId), "artifacts");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, artifactId), bytes);
    },

    async getScreenshot(comparisonId, artifactId) {
      assertArtifactId(comparisonId, artifactId);
      try {
        return await readFile(
          path.join(comparisonDir(comparisonId), "artifacts", artifactId),
        );
      } catch {
        return null;
      }
    },
  };
}
