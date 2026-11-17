import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * WCAG AA contrast checks for the dashboard's colour pairs. The relative
 * luminance formula lives here deliberately: this is a test-only module and
 * no production code should import it.
 */

const css = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

function token(name: string): string {
  const value = css.match(
    new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})(?:\\s*;|\\s*$)`, "m"),
  )?.[1];
  if (value === undefined) {
    throw new Error(`token --color-${name} not found in globals.css`);
  }
  return value;
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function linearChannel(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return (
    0.2126 * linearChannel(r) +
    0.7152 * linearChannel(g) +
    0.0722 * linearChannel(b)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a >= b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Composites a 15% tint of `foreground` over `background` (WCAG blending). */
function tintOver(
  foreground: string,
  background: string,
  alpha: number,
): string {
  const [fr, fg, fb] = channels(foreground);
  const [br, bg, bb] = channels(background);
  const blend = (above: number, below: number): number =>
    Math.round(alpha * above + (1 - alpha) * below);
  const r = blend(fr, br);
  const g = blend(fg, bg);
  const b = blend(fb, bb);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const BODY_PAIRS: ReadonlyArray<[foreground: string, background: string]> = [
  ["primary-text", "surface"],
  ["primary-text", "canvas"],
  ["secondary-text", "surface"],
  ["secondary-text", "canvas"],
];

const CHIP_TOKENS = ["success", "error", "warning", "highlight"] as const;

const LARGE_ACCENT_PAIRS: ReadonlyArray<
  [foreground: string, background: string]
> = [
  ["journey-a", "surface"],
  ["journey-b", "surface"],
  ["highlight", "canvas"],
];

describe("design token contrast", () => {
  it("design tokens meet WCAG AA for body text pairs", () => {
    for (const [foreground, background] of BODY_PAIRS) {
      const ratio = contrastRatio(token(foreground), token(background));
      expect(
        ratio,
        `${foreground} on ${background} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("tinted badge pairs meet WCAG AA after compositing", () => {
    const surface = token("surface");
    for (const chip of CHIP_TOKENS) {
      const background = tintOver(token(chip), surface, 0.15);
      const ratio = contrastRatio(token(chip), background);
      expect(
        ratio,
        `${chip} on its 15% tint (${background}) is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("journey accent colours meet the 3:1 large-text threshold", () => {
    for (const [foreground, background] of LARGE_ACCENT_PAIRS) {
      const ratio = contrastRatio(token(foreground), token(background));
      expect(
        ratio,
        `${foreground} on ${background} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
