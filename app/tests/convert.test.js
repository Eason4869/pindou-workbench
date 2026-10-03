import { test } from "node:test";
import assert from "node:assert/strict";
const dim = await import("../src/core/dimensions.js").catch(() => ({}));
const conv = await import("../src/core/convert.js").catch(() => ({}));
const color = await import("../src/core/color.js").catch(() => ({}));
const settings = {
  imageMode: "pixel",
  sizeMode: "auto",
  width: 29,
  height: 29,
  keepAspect: true,
  maxColors: 24,
  pitchMm: null,
};
const palette = {
  id: "test",
  brand: "Test",
  version: "1",
  source: "test",
  colors: [
    { code: "W", name: "白", hex: "#FFFFFF", rgb: [255, 255, 255] },
    { code: "K", name: "黑", hex: "#000000", rgb: [0, 0, 0] },
    { code: "R", name: "红", hex: "#FF0000", rgb: [255, 0, 0] },
    { code: "G", name: "绿", hex: "#00FF00", rgb: [0, 255, 0] },
  ],
};
function image(w, h, pixels) {
  return { width: w, height: h, data: new Uint8ClampedArray(pixels) };
}
function convert(im, opts = {}) {
  assert.equal(typeof conv.convertRgba, "function", "convert API missing");
  return conv.convertRgba(im, { ...settings, ...opts }, palette);
}
test("auto dimensions preserve small pixel art and scale photos", () => {
  assert.equal(
    typeof dim.resolveDimensions,
    "function",
    "dimensions API missing",
  );
  assert.deepEqual(dim.resolveDimensions({ width: 17, height: 13 }, settings), {
    width: 17,
    height: 13,
  });
  assert.deepEqual(
    dim.resolveDimensions(
      { width: 1000, height: 500 },
      { ...settings, imageMode: "photo" },
    ),
    { width: 64, height: 32 },
  );
  assert.deepEqual(
    dim.resolveDimensions({ width: 8000, height: 1 }, settings),
    { width: 64, height: 1 },
  );
});
test("custom dimensions reject empty decimals and out of range values", () => {
  assert.equal(
    typeof dim.resolveDimensions,
    "function",
    "dimensions API missing",
  );
  for (const width of ["", 0, 201, 1.5, NaN])
    assert.throws(
      () =>
        dim.resolveDimensions(
          { width: 1, height: 1 },
          { ...settings, sizeMode: "custom", width, height: 5 },
        ),
      /尺寸/,
    );
});
test("transparent cells never contribute beads and alpha threshold is exact", () => {
  const p = convert(
    image(
      2,
      2,
      [0, 0, 0, 255, 255, 0, 0, 255, 255, 255, 255, 255, 0, 255, 0, 0],
    ),
  );
  assert.deepEqual(p.cells, ["K", "R", "W", null]);
  assert.equal(p.total, 3);
  const t = convert(image(2, 1, [255, 255, 255, 127, 255, 255, 255, 128]));
  assert.deepEqual(t.cells, [null, "W"]);
  assert.equal(t.total, 1);
});
test("all transparent 1x1 is a valid zero-bead pattern", () => {
  const p = convert(image(1, 1, [0, 0, 0, 0]));
  assert.equal(p.total, 0);
  assert.deepEqual(p.counts, []);
});
test("aspect fit pads evenly while stretch fills the canvas", () => {
  const im = image(2, 1, [0, 0, 0, 255, 0, 0, 0, 255]);
  assert.equal(
    convert(im, { sizeMode: "custom", width: 4, height: 4 }).total,
    8,
  );
  assert.equal(
    convert(im, { sizeMode: "custom", width: 4, height: 4, keepAspect: false })
      .total,
    16,
  );
});
test("photo sampling averages source pixels instead of picking a corner", () => {
  const p = convert(image(2, 1, [0, 0, 0, 255, 255, 255, 255, 255]), {
    imageMode: "photo",
    sizeMode: "custom",
    width: 1,
    height: 1,
  });
  assert.equal(p.total, 1);
  assert.equal(p.cells.length, 1);
});
test("Lab values place white and black near their standard lightness", () => {
  assert.equal(typeof color.rgbToLab, "function", "Lab API missing");
  assert.ok(Math.abs(color.rgbToLab([255, 255, 255])[0] - 100) < 0.01);
  assert.equal(color.rgbToLab([0, 0, 0])[0], 0);
});
test("color limit and counts describe exactly the final grid", () => {
  const pixels = Array.from({ length: 40000 }, (_, i) => [
    i % 256,
    (i * 5) % 256,
    (i * 19) % 256,
    255,
  ]).flat();
  const im = image(200, 200, pixels);
  for (const maxColors of [0, 1, 2, 3]) {
    const p = convert(im, { maxColors });
    assert.equal(p.total, 40000);
    assert.equal(p.cells.length, 40000);
    assert.equal(
      p.counts.reduce((s, c) => s + c.count, 0),
      40000,
    );
    if (maxColors) assert.ok(p.counts.length <= maxColors);
    assert.ok(p.cells.every((c) => palette.colors.some((v) => v.code === c)));
  }
});
test("conversion is deterministic and rejects damaged pixel buffers", () => {
  const im = image(2, 1, [0, 0, 0, 255, 255, 0, 0, 255]);
  assert.deepEqual(convert(im), convert(im));
  assert.throws(() => convert(image(2, 1, [0, 0, 0, 255])), /像素/);
});
