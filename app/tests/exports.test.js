import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { getPalette } from "../src/palettes.js";
const csv = await import("../src/export/csv.js").catch(() => ({}));
const names = await import("../src/export/names.js").catch(() => ({}));
const layout = await import("../src/export/layout.js").catch(() => ({}));
const pdf = await import("../src/export/pdf.js").catch(() => ({}));
export function fixture(w = 35, h = 47, full = false) {
  const palette = getPalette(full ? "mard-full" : "mard-basic");
  const selected = full ? palette.colors : palette.colors.slice(0, 4);
  const cells = Array.from({ length: w * h }, (_, i) =>
      i % 7 === 0 ? null : selected[i % selected.length].code,
    ),
    m = new Map();
  cells.forEach((c) => {
    if (c) m.set(c, (m.get(c) || 0) + 1);
  });
  return {
    width: w,
    height: h,
    cells,
    palette,
    counts: [...m].map(([code, count]) => ({ code, count })),
    total: cells.filter(Boolean).length,
    settings: { pitchMm: null },
  };
}
test("CSV has BOM, complete metadata and exact final counts", () => {
  assert.equal(typeof csv.createCsv, "function", "CSV API missing");
  const p = fixture(2, 2),
    s = csv.createCsv(p);
  assert.ok(s.startsWith("\uFEFF"));
  assert.ok(s.includes("实际数量"));
  for (const c of p.counts) assert.ok(s.includes(`,${c.count}\r\n`));
  const custom = {
    ...p,
    palette: {
      ...p.palette,
      colors: p.palette.colors.map((c) => ({ ...c, name: '逗号,和"引号"' })),
    },
  };
  assert.ok(csv.createCsv(custom).includes('"逗号,和""引号"""'));
});
test("download file names cannot contain paths or reserved Windows names", () => {
  assert.equal(typeof names.safeFilename, "function", "filename API missing");
  assert.ok(!/[\\/:*?"<>|]/.test(names.safeFilename("../图纸:*")));
  assert.notEqual(names.safeFilename("CON"), "CON");
  assert.ok(names.safeFilename("").length);
});
test("tiles cover every cell once including uneven edges", () => {
  assert.equal(typeof layout.planTiles, "function", "layout API missing");
  for (const [w, h] of [
    [1, 1],
    [35, 47],
    [200, 200],
  ]) {
    const seen = new Uint8Array(w * h);
    for (const tile of layout.planTiles(w, h, { columns: 30, rows: 40 }))
      for (
        let y = tile.rowStart - 1;
        y < tile.rowStart - 1 + tile.rowCount;
        y++
      )
        for (
          let x = tile.colStart - 1;
          x < tile.colStart - 1 + tile.colCount;
          x++
        ) {
          assert.ok(x < w && y < h);
          seen[y * w + x]++;
        }
    assert.ok(seen.every((v) => v === 1));
  }
});
test("real PDFs reopen with Chinese font, tiled pages and full legend continuation", async () => {
  assert.equal(typeof pdf.createPdf, "function", "PDF API missing");
  const font = new Uint8Array(
    await readFile(
      new URL("../assets/fonts/NotoSansSC-Regular.deflate", import.meta.url),
    ),
  );
  await mkdir("test-results/pdf", { recursive: true });
  const single = {
    ...fixture(1, 1),
    cells: ["H7"],
    counts: [{ code: "H7", count: 1 }],
    total: 1,
  };
  for (const [name, p] of [
    ["small", single],
    ["tiled", fixture()],
    ["all-colors", fixture(35, 47, true)],
    ["empty", { ...fixture(1, 1), cells: [null], counts: [], total: 0 }],
    ["maximum", fixture(200, 200, true)],
  ]) {
    const bytes = await pdf.createPdf(
      p,
      { title: "测试图纸：独立设计，中文长标题用于验证页面排版与文字显示" },
      font.buffer,
    );
    assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "%PDF");
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 2);
    if (name === "all-colors") assert.ok(doc.getPageCount() > 5);
    if (name === "maximum")
      assert.ok(
        bytes.length <= 8 * 1024 * 1024,
        "native write payload must stay within 8 MiB",
      );
    assert.ok(
      doc.getPages().every((page) => Math.abs(page.getWidth() - 595.28) < 1),
    );
    await writeFile(`test-results/pdf/${name}.pdf`, bytes);
  }
});
