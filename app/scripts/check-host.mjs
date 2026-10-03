import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge" }),
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type()))
    console.log("Console:", m.text());
});
page.on("requestfailed", (r) =>
  console.log(
    "Failed resource:",
    new URL(r.url()).pathname,
    r.failure()?.errorText,
  ),
);
await page.addInitScript(() => {
  const Original = window.Worker;
  window.Worker = class extends Original {
    constructor(...args) {
      super(...args);
      this.addEventListener("error", (e) =>
        console.error("Worker failure:", e.message),
      );
    }
  };
});
await page.goto(
  "http://127.0.0.1:5175/?mini_url=http%3A%2F%2F127.0.0.1%3A5174%2F",
);
let frame;
for (let i = 0; i < 40; i++) {
  frame = page
    .frames()
    .find((f) => f.url().startsWith("http://127.0.0.1:5174/"));
  if (frame && (await frame.locator("#total").count())) break;
  await page.waitForTimeout(250);
}
if (!frame) throw new Error("SDK Host did not load app frame");
try {
  await frame.waitForFunction(
    () => document.getElementById("total")?.textContent === "208",
    {},
    { timeout: 10000 },
  );
} catch (error) {
  console.log(
    "Host app status:",
    await frame.locator("body").innerText(),
    "Errors:",
    JSON.stringify(errors),
  );
  await page.screenshot({
    path: "test-results/visual/official-host-failure.png",
    fullPage: true,
  });
  await browser.close();
  throw error;
}
console.log(
  "Official SDK Host:",
  await frame.locator("#environment").textContent(),
  "Beads:",
  await frame.locator("#total").textContent(),
  "Page errors:",
  JSON.stringify(errors),
);
console.log("Frame visible:", await (await frame.frameElement()).isVisible());
console.log(
  "Iframe sandbox:",
  await (await frame.frameElement()).getAttribute("sandbox"),
);
await frame.locator("#export-pdf").click();
await frame.waitForFunction(
  () =>
    document
      .getElementById("status")
      .textContent.includes("官方开发预览禁止下载"),
  {},
  { timeout: 20000 },
);
console.log("Official Host PDF:", await frame.locator("#status").textContent());
await page.screenshot({
  path: "test-results/visual/official-host.png",
  fullPage: true,
});
await browser.close();
