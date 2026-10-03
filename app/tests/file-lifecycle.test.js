import { test } from "node:test";
import assert from "node:assert/strict";
const lifecycle = await import("../src/platform/file-lifecycle.js").catch(
  () => ({}),
);
test("restricted SDK preview never reports a browser download as started", async () => {
  const { createBrowserAdapter } = await import("../src/platform/browser.js");
  const result = await createBrowserAdapter({ restricted: true }).saveFromClick(
    new Uint8Array([1]),
    "test.pdf",
    "application/pdf",
  );
  assert.equal(result.status, "preview-restricted");
});
test("active native write cannot be cancelled or replaced and stale callbacks cannot clear a new file", () => {
  assert.equal(typeof lifecycle.createSaveSession, "function");
  const s = lifecycle.createSaveSession();
  s.prepare({ name: "A" });
  const a = s.begin();
  assert.equal(s.busy, true);
  assert.equal(s.cancel(), false);
  assert.equal(s.prepare({ name: "B" }), false);
  assert.equal(s.pending.name, "A");
  s.finish(a, { status: "needs-directory" });
  assert.equal(s.pending.directory, true);
  assert.equal(s.busy, false);
  s.cancel();
  s.prepare({ name: "B" });
  assert.equal(s.finish(a, { status: "saved" }), false);
  assert.equal(s.pending.name, "B");
  const b = s.begin();
  s.finish(b, { status: "saved" });
  assert.equal(s.pending, null);
});
test("native import tokens follow initiating clicks across delayed reads and demo selection", async () => {
  assert.equal(typeof lifecycle.createImportIntent, "function");
  const intent = lifecycle.createImportIntent();
  const a = intent.begin();
  let resolveA;
  const oldRead = new Promise((resolve) => (resolveA = resolve));
  const result = oldRead.then(() => intent.isCurrent(a));
  intent.begin();
  resolveA();
  assert.equal(await result, false);
  const b = intent.begin();
  const c = intent.begin();
  assert.equal(intent.isCurrent(b), false);
  assert.equal(intent.isCurrent(c), true);
});
