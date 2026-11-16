import { describe, expect, it } from "vitest";
import { OBSERVATION_LIMITS, pageObservationSchema } from "@choicemirror/contracts";

import { BlockedError } from "./errors";
import { buildObservation, type RawPageState } from "./observation";

const ORIGIN = "http://localhost:3001";

function rawState(overrides: Partial<RawPageState> = {}): RawPageState {
  return {
    url: `${ORIGIN}/start`,
    title: "Start",
    headings: ["Start"],
    text: "Welcome to the benchmark.",
    elements: [
      { role: "button", name: "Finish the flow", enabled: true, occurrence: 0 },
      { role: "link", name: "Leave", enabled: true, occurrence: 0 },
    ],
    ...overrides,
  };
}

describe("buildObservation", () => {
  it("passes through state and assigns stable ids in array order", () => {
    const observation = buildObservation(rawState(), ORIGIN, "obs-7");

    expect(observation.ref).toBe("obs-7");
    expect(observation.url).toBe(`${ORIGIN}/start`);
    expect(observation.title).toBe("Start");
    expect(observation.headings).toEqual(["Start"]);
    expect(observation.text).toContain("Welcome");
    expect(observation.elements.map((element) => element.id)).toEqual([
      "element-0",
      "element-1",
    ]);
    expect(observation.elements[0]).toEqual({
      id: "element-0",
      role: "button",
      name: "Finish the flow",
      enabled: true,
    });
  });

  it("throws BlockedError when the page url leaves the allowed origin", () => {
    expect(() =>
      buildObservation(
        rawState({ url: "https://evil.example/x" }),
        ORIGIN,
        "obs-1",
      ),
    ).toThrow(BlockedError);
  });

  it("throws BlockedError on port mismatch", () => {
    expect(() =>
      buildObservation(
        rawState({ url: "http://localhost:3002/start" }),
        ORIGIN,
        "obs-1",
      ),
    ).toThrow(BlockedError);
    expect(() =>
      buildObservation(
        rawState({ url: "http://localhost:3002/start" }),
        ORIGIN,
        "obs-1",
      ),
    ).toThrow("Observation left the allowed origin.");
  });

  it("redacts emails and long digit runs in text, titles, and element names", () => {
    const observation = buildObservation(
      rawState({
        title: "Contact ada@example.com",
        text: "Card 4111111111111111 was used.",
        elements: [
          {
            role: "button",
            name: "Mail ada@example.com about 4111111111111111",
            enabled: true,
            occurrence: 0,
          },
        ],
      }),
      ORIGIN,
      "obs-1",
    );

    expect(observation.title).toBe("Contact [redacted-email]");
    expect(observation.text).toBe("Card [redacted-digits] was used.");
    expect(observation.elements[0]?.name).toBe(
      "Mail [redacted-email] about [redacted-digits]",
    );
    expect(JSON.stringify(observation)).not.toContain("ada@example.com");
    expect(JSON.stringify(observation)).not.toContain("4111111111111111");
  });

  it("drops empty-name elements before id assignment and caps element count", () => {
    const elements = [
      { role: "button" as const, name: "", enabled: true, occurrence: 0 },
      { role: "button" as const, name: "  ", enabled: true, occurrence: 0 },
    ];
    for (let index = 0; index < 45; index += 1) {
      elements.push({
        role: "button",
        name: `Action ${index}`,
        enabled: true,
        occurrence: 0,
      });
    }

    const observation = buildObservation(
      rawState({ elements }),
      ORIGIN,
      "obs-1",
    );

    expect(observation.elements).toHaveLength(OBSERVATION_LIMITS.MAX_ELEMENTS);
    // Ids reference only elements that survived: no gaps, no dropped names.
    expect(observation.elements[0]?.name).toBe("Action 0");
    expect(observation.elements.every((element) => element.name.length > 0)).toBe(
      true,
    );
    expect(observation.elements.map((element) => element.id)).toEqual(
      observation.elements.map((_element, index) => `element-${index}`),
    );
  });

  it("bounds text and heading sizes", () => {
    const observation = buildObservation(
      rawState({
        text: "x".repeat(4_000),
        headings: Array.from(
          { length: 30 },
          (_value, index) => `Heading ${index} ${"y".repeat(300)}`,
        ),
        title: "t".repeat(400),
      }),
      ORIGIN,
      "obs-1",
    );

    expect(observation.text).toHaveLength(OBSERVATION_LIMITS.MAX_TEXT_CHARS);
    expect(observation.headings).toHaveLength(OBSERVATION_LIMITS.MAX_HEADINGS);
    expect(
      observation.headings.every(
        (heading) => heading.length <= OBSERVATION_LIMITS.MAX_NAME_CHARS,
      ),
    ).toBe(true);
    expect(observation.title).toHaveLength(OBSERVATION_LIMITS.MAX_TITLE_CHARS);
  });

  it("agrees with the shared schema on a maximal sample", () => {
    const elements = Array.from({ length: 50 }, (_value, index) => ({
      role: "link" as const,
      name: `Link ${index} ${"n".repeat(250)} contact me@example.com`,
      enabled: index % 2 === 0,
      occurrence: 0,
    }));

    const observation = buildObservation(
      rawState({
        text: `Start now ${"z".repeat(4_000)} pay 4111111111111111`,
        headings: Array.from(
          { length: 25 },
          (_value, index) => `H${index} ${"w".repeat(250)}`,
        ),
        title: `Title ${"q".repeat(300)}`,
        elements,
      }),
      ORIGIN,
      "obs-max",
    );

    expect(() => pageObservationSchema.parse(observation)).not.toThrow();
    expect(pageObservationSchema.parse(observation)).toEqual(observation);
  });
});
