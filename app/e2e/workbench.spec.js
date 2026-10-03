import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

test("SDK window safe areas protect controls and update without reloading the design", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.route("**/@heybox_hb-sdk.js*", route => route.fulfill({
    contentType: "application/javascript",
    body: `const info={windowWidth:390,windowHeight:844,statusBarHeight:103,screenTop:103,safeArea:{top:103,bottom:810,left:0,right:390}};
      export default {onHandshakeStateChange(cb){cb({status:'ready'});return ()=>{}},environment:{getInfoSync(){return {runtime:{mode:'development'}}}},
      viewport:{async getWindowInfo(){return info}},on(event,cb){if(event==='viewport_change')window.changeViewport=cb;return ()=>{}}};`,
  }));
  await page.goto("/");
  await expect(page.locator("#total")).not.toHaveText("—");
  await page.evaluate(() => {
    const f = document.createElement("iframe");
    f.id = "safe-area-frame";
    f.src = "/";
    f.style.cssText = "width:390px;height:844px;border:0";
    document.body.replaceChildren(f);
  });
  const frame = page.frameLocator("#safe-area-frame");
  const body = frame.locator("body");
  await expect(frame.locator("#total")).not.toHaveText("—");
  await expect.poll(() => body.evaluate(el => getComputedStyle(el).paddingTop)).toBe("103px");
  expect(await body.evaluate(el => getComputedStyle(el).paddingBottom)).toBe("34px");
  expect(await frame.locator(".topbar").evaluate(el => el.getBoundingClientRect().top)).toBe(103);
  const total = await frame.locator("#total").textContent();
  await body.evaluate(() => window.changeViewport({windowWidth:390,windowHeight:844,safeArea:{top:24,bottom:844,left:12,right:378}}));
  await expect.poll(() => body.evaluate(el => getComputedStyle(el).paddingTop)).toBe("24px");
  expect(await body.evaluate(el => getComputedStyle(el).paddingLeft)).toBe("12px");
  expect(await body.evaluate(el => getComputedStyle(el).paddingRight)).toBe("12px");
  await frame.locator(".wordmark").click();
  await expect(frame.locator("#total")).toHaveText(total);
  expect(await body.evaluate(el => getComputedStyle(el).paddingTop)).toBe("24px");
});

test("maximum PDF export keeps the page heartbeat running", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#total")).not.toHaveText("—");
  await page.locator("#size-mode").selectOption("custom");
  await page.locator("#width").fill("200");
  await page.locator("#height").fill("200");
  await page.locator("#generate").click();
  await expect(page.locator("#result-size")).toHaveText("200 × 200");
  await page.evaluate(() => {
    window.beat = { maxGap: 0, ticks: 0, last: performance.now() };
    window.beatTimer = setInterval(() => {
      const now = performance.now();
      window.beat.maxGap = Math.max(window.beat.maxGap, now - window.beat.last);
      window.beat.last = now;
      window.beat.ticks++;
    }, 30);
  });
  const event = page.waitForEvent("download");
  await page.locator("#export-pdf").click();
  const download = await event;
  await download.saveAs("test-results/downloads/maximum.pdf");
  const beat = await page.evaluate(() => {
    clearInterval(window.beatTimer);
    return window.beat;
  });
  expect(beat.ticks).toBeGreaterThan(10);
  expect(beat.maxGap).toBeLessThan(500);
});

