import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PDFDocument,
  PDFDict,
  PDFRawStream,
  PDFName,
  decodePDFRawStream,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createPdf } from "../src/export/pdf.js";
import { getPalette } from "../src/palettes.js";
test("every embedded Chinese and numeral glyph retains its actual outline", async () => {
  const fontBytes = await readFile(
      new URL("../assets/fonts/NotoSansSC-Regular.ttf", import.meta.url),
    ),
    original = fontkit.create(fontBytes),
    palette = getPalette("mard-basic");
  const p = {
    width: 1,
    height: 1,
    palette,
    cells: ["H7"],
    counts: [{ code: "H7", count: 1 }],
    total: 1,
    settings: {},
  };
  const compressed = await readFile(
    new URL("../assets/fonts/NotoSansSC-Regular.deflate", import.meta.url),
  );
  const doc = await PDFDocument.load(
    await createPdf(p, { title: "中文兼容性测试：窗边的小花" }, compressed),
  );
  const objects = doc.context.enumerateIndirectObjects().map(([, o]) => o),
    descriptor = objects.find(
      (o) => o instanceof PDFDict && o.has(PDFName.of("FontFile2")),
    );
  assert.ok(descriptor);
  const embedded = fontkit.create(
    decodePDFRawStream(
      descriptor.lookup(PDFName.of("FontFile2"), PDFRawStream),
    ).decode(),
  );
  const cmap = objects
    .filter((o) => o instanceof PDFRawStream)
    .map((o) => new TextDecoder().decode(decodePDFRawStream(o).decode()))
    .find((s) => s.startsWith("/CIDInit"));
  let checked = 0;
  for (const [, id, unicode] of cmap.matchAll(
    /<([\da-f]{4})>\s+<([\da-f]{4})>/gi,
  )) {
    const expected = original.glyphForCodePoint(parseInt(unicode, 16));
    if (expected.path.commands.length === 0) continue;
    assert.equal(
      embedded.getGlyph(parseInt(id, 16)).path.commands.length,
      expected.path.commands.length,
      `missing/corrupt glyph U+${unicode}`,
    );
    checked++;
  }
  assert.ok(checked > 40);
});
