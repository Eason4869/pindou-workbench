import "./styles.css";
import logoUrl from "../assets/logo.svg";
import { BRAND } from "./brand.js";
import { getPalette } from "./palettes.js";
import { createState } from "./state.js";
import { readImage, makeDemo } from "./image.js";
import { drawChart } from "./render/chart.js";
import { createPng } from "./export/png.js";
import { createCsv } from "./export/csv.js";
import { safeFilename } from "./export/names.js";
import { createBrowserAdapter } from "./platform/browser.js";
import { createHeyboxAdapter } from "./platform/heybox.js";
import { observeSafeArea } from "./platform/viewport.js";
import {
  createImportIntent,
  createSaveSession,
} from "./platform/file-lifecycle.js";
import { convertRgbaAsync } from "./core/convert.js";

document.querySelector("#app").innerHTML = `
 <header class="topbar"><a class="wordmark" href="#app" aria-label="拼豆工作台，回到顶部"><img class="mark" src="${logoUrl}" alt="" width="46" height="46"><div><h1>${BRAND.name}</h1><span>把喜欢的画面，一颗颗拼出来。</span></div></a><span class="environment" id="environment">本地处理 · 浏览器版</span></header>
 <main class="workspace">
  <aside class="settings panel"><div class="panel-title"><span class="step">01</span><h2>开始一个作品</h2></div>
   <input id="file-input" type="file" accept="image/png,image/jpeg,image/webp" hidden>
   <button id="import" class="upload"><span class="upload-symbol">＋</span><strong>导入图片</strong><small>PNG / JPG / WebP · 最大 8 MiB</small></button>
   <div class="source"><img id="source-preview" alt="导入的原图"><div><strong id="source-name">窗边的小花</strong><small id="source-size">24 × 28 px</small></div><button id="demo" title="使用小花示例" aria-label="使用小花示例">↺</button></div>
   <label for="title">作品名称</label><input id="title" value="窗边的小花" maxlength="80">
   <label for="image-mode">图片类型</label><select id="image-mode"><option value="pixel">像素图 · 保留清晰边缘</option><option value="photo">普通图片 · 平滑采样</option></select>
   <div class="divider"></div><div class="panel-title"><span class="step">02</span><h2>设定你的图纸</h2></div>
   <label for="size-mode">图纸尺寸</label><select id="size-mode"><option value="auto">自动尺寸</option><option value="preset">预设尺寸</option><option value="custom">自定义尺寸</option></select>
   <div id="preset-options" hidden><label for="preset">选择底板格数</label><select id="preset"><option value="29">29 × 29</option><option value="58">58 × 58</option><option value="32">32 × 32</option><option value="64">64 × 64</option><option value="96">96 × 96</option></select></div>
   <div id="custom-options" class="dimension-inputs" hidden><div><label for="width">宽（格）</label><input id="width" type="number" min="1" max="200" step="1" value="64"></div><span>×</span><div><label for="height">高（格）</label><input id="height" type="number" min="1" max="200" step="1" value="64"></div></div>
   <p id="size-help" class="help">像素图保留原尺寸；大图长边设为 64 格。</p>
   <label class="check"><input id="keep-aspect" type="checkbox" checked> 保持比例，空白居中补齐</label>
   <label for="palette">豆子色卡</label><select id="palette"><option value="mard-basic">MARD · 基础 221 色</option><option value="mard-full">MARD · 全量 291 色</option></select>
   <label for="max-colors">最多使用颜色</label><select id="max-colors"><option value="8">8 色 · 简洁</option><option value="16">16 色</option><option value="24" selected>24 色 · 推荐</option><option value="32">32 色</option><option value="48">48 色</option><option value="0">不限颜色</option></select>
   <details><summary>尺寸估算与透明处理</summary><label for="pitch">孔距（毫米，可留空）</label><input id="pitch" type="number" min="1" max="10" step="0.1" placeholder="例如 5"><p class="help">透明度低于 50% 留空，其余与白色合成。估算尺寸只供参考。</p></details>
   <button id="generate" class="primary">生成设计图 <span>→</span></button>
   <p id="status" class="status" role="status" aria-live="polite">正在准备示例…</p>
  </aside>
  <section class="design panel"><div class="design-header"><div><span class="eyebrow">YOUR BEAD PATTERN</span><h2 id="design-title">窗边的小花</h2></div><span id="dirty-badge" class="badge" hidden>参数已修改</span></div>
   <div class="metrics"><div><strong id="result-size">—</strong><span>图纸格数</span></div><div><strong id="total">—</strong><span>所需豆子</span></div><div><strong id="color-total">—</strong><span>使用颜色</span></div></div>
   <div class="chart-toolbar"><label class="check"><input id="show-codes" type="checkbox" checked> 色号</label><label class="check"><input id="show-grid" type="checkbox" checked> 网格</label><label class="zoom-label" for="zoom">缩放 <input id="zoom" type="range" min="8" max="36" value="22"></label><button id="fit">适应窗口</button></div>
   <div class="chart-scroll" id="chart-scroll"><canvas id="chart" aria-label="带坐标和色号的拼豆设计图">请使用支持 Canvas 的浏览器。</canvas></div>
   <div class="chart-note"><span>每 10 格加粗 · 坐标从 1 开始</span><span id="physical-size">空格无需摆豆</span></div>
   <div class="export-bar"><div><strong>带上图纸，开始拼豆</strong><small>PDF 包含总览、用量清单与分块大图</small></div><div class="export-actions"><button id="export-png">PNG</button><button id="export-csv">用量 CSV</button><button id="export-pdf" class="accent">导出 PDF ↗</button></div></div>
   <div id="save-panel" class="save-panel" hidden><span id="save-message"></span><button id="save-file" class="accent">保存文件</button><button id="cancel-save">取消</button></div>
  </section>
  <aside class="materials panel"><div class="panel-title"><span class="step">03</span><h2>备好这些颜色</h2></div><p class="help">按实际用量排序 · 不含备料余量</p><div class="legend-heading"><span>色号 / 参考颜色</span><span>颗数</span></div><div id="legend" class="legend"></div><div class="material-footer"><span id="palette-note">MARD 基础色卡</span><p>色值来自公开色卡数据，屏幕显示仅供参考。请以实物色卡为准。</p></div></aside>
 </main><footer class="footer"><div class="signature">${BRAND.name} <span id="app-version">v${BRAND.version}</span><span id="app-author">作者：${BRAND.author}</span></div><details class="about"><summary>关于与源码仓库</summary><div class="about-content"><p>图片仅在设备本地处理。文件权限用于读取你选择的图片，以及保存你主动导出的图纸。</p><p>GitHub：<a id="repository-link" href="${BRAND.repository}" target="_blank" rel="noopener noreferrer">${BRAND.repository}</a></p><p>MARD 色值为公开参考数据，请以实物色卡为准。字体及色卡许可随版本提供。</p></div></details></footer>`;

