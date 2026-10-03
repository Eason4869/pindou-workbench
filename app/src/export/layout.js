export function planTiles(width, height, { columns, rows }) {
  if (
    ![width, height, columns, rows].every((v) => Number.isInteger(v) && v > 0)
  )
    throw new Error("分页尺寸无效");
  const tiles = [];
  for (let y = 1; y <= height; y += rows)
    for (let x = 1; x <= width; x += columns)
      tiles.push({
        colStart: x,
        rowStart: y,
        colCount: Math.min(columns, width - x + 1),
        rowCount: Math.min(rows, height - y + 1),
      });
  return tiles;
}
