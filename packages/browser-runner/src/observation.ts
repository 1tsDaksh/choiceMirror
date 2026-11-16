import {
  OBSERVATION_LIMITS,
  type PageObservation,
} from "@choicemirror/contracts";

import { BlockedError } from "./errors";

export type RawElement = {
  role: "button" | "link";
  name: string;
  enabled: boolean;
  occurrence: number;
};

export type RawPageState = {
  url: string;
  title: string;
  headings: string[];
  text: string;
  elements: RawElement[];
};

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const DIGIT_RUN_PATTERN = /\b\d{13,19}\b/g;

/** Removes PII-shaped values before anything reaches the model or evidence. */
function redact(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(DIGIT_RUN_PATTERN, "[redacted-digits]");
}

function bound(value: string, maxChars: number): string {
  return redact(value).slice(0, maxChars);
}

/**
 * Turns raw driver-collected page state into the bounded, origin-checked,
 * redacted observation the model may see. Pure: the origin check happens
 * first so off-origin state is rejected before any of it is processed, and
 * element ids are assigned only over elements that survive filtering so a
 * `targetId` can never reference a dropped element.
 */
export function buildObservation(
  raw: RawPageState,
  origin: string,
  ref: string,
): PageObservation {
  if (new URL(raw.url).origin !== origin) {
    throw new BlockedError("Observation left the allowed origin.");
  }

  const kept = raw.elements
    .filter((element) => element.name.trim().length > 0)
    .slice(0, OBSERVATION_LIMITS.MAX_ELEMENTS);

  return {
    ref,
    url: raw.url,
    title: bound(raw.title, OBSERVATION_LIMITS.MAX_TITLE_CHARS),
    headings: raw.headings
      .slice(0, OBSERVATION_LIMITS.MAX_HEADINGS)
      .map((heading) => bound(heading, OBSERVATION_LIMITS.MAX_NAME_CHARS)),
    text: bound(raw.text, OBSERVATION_LIMITS.MAX_TEXT_CHARS),
    elements: kept.map((element, index) => ({
      id: `element-${index}`,
      role: element.role,
      name: bound(element.name, OBSERVATION_LIMITS.MAX_NAME_CHARS),
      enabled: element.enabled,
    })),
  };
}