const $ = (id) => document.getElementById(id),
  state = createState(),
  embedded = window.parent !== window,
  importIntent = createImportIntent(),
  saveSession = createSaveSession();
document.querySelector(".wordmark").onclick = event => {
  event.preventDefault();
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
};
let image = makeDemo(),
  loading = false,
  exporting = false,
  adapter = embedded ? null : createBrowserAdapter(),
  fontPromise;
const worker = embedded
  ? null
  : new Worker(new URL("./core/convert.worker.js", import.meta.url), {
      type: "module",
    });
const status = (message, error = false) => {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
};
function buttons() {
  $("generate").disabled = loading || state.busy || saveSession.busy;
  $("import").disabled = !adapter || saveSession.busy;
  $("demo").disabled = saveSession.busy;
  $("save-file").disabled = saveSession.busy || exporting;
  $("cancel-save").disabled = saveSession.busy;
  document
    .querySelectorAll(".settings input,.settings select")
    .forEach((control) => (control.disabled = saveSession.busy));
  $("generate").firstChild.textContent = state.busy
    ? "正在生成… "
    : loading
      ? "正在读取… "
      : "生成设计图 ";
  for (const kind of ["png", "csv", "pdf"])
    $(`export-${kind}`).disabled =
      !adapter ||
      !state.pattern ||
      state.busy ||
      state.dirty ||
      exporting ||
      loading ||
      saveSession.busy;
  $("dirty-badge").hidden = !state.dirty || !state.pattern;
}
function dirty() {
  state.markDirty();
  saveSession.cancel();
  $("save-panel").hidden = true;
  buttons();
  status("参数已修改，生成后可导出新图纸。");
}
function settings() {
  const mode = $("size-mode").value,
    n = Number($("preset").value),
    pitch = $("pitch").value ? Number($("pitch").value) : null;
  if (pitch !== null && (!Number.isFinite(pitch) || pitch < 1 || pitch > 10))
    throw new Error("孔距必须在 1–10 毫米之间");
  return {
    imageMode: $("image-mode").value,
    sizeMode: mode,
    width: mode === "preset" ? n : Number($("width").value),
    height: mode === "preset" ? n : Number($("height").value),
    keepAspect: $("keep-aspect").checked,
    maxColors: Number($("max-colors").value),
    pitchMm: pitch,
  };
}
function draw() {
  if (!state.pattern) return;
  const p = state.pattern,
    maxCell = Math.floor(
      (Math.sqrt(32 * 1024 * 1024) - 64) / Math.max(p.width, p.height),
    ),
    cell = Math.min(Number($("zoom").value), maxCell),
    c = $("chart");
  $("zoom").value = cell;
  c.width = p.width * cell + 64;
  c.height = p.height * cell + 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, c.width, c.height);
  drawChart(ctx, p, {
    cell,
    labels: $("show-codes").checked,
    grid: $("show-grid").checked,
  });
}
function fit() {
  if (!state.pattern) return;
  const p = state.pattern,
    box = $("chart-scroll");
  $("zoom").value = Math.min(
    36,
    Math.max(
      8,
      Math.floor(
        Math.min(
          (box.clientWidth - 70) / p.width,
          (box.clientHeight - 70) / p.height,
        ),
      ),
    ),
  );
  draw();
}
function render() {
  const p = state.pattern;
  $("result-size").textContent = `${p.width} × ${p.height}`;
  $("total").textContent = String(p.total);
  $("color-total").textContent = String(p.counts.length);
  $("design-title").textContent = p.title;
  $("physical-size").textContent = p.settings.pitchMm
    ? `约 ${((p.width * p.settings.pitchMm) / 10).toFixed(1)} × ${((p.height * p.settings.pitchMm) / 10).toFixed(1)} cm`
    : "空格无需摆豆";
  $("palette-note").textContent = `MARD ${p.palette.version}`;
  $("legend").replaceChildren();
  const colors = new Map(p.palette.colors.map((c) => [c.code, c]));
  p.counts.forEach((item) => {
    const c = colors.get(item.code),
      row = document.createElement("div");
    row.className = "legend-row";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = c.hex;
    const code = document.createElement("strong");
    code.textContent = c.code;
    const hex = document.createElement("small");
    hex.textContent = c.hex;
    const count = document.createElement("b");
    count.textContent = item.count;
    row.append(swatch, code, hex, count);
    $("legend").append(row);
  });
  if (!p.total) {
    const empty = document.createElement("p");
    empty.className = "help";
    empty.textContent = "所有格子均为空，不需要豆子。";
    $("legend").append(empty);
  }
  fit();
  buttons();
  status(`已生成 ${p.width} × ${p.height} 格图纸，共 ${p.total} 颗豆。`);
}
function generate() {
  if (loading || saveSession.busy) return;
  try {
    const config = settings(),
      requestId = state.begin();
    buttons();
    status("正在匹配色号，生成图纸…");
    const request = {
      requestId,
      image: { width: image.width, height: image.height, data: image.data },
      settings: config,
      palette: getPalette($("palette").value),
    };
    if (worker) worker.postMessage(request);
    else
      convertRgbaAsync(
        request.image,
        request.settings,
        request.palette,
        () => requestId !== state.requestId,
      )
        .then((pattern) => {
          if (pattern) receive({ requestId, pattern });
        })
        .catch((error) => receive({ requestId, error: error.message }));
  } catch (error) {
    state.fail(error.message);
    buttons();
    status(error.message, true);
  }
}
function receive(data) {
  if (data.requestId !== state.requestId) return;
  if (data.error) {
    state.fail(data.error);
    buttons();
    status(data.error, true);
    return;
  }
  const p = { ...data.pattern };
  p.title = $("title").value.trim() || "我的拼豆作品";
  Object.freeze(p.cells);
  p.counts.forEach(Object.freeze);
  Object.freeze(p.counts);
  Object.freeze(p.settings);
  Object.freeze(p);
  if (state.accept(data.requestId, p)) render();
}
if (worker) {
  worker.onmessage = ({ data }) => receive(data);
  worker.onerror = () => {
    state.fail("图纸生成失败，请刷新页面后重试");
    buttons();
    status(state.error, true);
  };
}
function source(name) {
  $("source-preview").src = image.preview;
  $("source-name").textContent = name;
  $("source-size").textContent = `${image.width} × ${image.height} px`;
}
async function load(file, token = importIntent.begin()) {
  if (!file) return;
  if (!importIntent.isCurrent(token)) return;
  loading = true;
  buttons();
  status("正在读取图片…");
  try {
    const next = await readImage(file);
    if (!importIntent.isCurrent(token)) {
      URL.revokeObjectURL(next.preview);
      return;
    }
    if (image.preview.startsWith("blob:")) URL.revokeObjectURL(image.preview);
    image = next;
    source(file.name);
    $("title").value = file.name.replace(/\.[^.]+$/, "").slice(0, 80);
    dirty();
    status("图片已导入，选择尺寸后生成设计图。");
  } catch (error) {
    if (importIntent.isCurrent(token)) status(error.message, true);
  } finally {
    if (importIntent.isCurrent(token)) {
      loading = false;
      buttons();
    }
  }
}
$("file-input").onchange = (event) => {
  load(event.target.files[0]);
  event.target.value = "";
};
$("import").onclick = () => {
  if (!adapter || saveSession.busy) return;
  if (adapter.kind === "native") {
    const token = importIntent.begin();
    loading = true;
    buttons();
    status("请选择要导入的图片…");
    adapter
      .pickImageFromClick()
      .then((file) => {
        if (!importIntent.isCurrent(token)) return;
        if (!file) {
          status("已取消导入，保留当前图纸。");
          return;
        }
        return load(file, token);
      })
      .catch((error) => {
        if (importIntent.isCurrent(token)) status(error.message, true);
      })
      .finally(() => {
        if (importIntent.isCurrent(token)) {
          loading = false;
          buttons();
        }
      });
  } else $("file-input").click();
};
$("demo").onclick = () => {
  if (saveSession.busy) return;
  importIntent.begin();
  loading = false;
  if (image.preview.startsWith("blob:")) URL.revokeObjectURL(image.preview);
  image = makeDemo();
  source("窗边的小花");
  $("title").value = "窗边的小花";
  $("image-mode").value = "pixel";
  $("size-mode").value = "auto";
  toggleSize();
  dirty();
  generate();
};
function toggleSize() {
  $("preset-options").hidden = $("size-mode").value !== "preset";
  $("custom-options").hidden = $("size-mode").value !== "custom";
  $("size-help").textContent =
    $("size-mode").value === "auto"
      ? $("image-mode").value === "pixel"
        ? "像素图保留原尺寸；大图长边设为 64 格。"
        : "普通图片长边设为 64 格，自动保持比例。"
      : "宽和高均支持 1–200 格。";
}
for (const id of [
  "title",
  "image-mode",
  "size-mode",
  "preset",
  "width",
  "height",
  "keep-aspect",
  "palette",
  "max-colors",
  "pitch",
])
  $(id).addEventListener("input", () => {
    toggleSize();
    dirty();
  });
