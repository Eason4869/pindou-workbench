import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge" }),
  page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
await page.goto("http://127.0.0.1:5173");
await page.locator("#export-pdf").waitFor({ state: "visible" });
await page.waitForFunction(
  () => !document.getElementById("export-pdf").disabled,
);
await mkdir("test-results/visual", { recursive: true });
await page.screenshot({
  path: "test-results/visual/demo-desktop.png",
  fullPage: true,
});
await mkdir("../output/pdf", { recursive: true });
const downloadEvent = page.waitForEvent("download");
await page.locator("#export-pdf").click();
const download = await downloadEvent;
await download.saveAs("../output/pdf/窗边的小花-24x28.pdf");
await page.setViewportSize({ width: 390, height: 844 });
await page.locator("#fit").click();
await page.screenshot({
  path: "test-results/visual/demo-mobile.png",
  fullPage: true,
});
await browser.close();
console.log("Demo screenshots and example PDF saved; brand assets are managed by npm run brand:assets.");
