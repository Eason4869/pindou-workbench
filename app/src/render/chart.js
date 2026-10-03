import { textColor } from "../core/color.js";
export function drawChart(
  ctx,
  p,
  { cell = 24, x = 32, y = 32, labels = true, grid = true } = {},
) {
  const colors = new Map(p.palette.colors.map((c) => [c.code, c]));
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, p.width * cell, p.height * cell);
  for (let row = 0; row < p.height; row++)
    for (let col = 0; col < p.width; col++) {
      const code = p.cells[row * p.width + col],
        color = colors.get(code),
        px = x + col * cell,
        py = y + row * cell;
      if (color) {
        ctx.fillStyle = color.hex;
        ctx.fillRect(px, py, cell, cell);
      }
      if (labels && cell >= 12) {
        ctx.fillStyle = color ? textColor(color.rgb) : "#B6B3BE";
        ctx.font = `${Math.max(7, Math.min(10, cell / 3))}px Arial`;
        ctx.fillText(code || "·", px + cell / 2, py + cell / 2);
      }
    }
  if (grid) {
    for (let col = 0; col <= p.width; col++) {
      ctx.beginPath();
      ctx.lineWidth = col % 10 === 0 ? 1.3 : 0.5;
      ctx.strokeStyle = col % 10 === 0 ? "#696275" : "#BBB6C5";
      ctx.moveTo(x + col * cell, y);
      ctx.lineTo(x + col * cell, y + p.height * cell);
      ctx.stroke();
    }
    for (let row = 0; row <= p.height; row++) {
      ctx.beginPath();
      ctx.lineWidth = row % 10 === 0 ? 1.3 : 0.5;
      ctx.strokeStyle = row % 10 === 0 ? "#696275" : "#BBB6C5";
      ctx.moveTo(x, y + row * cell);
      ctx.lineTo(x + p.width * cell, y + row * cell);
      ctx.stroke();
    }
    ctx.fillStyle = "#777080";
    ctx.font = "9px Arial";
    for (let i = 0; i < p.width; i++)
      if (cell >= 18 || i === 0 || (i + 1) % 10 === 0 || i === p.width - 1)
        ctx.fillText(i + 1, x + (i + 0.5) * cell, y - 12);
    for (let i = 0; i < p.height; i++)
      if (cell >= 18 || i === 0 || (i + 1) % 10 === 0 || i === p.height - 1)
        ctx.fillText(i + 1, x - 16, y + (i + 0.5) * cell);
  }
  ctx.restore();
}
