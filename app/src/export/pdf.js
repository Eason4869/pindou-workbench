import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { embedLocalFont } from "./local-font.js";
import { planTiles } from "./layout.js";
import { textColor } from "../core/color.js";

const PAGE = [595.276, 841.89],
  MARGIN = 42.52;
const ink = rgb(0.153, 0.141, 0.231),
  muted = rgb(0.43, 0.43, 0.49),
  purple = rgb(0.459, 0.384, 0.792);
const pdfColor = (c) => rgb(...c.rgb.map((n) => n / 255));
function lines(text, font, size, maxWidth) {
  const result = [];
  let line = "";
  for (const char of String(text).slice(0, 160)) {
    if (font.widthOfTextAtSize(line + char, size) > maxWidth && line) {
      result.push(line);
      line = "";
    }
    line += char;
  }
  if (line) result.push(line);
  return result;
}

export async function createPdf(
  pattern,
  info,
  fontBytes,
  { cooperative = false } = {},
) {
  const doc = await PDFDocument.create();
  const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
  const font = embedLocalFont(doc, fontBytes),
    codes = await doc.embedFont(StandardFonts.Helvetica);
  const colors = new Map(pattern.palette.colors.map((c) => [c.code, c]));
  const text = (page, value, x, y, size = 10, color = ink) =>
    page.drawText(String(value), { x, y, size, font, color });
  const header = (page, title, sub) => {
    text(page, title, MARGIN, 788, 19, purple);
    text(page, sub, MARGIN, 762, 9, muted);
  };
  const overview = doc.addPage(PAGE);
  header(
    overview,
    "拼豆设计图",
    `${pattern.width} × ${pattern.height} 格    ${pattern.total} 颗豆    ${pattern.counts.length} 种颜色`,
  );
  let y = 733;
  for (const line of lines(
    info.title || "我的拼豆作品",
    font,
    14,
    PAGE[0] - 2 * MARGIN,
  )) {
    text(overview, line, MARGIN, y, 14);
    y -= 21;
  }
  text(overview, `MARD ${pattern.palette.version}`, MARGIN, y - 5, 10, muted);
  if (pattern.settings.pitchMm)
    text(
      overview,
      `估算占用：${((pattern.width * pattern.settings.pitchMm) / 10).toFixed(1)} × ${((pattern.height * pattern.settings.pitchMm) / 10).toFixed(1)} cm（孔距 ${pattern.settings.pitchMm} mm）`,
      MARGIN,
      y - 24,
      9,
      muted,
    );
  const boxTop = Math.min(y - 45, 650),
    boxBottom = 166,
    cell = Math.min(
      (PAGE[0] - 2 * MARGIN) / pattern.width,
      (boxTop - boxBottom) / pattern.height,
    );
  const originX = (PAGE[0] - cell * pattern.width) / 2,
    originY = boxTop - cell * pattern.height;
  overview.drawRectangle({
    x: originX,
    y: originY,
    width: cell * pattern.width,
    height: cell * pattern.height,
    color: rgb(0.97, 0.97, 0.98),
  });
  for (let row = 0; row < pattern.height; row++) {
    if (cooperative && row % 8 === 0) await pause();
    for (let col = 0; col < pattern.width; ) {
      const code = pattern.cells[row * pattern.width + col];
      let end = col + 1;
      while (
        end < pattern.width &&
        pattern.cells[row * pattern.width + end] === code
      )
        end++;
      if (code)
        overview.drawRectangle({
          x: originX + col * cell,
          y: originY + (pattern.height - row - 1) * cell,
          width: (end - col) * cell,
          height: cell,
          color: pdfColor(colors.get(code)),
        });
      col = end;
    }
  }
  text(overview, "先看整体，再按后续分块图纸逐格摆豆。", MARGIN, 127, 11);
  text(
    overview,
    "空格无需摆豆。屏幕色值为参考，实物颜色以手中色卡为准。",
    MARGIN,
    105,
    9,
    muted,
  );
  text(
    overview,
    "本图为计数图纸，打印比例不代表实际底板孔距。",
    MARGIN,
    87,
    9,
    muted,
  );

  const legendRows = 36;
  for (
    let start = 0;
    start < Math.max(1, pattern.counts.length);
    start += legendRows
  ) {
    const page = doc.addPage(PAGE);
    header(
      page,
      "用量清单",
      `MARD ${pattern.palette.version}    实际数量，不包含备料余量`,
    );
    text(page, "颜色", MARGIN, 723, 10);
    text(page, "色号", MARGIN + 50, 723, 10);
    text(page, "屏幕参考色", MARGIN + 150, 723, 10);
    text(page, "所需颗数", PAGE[0] - MARGIN - 62, 723, 10);
    if (!pattern.counts.length)
      text(page, "这张图纸没有非空格，无须摆豆。", MARGIN, 677, 12);
    pattern.counts.slice(start, start + legendRows).forEach((item, i) => {
      const c = colors.get(item.code),
        yy = 694 - i * 16;
      page.drawRectangle({
        x: MARGIN,
        y: yy - 2,
        width: 20,
        height: 11,
        color: pdfColor(c),
      });
      page.drawText(c.code, {
        x: MARGIN + 50,
        y: yy,
        size: 10,
        font: codes,
        color: ink,
      });
      page.drawText(c.hex, {
        x: MARGIN + 150,
        y: yy,
        size: 9,
        font: codes,
        color: muted,
      });
      text(page, item.count, PAGE[0] - MARGIN - 50, yy, 10);
    });
    text(
      page,
      `合计 ${pattern.total} 颗 / ${pattern.counts.length} 色`,
      MARGIN,
      95,
      11,
      purple,
    );
  }
  const maxCode = Math.max(
    0,
    ...pattern.counts.map((c) => codes.widthOfTextAtSize(c.code, 7)),
  );
  const size = Math.max((5 * 72) / 25.4, maxCode + 4),
    columns = Math.max(1, Math.floor((PAGE[0] - 2 * MARGIN - 23) / size)),
    rows = Math.max(1, Math.floor(565 / size));
  const tiles = planTiles(pattern.width, pattern.height, { columns, rows });
  for (let index = 0; index < tiles.length; index++) {
    const tile = tiles[index],
      page = doc.addPage(PAGE),
      top = 699,
      left = MARGIN + 23;
    header(
      page,
      `图纸分块 ${index + 1} / ${tiles.length}`,
      `行 ${tile.rowStart}–${tile.rowStart + tile.rowCount - 1}    列 ${tile.colStart}–${tile.colStart + tile.colCount - 1}    全图 ${pattern.width} × ${pattern.height}`,
    );
    text(page, "坐标从 1 开始；点表示空格，无需摆豆。", MARGIN, 738, 9, muted);
    let subtotal = 0;
    for (let y = 0; y < tile.rowCount; y++)
      for (let x = 0; x < tile.colCount; x++) {
        if (cooperative && (y * tile.colCount + x) % 128 === 0) await pause();
        const code =
            pattern.cells[
              (tile.rowStart - 1 + y) * pattern.width + tile.colStart - 1 + x
            ],
          c = colors.get(code),
          px = left + x * size,
          py = top - (y + 1) * size;
        page.drawRectangle({
          x: px,
          y: py,
          width: size,
          height: size,
          color: c ? pdfColor(c) : rgb(1, 1, 1),
        });
        const label = code || ".",
          labelColor =
            c && textColor(c.rgb) === "#FFFFFF"
              ? rgb(1, 1, 1)
              : code
                ? ink
                : rgb(0.7, 0.7, 0.73);
        page.drawText(label, {
          x: px + (size - codes.widthOfTextAtSize(label, 7)) / 2,
          y: py + (size - 7) / 2 + 1,
          size: 7,
          font: codes,
          color: labelColor,
        });
        if (code) subtotal++;
      }
    for (let x = 0; x <= tile.colCount; x++) {
      const global = tile.colStart - 1 + x;
      page.drawLine({
        start: { x: left + x * size, y: top },
        end: { x: left + x * size, y: top - tile.rowCount * size },
        thickness: global % 10 === 0 ? 0.8 : 0.25,
        color: rgb(0.56, 0.55, 0.6),
      });
      if (x < tile.colCount)
        page.drawText(String(global + 1), {
          x: left + x * size + 2,
          y: top + 8,
          size: 7,
          font: codes,
          color: ink,
        });
    }
    for (let y = 0; y <= tile.rowCount; y++) {
      const global = tile.rowStart - 1 + y;
      page.drawLine({
        start: { x: left, y: top - y * size },
        end: { x: left + tile.colCount * size, y: top - y * size },
        thickness: global % 10 === 0 ? 0.8 : 0.25,
        color: rgb(0.56, 0.55, 0.6),
      });
      if (y < tile.rowCount)
        page.drawText(String(global + 1), {
          x: MARGIN,
          y: top - (y + 0.65) * size,
          size: 7,
          font: codes,
          color: ink,
        });
    }
    text(
      page,
      `本分块 ${subtotal} 颗豆；全图共 ${pattern.total} 颗。`,
      MARGIN,
      95,
      10,
      purple,
    );
    text(
      page,
      `在全图中：第 ${Math.floor((tile.rowStart - 1) / rows) + 1} 行分块，第 ${Math.floor((tile.colStart - 1) / columns) + 1} 列分块。`,
      MARGIN,
      77,
      9,
      muted,
    );
  }
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawLine({
      start: { x: MARGIN, y: 53 },
      end: { x: PAGE[0] - MARGIN, y: 53 },
      thickness: 0.4,
      color: rgb(0.83, 0.81, 0.9),
    });
    text(page, "拼豆工作台 · 独立生成图纸", MARGIN, 36, 8, muted);
    text(
      page,
      `${i + 1} / ${pages.length}`,
      PAGE[0] - MARGIN - 30,
      36,
      8,
      muted,
    );
  });
  doc.setTitle(info.title || "拼豆设计图");
  doc.setCreator("拼豆工作台");
  await font.embed();
  return doc.save({ objectsPerTick: cooperative ? 1 : 50 });
}
