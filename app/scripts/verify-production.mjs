import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { BRAND } from "../src/brand.js";

// Validate the built files over HTTP, without Vite or a development server.
const app = fileURLToPath(new URL("../", import.meta.url));
const root = resolve(app, "dist-web");
const output = resolve(app, "../tmp/production-verification");
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile(resolve(app, "dist/manifest.json")));
const pkg = JSON.parse(await readFile(resolve(app, "package.json")));
assert.equal(manifest.version, pkg.version);
assert.equal(manifest.sdkVersion, pkg.dependencies["@heybox/hb-sdk"]);
assert.equal(manifest.category, "tool");
assert.deepEqual(manifest.permissions, { filesystem: { enabled: true } });
assert.equal(pkg.author, "彧晟Eason");
assert.equal(pkg.homepage, "https://github.com/Eason4869/pindou-workbench");
for (const name of [manifest.icon, ...manifest.coverImages])
  assert.ok((await readFile(resolve(app, "dist", name))).length > 0);
for (const [name, width, height] of [[manifest.icon,200,200],[manifest.coverImages[0],510,272]]) {
  const png = await readFile(resolve(app, "dist", name));
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname === "/favicon.ico") { res.writeHead(204).end(); return; }
    if (pathname.startsWith("/pindou/")) pathname = pathname.slice(7);
    const file = resolve(root, `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: "msedge" });
  for (const [name, pathname] of [["root", "/"], ["subdirectory", "/pindou/"]]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("requestfailed", (r) => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    page.on("response", (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(origin + "/") || /^(blob:|data:)/.test(url)) return route.continue();
      errors.push(`Unexpected external resource: ${url}`);
      return route.abort();
    });
    await page.goto(origin + pathname);
    assert.equal(await page.locator("h1").textContent(), BRAND.name);
    assert.equal(await page.locator("#app-version").textContent(), `v${BRAND.version}`);
    assert.equal(await page.locator("#app-author").textContent(), "作者：彧晟Eason");
    assert.equal(await page.locator("#repository-link").getAttribute("href"), BRAND.repository);
    await page.locator(".about summary").click();
    assert.ok(await page.locator("#repository-link").isVisible());
    await page.waitForFunction(() => document.getElementById("total")?.textContent === "208");
    const fixture = await page.evaluate(() => {
      const c = document.createElement("canvas"); c.width = 2; c.height = 2;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(1, 0, 1, 1);
      ctx.fillStyle = "#FF0000"; ctx.fillRect(0, 1, 1, 1);
      return c.toDataURL("image/png").split(",")[1];
    });
    await page.locator('input[type="file"]').setInputFiles({
      name: "发布验证.png", mimeType: "image/png", buffer: Buffer.from(fixture, "base64"),
    });
    await page.locator("#generate").click();
    await page.waitForFunction(() => document.getElementById("total")?.textContent === "3");
    assert.equal(await page.locator("#result-size").textContent(), "2 × 2");
    for (const format of ["png", "csv", "pdf"]) {
      const event = page.waitForEvent("download", { timeout: 60000 });
      await page.locator(`#export-${format}`).click();
      const download = await event;
      assert.equal(await download.failure(), null);
      const filename = resolve(output, `${name}.${format}`);
      await download.saveAs(filename);
      const bytes = await readFile(filename);
      if (format === "pdf") {
        assert.ok(bytes.length < 8 * 1024 * 1024);
        assert.equal((await PDFDocument.load(bytes)).getPageCount(), 3);
      } else if (format === "png") {
        const dimensions = await page.evaluate(async (base64) => {
          const img = new Image(); img.src = "data:image/png;base64," + base64;
          await img.decode(); return [img.naturalWidth, img.naturalHeight];
        }, bytes.toString("base64"));
        assert.ok(dimensions[0] > 2 && dimensions[1] > 2);
      } else {
        assert.ok(bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])));
        const csv = bytes.toString("utf8");
        assert.match(csv, /MARD/);
        assert.equal(csv.split(/\r?\n/).filter((row) => /^MARD,/.test(row))
          .reduce((sum, row) => sum + Number(row.split(",").at(-1)), 0), 3);
      }
    }
    await page.screenshot({ path: resolve(output, `${name}.png.screen.png`), fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${name}: built app imports transparent PNG and downloads PNG/CSV/PDF; no external resources or errors`);
  }
  console.log(`Manifest ${manifest.version}, SDK ${manifest.sdkVersion}, category and filesystem permission verified.`);
  await writeFile(resolve(output, "result.json"), JSON.stringify({
    version: manifest.version, sdkVersion: manifest.sdkVersion,
    paths: ["/", "/pindou/"], formats: ["png", "csv", "pdf"], externalResources: 0, errors: 0,
  }, null, 2) + "\n");
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
