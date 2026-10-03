import { mkdir, readdir, readFile, copyFile, writeFile, realpath, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../", import.meta.url));
const publicDir = resolve(app, "public"), licenses = resolve(publicDir, "licenses");
await mkdir(licenses, { recursive: true });
// This directory contains only generated notices. Reject redirected paths before clearing it.
if (await realpath(licenses) !== resolve(await realpath(app), "public", "licenses")) {
  throw new Error("Generated license directory must stay inside this project");
}
await rm(licenses, { recursive: true });
await mkdir(licenses, { recursive: true });
// Keep source documentation as Markdown, ship static notice attachments as text.
await rm(resolve(publicDir, "THIRD_PARTY_NOTICES.md"), { force: true });
await copyFile(resolve(app, "THIRD_PARTY_NOTICES.md"), resolve(publicDir, "THIRD_PARTY_NOTICES.txt"));
await copyFile(resolve(app, "assets/fonts/OFL.txt"), resolve(licenses, "NotoSansSC-OFL.txt"));
await copyFile(resolve(app, "src/data/MARD-LICENSE.txt"), resolve(licenses, "MARD-MIT.txt"));

const inventory = [];
const directories = {
  "@heybox/hb-sdk": "hb-sdk", "@heybox/hb-sdk-protocol": "hb-protocol",
  "@msgpack/msgpack": "msgpack", "pdf-lib": "pdf-lib",
  "@pdf-lib/standard-fonts": "pdf-fonts", "@pdf-lib/upng": "upng",
  pako: "pako", tslib: "tslib", "@pdf-lib/fontkit": "fontkit",
};
// Browser runtime dependencies, plus fontkit used by source validation.
for (const name of ["@heybox/hb-sdk", "@heybox/hb-sdk-protocol", "@msgpack/msgpack",
  "pdf-lib", "@pdf-lib/standard-fonts", "@pdf-lib/upng", "pako", "tslib", "@pdf-lib/fontkit"]) {
  const directory = resolve(app, "node_modules", name);
  const pkg = JSON.parse(await readFile(resolve(directory, "package.json"), "utf8"));
  const files = (await readdir(directory)).filter((f) => /^(license|copying|copyright|notice|third_party_notices)(\.|$)/i.test(f));
  const target = resolve(licenses, directories[name]);
  await mkdir(target, { recursive: true });
  const distributedNoticeFiles = {};
  for (const file of files) {
    const distributed = file.replace(/\.(md|txt)$/i, "") + ".txt";
    await copyFile(resolve(directory, file), resolve(target, distributed));
    distributedNoticeFiles[file] = distributed;
  }
  const metadata = { name: pkg.name, version: pkg.version, license: pkg.license,
    repository: pkg.repository, homepage: pkg.homepage, upstreamNoticeFiles: files,
    distributionDirectory: `licenses/${directories[name]}`, distributedNoticeFiles };
  await writeFile(resolve(target, "info.json"), JSON.stringify(metadata, null, 2) + "\n");
  inventory.push(metadata);
}
await writeFile(resolve(licenses, "inventory.json"), JSON.stringify(inventory, null, 2) + "\n");
await writeFile(resolve(licenses, "README.txt"),
  "原始字体、色卡及依赖许可证随生产包保留。\n" +
  "各 info.json 的许可字段来自固定版本的 npm 包；upstreamNoticeFiles 为上游实际随包提供的文件，distributionDirectory 对应短目录，没有虚构版权主体。\n" +
  "fontkit 用于源码验证；SDK 的 THIRD_PARTY_NOTICES 同时包含其 Browser Dev Host 依赖说明。\n");
console.log("Distribution notices synchronized to public/ for both builds.");