for (const id of ["show-codes", "show-grid", "zoom"])
  $(id).addEventListener("input", draw);
$("fit").onclick = fit;
$("generate").onclick = generate;
async function prepareExport(kind) {
  const p = state.pattern;
  if (!adapter || !p || state.dirty || exporting || saveSession.busy) return;
  saveSession.cancel();
  $("save-panel").hidden = true;
  exporting = true;
  buttons();
  status(`正在准备 ${kind.toUpperCase()} 文件…`);
  try {
    const info = { title: p.title };
    let bytes, mime;
    if (kind === "csv") {
      bytes = new TextEncoder().encode(createCsv(p));
      mime = "text/csv;charset=utf-8";
    } else if (kind === "png") {
      bytes = new Uint8Array(await (await createPng(p, info)).arrayBuffer());
      mime = "image/png";
    } else {
      fontPromise ??= import("./export/font-source.js")
        .then((m) => m.loadFontBytes())
        .catch((e) => {
          fontPromise = null;
          throw e;
        });
      if (embedded) {
        const { createPdf } = await import("./export/pdf.js");
        bytes = await createPdf(p, info, await fontPromise, {
          cooperative: true,
        });
      } else {
        const { createPdfInWorker } = await import(
          "./export/pdf-background.js"
        );
        bytes = await createPdfInWorker(p, info, await fontPromise);
      }
      mime = "application/pdf";
    }
    const name = `${safeFilename(p.title)}-${p.width}x${p.height}.${kind}`;
    if (adapter.kind === "native") {
      if (state.dirty || state.pattern !== p) {
        status("作品已修改，请重新生成并导出。");
        return;
      }
      saveSession.prepare({ bytes, name, mime });
      $("save-message").textContent =
        `${kind.toUpperCase()} 已准备好，请点击保存。`;
      $("save-file").textContent = "保存文件";
      $("save-panel").hidden = false;
      status("文件已生成，点击保存选择位置。");
    } else {
      const result = await adapter.saveFromClick(bytes, name, mime);
      status(
        result.status === "preview-restricted"
          ? `文件已生成（${(bytes.byteLength / 1024 / 1024).toFixed(1)} MiB），官方开发预览禁止下载，请使用独立网页版导出。`
          : `${kind.toUpperCase()} 下载已开始，请查看浏览器下载列表。`,
      );
    }
  } catch (error) {
    status(`导出失败：${error.message}`, true);
  } finally {
    exporting = false;
    buttons();
  }
}
for (const kind of ["png", "csv", "pdf"])
  $(`export-${kind}`).onclick = () => prepareExport(kind);
