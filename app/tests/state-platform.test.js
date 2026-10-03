import { test } from "node:test";
import assert from "node:assert/strict";
const state = await import("../src/state.js").catch(() => ({}));
const platform = await import("../src/platform/heybox.js").catch(() => ({}));
test("old Worker results are ignored and failures keep the last valid pattern", () => {
  assert.equal(typeof state.createState, "function", "state API missing");
  const s = state.createState();
  const a = s.begin(),
    b = s.begin();
  assert.equal(s.accept(a, { total: 1 }), false);
  assert.equal(s.accept(b, { total: 2 }), true);
  s.markDirty();
  assert.equal(s.dirty, true);
  s.fail("损坏图片");
  assert.equal(s.pattern.total, 2);
  assert.equal(s.busy, false);
});
test("native save waits for the actual write and handles cancel or missing capability", async () => {
  assert.equal(
    typeof platform.createHeyboxAdapter,
    "function",
    "SDK adapter API missing",
  );
  const error = (code) => Object.assign(new Error(code), { code });
  for (const [code, status] of [
    ["FILE_PICKER_CANCELLED", "cancelled"],
    ["METHOD_FORBIDDEN", "needs-directory"],
  ]) {
    const sdk = {
      files: {
        saveFile: async () => {
          throw error(code);
        },
      },
    };
    assert.equal(
      (
        await platform
          .createHeyboxAdapter(sdk)
          .saveFromClick(new Uint8Array([1]), "a.pdf")
      ).status,
      status,
    );
  }
  let finish;
  const waiting = new Promise((resolve) => (finish = resolve));
  let complete = false;
  const sdk = {
    files: { saveFile: async () => ({ writeBytes: () => waiting }) },
  };
  const pending = platform
    .createHeyboxAdapter(sdk)
    .saveFromClick(new Uint8Array([1]), "a.pdf")
    .then((r) => {
      complete = true;
      return r;
    });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(complete, false);
  finish();
  assert.equal((await pending).status, "saved");
});
test("native save preserves collision errors and directory writes do not overwrite existing files", async () => {
  assert.equal(
    typeof platform.createHeyboxAdapter,
    "function",
    "SDK adapter API missing",
  );
  const sdk = {
    files: {
      saveFile: async () => {
        throw Object.assign(new Error("exists"), {
          code: "FILE_ALREADY_EXISTS",
        });
      },
      pickDirectory: async () => ({
        file: () => ({
          create: async (opts) => {
            assert.equal(opts.exclusive, true);
            throw Object.assign(new Error("exists"), {
              code: "FILE_ALREADY_EXISTS",
            });
          },
        }),
      }),
    },
  };
  const p = platform.createHeyboxAdapter(sdk);
  await assert.rejects(
    () => p.saveFromClick(new Uint8Array([1]), "a.pdf"),
    /同名/,
  );
  await assert.rejects(
    () => p.saveToDirectoryFromClick(new Uint8Array([1]), "a.pdf"),
    /同名/,
  );
});
