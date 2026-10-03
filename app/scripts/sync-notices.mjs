import { mkdir, readdir, readFile, copyFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../", import.meta.url));
const publicDir = resolve(app, "public"), licenses = resolve(publicDir, "licenses");
await mkdir(licenses, { recursive: true });
await copyFile(resolve(app, "THIRD_PARTY_NOTICES.md"), resolve(publicDir, "THIRD_PARTY_NOTICES.md"));
await copyFile(resolve(app, "assets/fonts/OFL.txt"), resolve(licenses, "NotoSansSC-OFL.txt"));
await copyFile(resolve(app, "src/data/MARD-LICENSE.txt"), resolve(licenses, "MARD-MIT.txt"));

const inventory = [];
// Browser runtime dependencies, plus fontkit used by source validation.
for (const name of ["@heybox/hb-sdk", "@heybox/hb-sdk-protocol", "@msgpack/msgpack",
  "pdf-lib", "@pdf-lib/standard-fonts", "@pdf-lib/upng", "pako", "tslib", "@pdf-lib/fontkit"]) {
  const directory = resolve(app, "node_modules", name);
  const pkg = JSON.parse(await readFile(resolve(directory, "package.json"), "utf8"));
  const files = (await readdir(directory)).filter((f) => /^(license|copying|copyright|notice|third_party_notices)(\.|$)/i.test(f));
  const target = resolve(licenses, name.replaceAll("/", "-").replace("@", ""));
  await mkdir(target, { recursive: true });
  for (const file of files) await copyFile(resolve(directory, file), resolve(target, file));
  const metadata = { name: pkg.name, version: pkg.version, license: pkg.license,
    repository: pkg.repository, homepage: pkg.homepage, upstreamNoticeFiles: files };
  await writeFile(resolve(target, "package-info.json"), JSON.stringify(metadata, null, 2) + "\n");
  inventory.push(metadata);
}
await writeFile(resolve(licenses, "inventory.json"), JSON.stringify(inventory, null, 2) + "\n");
await writeFile(resolve(licenses, "README.txt"),
  "原始字体、色卡及依赖许可证随生产包保留。\n" +
  "各 package-info.json 的许可字段来自固定版本的 npm 包；upstreamNoticeFiles 为上游实际随包提供的文件，没有虚构版权主体。\n" +
  "fontkit 用于源码验证；SDK 的 THIRD_PARTY_NOTICES 同时包含其 Browser Dev Host 依赖说明。\n");
console.log("Distribution notices synchronized to public/ for both builds.");
