import { resolveDimensions } from "./dimensions.js";
import { rgbToLab, nearestColor } from "./color.js";
import { sample } from "./sampling.js";

function representatives(points, limit) {
  const boxes = [points];
  const measure = (box) => {
    const ranges = [0, 1, 2].map(
      (i) =>
        Math.max(...box.map((p) => p.lab[i])) -
        Math.min(...box.map((p) => p.lab[i])),
    );
    const axis = ranges.indexOf(Math.max(...ranges));
    return {
      axis,
      score: ranges[axis] * Math.sqrt(box.reduce((s, p) => s + p.count, 0)),
    };
  };
  while (boxes.length < limit) {
    let index = -1,
      score = -1,
      axis = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const m = measure(box);
      if (m.score > score) {
        score = m.score;
        index = i;
        axis = m.axis;
      }
    });
    if (index < 0) break;
    const box = boxes
      .splice(index, 1)[0]
      .sort((a, b) => a.lab[axis] - b.lab[axis]);
    const half = box.reduce((s, p) => s + p.count, 0) / 2;
    let sum = 0,
      cut = 1;
    for (let i = 0; i < box.length - 1; i++) {
      sum += box[i].count;
      cut = i + 1;
      if (sum >= half) break;
    }
    boxes.push(box.slice(0, cut), box.slice(cut));
  }
  return boxes.map((box) => {
    const total = box.reduce((s, p) => s + p.count, 0);
    return [0, 1, 2].map(
      (i) => box.reduce((s, p) => s + p.lab[i] * p.count, 0) / total,
    );
  });
}

function* convertSteps(image, settings, palette) {
  if (!image.data || image.data.length !== image.width * image.height * 4)
    throw new Error("图片像素数据损坏");
  if (!["pixel", "photo"].includes(settings.imageMode))
    throw new Error("图片处理模式无效");
  if (
    !Number.isInteger(settings.maxColors) ||
    settings.maxColors < 0 ||
    settings.maxColors > 291
  )
    throw new Error("颜色上限无效");
  const { width, height } = resolveDimensions(image, settings);
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = settings.keepAspect
    ? Math.max(1, Math.round(image.width * scale))
    : width;
  const drawHeight = settings.keepAspect
    ? Math.max(1, Math.round(image.height * scale))
    : height;
  const left = Math.floor((width - drawWidth) / 2),
    top = Math.floor((height - drawHeight) / 2);
  const keys = Array(width * height).fill(null),
    histogram = new Map();
  for (let y = 0; y < drawHeight; y++)
    for (let x = 0; x < drawWidth; x++) {
      if ((y * drawWidth + x) % 256 === 0) yield;
      const [r, g, b, a] = sample(
        image,
        x,
        y,
        drawWidth,
        drawHeight,
        settings.imageMode === "photo",
      );
      if (a < 128) continue;
      const rgb = [r, g, b].map((v) =>
          Math.round((v * a) / 255 + 255 * (1 - a / 255)),
        ),
        key = rgb.join(",");
      keys[(y + top) * width + x + left] = key;
      const existing = histogram.get(key);
      if (existing) existing.count++;
      else histogram.set(key, { rgb, lab: rgbToLab(rgb), count: 1 });
    }
  const colors = palette.colors.map((c) => ({ ...c, lab: rgbToLab(c.rgb) }));
  if (!colors.length) throw new Error("色卡不能为空");
  let available = colors;
  if (settings.maxColors && histogram.size > settings.maxColors) {
    const codes = new Set(
      representatives([...histogram.values()], settings.maxColors).map(
        (lab) => nearestColor(lab, colors).code,
      ),
    );
    available = colors.filter((c) => codes.has(c.code));
  }
  const mapping = new Map();
  let matched = 0;
  for (const [key, p] of histogram) {
    if (matched++ % 256 === 0) yield;
    mapping.set(key, nearestColor(p.lab, available).code);
  }
  const cells = keys.map((key) => (key === null ? null : mapping.get(key))),
    counts = new Map();
  for (const code of cells)
    if (code !== null) counts.set(code, (counts.get(code) || 0) + 1);
  const sorted = [...counts]
    .map(([code, count]) => ({ code, count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.code.localeCompare(b.code, "en", { numeric: true }),
    );
  return Object.freeze({
    width,
    height,
    cells: Object.freeze(cells),
    palette,
    counts: Object.freeze(sorted),
    total: sorted.reduce((s, c) => s + c.count, 0),
    settings: Object.freeze({ ...settings }),
  });
}

export function convertRgba(image, settings, palette) {
  const steps = convertSteps(image, settings, palette);
  let result;
  do {
    result = steps.next();
  } while (!result.done);
  return result.value;
}
export async function convertRgbaAsync(
  image,
  settings,
  palette,
  cancelled = () => false,
) {
  const steps = convertSteps(image, settings, palette);
  let result;
  do {
    if (cancelled()) return null;
    result = steps.next();
    if (!result.done) await new Promise((resolve) => setTimeout(resolve, 0));
  } while (!result.done);
  return result.value;
}