$("save-file").onclick = () => {
  if (exporting || !adapter) return;
  const file = saveSession.begin();
  if (!file) return;
  // Start SDK calls synchronously in a fresh click, before any await.
  const operation = file.directory
    ? adapter.saveToDirectoryFromClick(file.bytes, file.name)
    : adapter.saveFromClick(file.bytes, file.name);
  buttons();
  status("正在保存文件，请等待…");
  operation
    .then((result) => {
      if (!saveSession.finish(file, result)) return;
      if (result.status === "needs-directory") {
        $("save-message").textContent = "当前客户端需要选择文件夹保存。";
        $("save-file").textContent = "选择保存文件夹";
      } else if (result.status === "saved") {
        status("文件已保存。");
        $("save-panel").hidden = true;
      } else status("已取消保存，可再次点击保存。");
    })
    .catch((error) => {
      if (saveSession.fail(file)) status(error.message, true);
    })
    .finally(() => {
      buttons();
    });
};
$("cancel-save").onclick = () => {
  if (!saveSession.cancel()) return;
  $("save-panel").hidden = true;
  status("已取消本次保存。");
};
if (embedded) {
  $("environment").textContent = "正在连接小黑盒…";
  import("@heybox/hb-sdk")
    .then(({ default: sdk }) => {
      let stopViewport;
      const stop = sdk.onHandshakeStateChange((handshake) => {
        if (handshake.status === "connecting") return;
        if (handshake.status === "failed") {
          $("environment").textContent = "客户端连接失败，请重新打开";
          buttons();
          return;
        }
        const info = sdk.environment.getInfoSync();
        stopViewport ??= observeSafeArea(sdk);
        if (["production", "preview"].includes(info.runtime.mode)) {
          adapter = { kind: "native", ...createHeyboxAdapter(sdk) };
          $("environment").textContent = "小黑盒客户端 · 本地处理";
        } else if (info.runtime.mode === "development") {
          adapter = createBrowserAdapter({ restricted: true });
          $("environment").textContent = "官方开发预览 · 下载请用网页版";
        } else $("environment").textContent = "客户端环境不可用，请重新打开";
        buttons();
      });
      window.addEventListener("unload", () => { stop(); stopViewport?.(); }, { once: true });
    })
    .catch(() => {
      $("environment").textContent = "客户端连接失败，请重新打开";
      buttons();
    });
}
source("窗边的小花");
generate();