test("SDK protocol substitute gates connecting actions, preserves newest import and locks active save", async ({
  page,
}) => {
  await page.goto("/");
  const bytes = (await fixture(page)).toString("base64");
  await page.route("**/@heybox_hb-sdk.js*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `let counter=0;export default {onHandshakeStateChange(cb){cb({status:'connecting'});setTimeout(()=>cb({status:'ready'}),1200);return ()=>{}},environment:{getInfoSync(){return {runtime:{mode:'production'}}}},files:{async pickFiles(){const n=++counter;return [{name:'image'+n+'.png',async stat(){return {size:100}},async readBytes(){await new Promise(r=>setTimeout(r,n%2?1200:100));window.readFinished=n;return Uint8Array.from(atob(${JSON.stringify(bytes)}),c=>c.charCodeAt(0))}}]},async saveFile(){return {async writeBytes(){window.writeStarted=true;await new Promise(r=>setTimeout(r,900));window.writeFinished=true}}}}};`,
    }),
  );
  await expect(page.locator("#total")).not.toHaveText("—");
  await page.evaluate(() => {
    const f = document.createElement("iframe");
    f.id = "test-native-frame";
    f.src = "/";
    f.style.cssText = "width:1400px;height:1100px";
    document.body.replaceChildren(f);
  });
  const frame = page.frameLocator("#test-native-frame");
  await expect(frame.locator("#total")).not.toHaveText("—");
  await expect(frame.locator("#import")).toBeDisabled();
  await expect(frame.locator("#export-csv")).toBeDisabled();
  await expect(frame.locator("#import")).toBeEnabled();
  await frame.locator("#import").click();
  await frame.locator("#demo").click();
  await page.waitForTimeout(1400);
  await expect(frame.locator("#source-name")).toHaveText("窗边的小花");
  await frame.locator("#import").click();
  await frame.locator("#import").click();
  await page.waitForTimeout(1400);
  await expect(frame.locator("#source-name")).toHaveText("image3.png");
  await frame.locator("#generate").click();
  await expect(frame.locator("#total")).toHaveText("3");
  await frame.locator("#export-csv").click();
  await expect(frame.locator("#save-file")).toBeVisible();
  await frame.locator("#save-file").click();
  await expect(frame.locator("#cancel-save")).toBeDisabled();
  await expect(frame.locator("#export-pdf")).toBeDisabled();
  await expect(frame.locator("#title")).toBeDisabled();
  await expect(frame.locator("#status")).toContainText("文件已保存");
  await frame.locator("#size-mode").selectOption("custom");
  await frame.locator("#width").fill("200");
  await frame.locator("#height").fill("200");
  await frame.locator("#generate").click();
  await expect(frame.locator("#result-size")).toHaveText("200 × 200");
  await frame.locator("body").evaluate(() => {
    window.beat = { maxGap: 0, ticks: 0, last: performance.now() };
    window.beatTimer = setInterval(() => {
      const now = performance.now();
      window.beat.maxGap = Math.max(window.beat.maxGap, now - window.beat.last);
      window.beat.last = now;
      window.beat.ticks++;
    }, 30);
  });
  await frame.locator("#export-pdf").click();
  await expect(frame.locator("#save-file")).toBeVisible({ timeout: 20000 });
  const beat = await frame.locator("body").evaluate(() => {
    clearInterval(window.beatTimer);
    return window.beat;
  });
  expect(beat.ticks).toBeGreaterThan(10);
  expect(beat.maxGap).toBeLessThan(500);
});
async function fixture(page, type = "image/png") {
  return Buffer.from(
    await page.evaluate((type) => {
      const c = document.createElement("canvas");
      c.width = c.height = 2;
      const x = c.getContext("2d");
      x.putImageData(
        new ImageData(
          new Uint8ClampedArray([
            0, 0, 0, 255, 255, 0, 0, 255, 255, 255, 255, 255, 0, 255, 0, 0,
          ]),
          2,
          2,
        ),
        0,
        0,
      );
      return c.toDataURL(type).split(",")[1];
    }, type),
    "base64",
  );
}
test("real image import and all three file exports have matching bead counts", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "拼豆工作台", exact: true }),
  ).toBeVisible();
  const buffer = await fixture(page);
  await page
    .locator("#file-input")
    .setInputFiles({ name: "我的图纸.png", mimeType: "image/png", buffer });
  await page.locator("#image-mode").selectOption("pixel");
  await page.locator("#size-mode").selectOption("auto");
  await page.locator("#generate").click();
  await expect(page.locator("#total")).toHaveText("3");
  await expect(page.locator("#result-size")).toHaveText("2 × 2");
  await mkdir("test-results/downloads", { recursive: true });
  for (const kind of ["png", "csv", "pdf"]) {
    const event = page.waitForEvent("download");
    await page.locator(`#export-${kind}`).click();
    const download = await event;
    const path = `test-results/downloads/result.${kind}`;
    await download.saveAs(path);
    const bytes = await readFile(path);
    if (kind === "png") expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    if (kind === "csv") {
      const s = bytes.toString("utf8");
      expect(s.charCodeAt(0)).toBe(0xfeff);
      expect(
        [...s.matchAll(/,(\d+)\r\n/g)].reduce((n, m) => n + Number(m[1]), 0),
      ).toBe(3);
    }
    if (kind === "pdf")
      expect(
        (await PDFDocument.load(bytes)).getPageCount(),
      ).toBeGreaterThanOrEqual(3);
  }
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/workbench-desktop.png",
    fullPage: true,
  });
});
test("empty input, full palette and large PNG are valid without changing export counts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#total")).not.toHaveText("—");
  const buffer = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      return c.toDataURL().split(",")[1];
    }),
    "base64",
  );
  await page
    .locator("#file-input")
    .setInputFiles({ name: "transparent.png", mimeType: "image/png", buffer });
  await page.locator("#generate").click();
  await expect(page.locator("#total")).toHaveText("0");
  await page.locator("#demo").click();
  await expect(page.locator("#total")).not.toHaveText("0");
  await page.locator("#palette").selectOption("mard-full");
  await page.locator("#size-mode").selectOption("custom");
  await page.locator("#width").fill("200");
  await page.locator("#height").fill("200");
  await page.locator("#generate").click();
  await expect(page.locator("#result-size")).toHaveText("200 × 200");
  await page.locator("#zoom").fill("36");
  await page.locator("#zoom").dispatchEvent("input");
  expect(
    await page.locator("#chart").evaluate((c) => c.width * c.height),
  ).toBeLessThanOrEqual(32 * 1024 * 1024);
  const event = page.waitForEvent("download");
  await page.locator("#export-png").click();
  const download = await event;
  await download.saveAs("test-results/downloads/large.png");
  const size = await page.evaluate(async () => {
    const response = await fetch("/test-results/downloads/large.png");
    const b = await createImageBitmap(await response.blob());
    return { width: b.width, height: b.height };
  });
  expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(8192);
  expect(size.width * size.height).toBeLessThanOrEqual(32 * 1024 * 1024);
  await page.locator("#title").fill("已经修改");
  await expect(page.locator("#export-pdf")).toBeDisabled();
  await expect(page.locator("#dirty-badge")).toBeVisible();
});
test("bad images and invalid dimensions preserve the current design", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#total")).not.toHaveText("—");
  const previous = await page.locator("#total").textContent();
  await page.locator("#file-input").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator("#status")).toContainText("无法读取");
  await expect(page.locator("#total")).toHaveText(previous);
  await page.locator("#size-mode").selectOption("custom");
  await page.locator("#width").fill("201");
  await page.locator("#generate").click();
  await expect(page.locator("#status")).toContainText("尺寸");
  await expect(page.locator("#total")).toHaveText(previous);
});
test("photo modes, presets, large grids and narrow screen remain usable", async ({
  page,
}) => {
  await page.goto("/");
  for (const mime of ["image/jpeg", "image/webp"]) {
    const buffer = await fixture(page, mime);
    await page.locator("#file-input").setInputFiles({
      name: `test.${mime.split("/")[1]}`,
      mimeType: mime,
      buffer,
    });
    await page.locator("#image-mode").selectOption("photo");
    await page.locator("#generate").click();
    await expect(page.locator("#status")).toContainText("已生成");
  }
  await page.locator("#size-mode").selectOption("custom");
  await page.locator("#width").fill("200");
  await page.locator("#height").fill("200");
  await page.locator("#generate").click();
  await expect(page.locator("#result-size")).toHaveText("200 × 200");
  await page.locator("#size-mode").selectOption("preset");
  await page.locator("#preset").selectOption("58");
  await page.locator("#generate").click();
  await expect(page.locator("#result-size")).toHaveText("58 × 58");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#generate")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/workbench-mobile.png",
    fullPage: true,
  });
});
