const escape = (v) => {
  const s = String(v ?? "");
  return /[,"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
export function createCsv(pattern) {
  const colors = new Map(pattern.palette.colors.map((c) => [c.code, c]));
  const rows = [
    ["品牌", "色卡版本", "色号", "颜色名称", "HEX", "实际数量"],
    ...pattern.counts.map((c) => [
      pattern.palette.brand,
      pattern.palette.version,
      c.code,
      colors.get(c.code).name,
      colors.get(c.code).hex,
      c.count,
    ]),
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(escape).join(",")).join("\r\n") +
    "\r\n"
  );
}
