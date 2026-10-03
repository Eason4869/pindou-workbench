import { test } from "node:test";
import assert from "node:assert/strict";
const mod = await import("../src/palettes.js").catch(() => ({}));
test("MARD basic contains the exact 221 base-series codes", () => {
  assert.equal(typeof mod.getPalette, "function", "palette API is missing");
  const p = mod.getPalette("mard-basic");
  assert.equal(p.colors.length, 221);
  assert.ok(p.colors.every((c) => /^[A-HM]\d+$/.test(c.code)));
});
test("MARD full validates all 291 unique colors", () => {
  assert.equal(
    typeof mod.validatePalette,
    "function",
    "validation API is missing",
  );
  const p = mod.getPalette("mard-full");
  assert.equal(p.colors.length, 291);
  assert.equal(new Set(p.colors.map((c) => c.code)).size, 291);
  assert.doesNotThrow(() => mod.validatePalette(p));
});
test("palette validation rejects duplicate codes and invalid RGB", () => {
  assert.equal(
    typeof mod.validatePalette,
    "function",
    "validation API is missing",
  );
  const p = mod.getPalette("mard-basic");
  assert.throws(
    () => mod.validatePalette({ ...p, colors: [p.colors[0], p.colors[0]] }),
    /重复/,
  );
  assert.throws(
    () =>
      mod.validatePalette({
        ...p,
        colors: [{ ...p.colors[0], rgb: [-1, 0, 0] }],
      }),
    /RGB/,
  );
  assert.throws(() => mod.getPalette("unknown"), /色卡/);
});
