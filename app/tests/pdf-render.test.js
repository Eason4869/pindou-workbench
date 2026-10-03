import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createPdf } from "../src/export/pdf.js";
import { getPalette } from "../src/palettes.js";
const available = spawnSync("pdftoppm", ["-v"]).error?.code !== "ENOENT";
test(
  "embedded Chinese font is accepted by an independent PDF renderer",
  { skip: !available },
  async () => {
    const font = await readFile(
      new URL("../assets/fonts/NotoSansSC-Regular.deflate", import.meta.url),
    );
    const palette = getPalette("mard-basic"),
      p = {
        width: 1,
        height: 1,
        palette,
        cells: ["H7"],
        counts: [{ code: "H7", count: 1 }],
        total: 1,
        settings: {},
      };
    await mkdir("test-results/pdf-render", { recursive: true });
    await writeFile(
      "test-results/pdf-render/compat.pdf",
      await createPdf(p, { title: "中文兼容性测试" }, font),
    );
    const result = spawnSync(
      "pdftoppm",
      [
        "-scale-to",
        "600",
        "-singlefile",
        "-png",
        "test-results/pdf-render/compat.pdf",
        "test-results/pdf-render/compat",
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0);
    assert.doesNotMatch(
      result.stderr,
      /Embedded font file may be invalid|Couldn't create a font|non-embedded font using identity/,
    );
  },
);
