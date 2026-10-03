import { drawChart } from "../render/chart.js";
export async function createPng(p, info) {
  const cell = Math.min(24, Math.floor(3600 / Math.max(p.width, p.height))),
    pad = 44,
    width = Math.max(680, p.width * cell + pad * 2),
    legendTop = 132 + p.height * cell + 56;
  const columns = Math.min(6, Math.floor((width - pad * 2) / 145)),
    rows = Math.ceil(p.counts.length / columns),
    height = legendTop + rows * 30 + 100,
    canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#7562CA";
  ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
  let title = info.title || "我的拼豆作品";
  while (ctx.measureText(title).width > width - pad * 2)
    title = title.slice(0, -2) + "…";
  ctx.fillText(title, pad, 43);
  ctx.fillStyle = "#686272";
  ctx.font = '13px "Microsoft YaHei", sans-serif';
  ctx.fillText(
    `${p.width} × ${p.height} 格 · ${p.total} 颗 · ${p.counts.length} 色 · MARD ${p.palette.version}`,
    pad,
    72,
  );
  drawChart(ctx, p, { cell, x: pad, y: 132 });
  ctx.fillStyle = "#27243B";
  ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
  ctx.fillText("色号与实际用量", pad, legendTop - 20);
  const colors = new Map(p.palette.colors.map((c) => [c.code, c]));
  p.counts.forEach((item, i) => {
    const x = pad + ((i % columns) * (width - pad * 2)) / columns,
      y = legendTop + Math.floor(i / columns) * 30,
      c = colors.get(item.code);
    ctx.fillStyle = c.hex;
    ctx.fillRect(x, y, 19, 19);
    ctx.strokeStyle = "#CAC4D2";
    ctx.strokeRect(x, y, 19, 19);
    ctx.fillStyle = "#27243B";
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.fillText(`${c.code}  ·  ${item.count} 颗`, x + 28, y + 14);
  });
  ctx.fillStyle = "#787181";
  ctx.font = '12px "Microsoft YaHei", sans-serif';
  ctx.fillText(
    "空格无需摆豆。屏幕色值仅供参考；本图不是底板的实际打印比例。",
    pad,
    height - 47,
  );
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("PNG 导出失败，请减少设计图尺寸");
  return blob;
}
