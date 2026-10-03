import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, mkdir } from "node:fs/promises";
import sharp from "sharp";
const run = promisify(execFile),
  root = "../tmp/pdfs";
await mkdir(root, { recursive: true });
const cases = ["small", "tiled", "all-colors", "empty", "maximum", "demo"];
for (const name of cases) {
  const source =
    name === "demo"
      ? "../output/pdf/窗边的小花-24x28.pdf"
      : `test-results/pdf/${name}.pdf`;
  const result = await run(
    "pdftoppm",
    ["-scale-to", "1200", "-png", source, `${root}/${name}`],
    { maxBuffer: 1024 * 1024 },
  );
  if (
    /Embedded font file may be invalid|Couldn't create a font|non-embedded font using identity/.test(
      result.stderr,
    )
  )
    throw new Error(`${name}: font rendering failed`);
  const pages = (await readdir(root))
    .filter((file) => new RegExp(`^${name}-\\d+\\.png$`).test(file))
    .sort(
      (a, b) =>
        Number(a.match(/(\d+)\.png$/)[1]) - Number(b.match(/(\d+)\.png$/)[1]),
    );
  for (let start = 0; start < pages.length; start += 9) {
    const selected = pages.slice(start, start + 9),
      height = Math.ceil(selected.length / 3) * 430,
      composite = [];
    for (let i = 0; i < selected.length; i++)
      composite.push({
        input: await sharp(`${root}/${selected[i]}`)
          .resize({ width: 300, height: 424, fit: "contain" })
          .toBuffer(),
        left: (i % 3) * 306,
        top: Math.floor(i / 3) * 430,
      });
    await sharp({
      create: { width: 918, height, channels: 3, background: "#ddd" },
    })
      .composite(composite)
      .png()
      .toFile(`${root}/${name}-contact-${start / 9 + 1}.png`);
  }
  console.log(
    `${name}: ${pages.length} pages rendered; ${Math.ceil(pages.length / 9)} contact sheets`,
  );
}
