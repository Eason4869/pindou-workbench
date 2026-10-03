import data from "./data/mard.json" with { type: "json" };

export function validatePalette(palette) {
  if (!palette || !Array.isArray(palette.colors) || !palette.colors.length)
    throw new Error("色卡不能为空");
  const codes = new Set();
  for (const color of palette.colors) {
    if (!/^[A-Za-z]+\d*$/.test(color.code)) throw new Error("色卡编号格式错误");
    if (codes.has(color.code)) throw new Error("色卡编号重复");
    codes.add(color.code);
    if (
      !Array.isArray(color.rgb) ||
      color.rgb.length !== 3 ||
      color.rgb.some((v) => !Number.isInteger(v) || v < 0 || v > 255)
    )
      throw new Error("色卡 RGB 数据错误");
    if (!/^#[\da-f]{6}$/i.test(color.hex)) throw new Error("色卡 HEX 数据错误");
  }
}

const colors = data.colors.map((c) =>
  Object.freeze({ ...c, rgb: Object.freeze(c.rgb) }),
);
const palettes = new Map(
  ["mard-basic", "mard-full"].map((id) => {
    const palette = {
      id,
      brand: "MARD",
      version: `${id === "mard-basic" ? "221" : "291"} 色 · ${data.commit.slice(0, 7)}`,
      source: `https://github.com/maxcleme/beadcolors/tree/${data.commit}`,
      colors: Object.freeze(
        id === "mard-basic"
          ? colors.filter((c) => /^[A-HM]\d+$/.test(c.code))
          : colors,
      ),
    };
    validatePalette(palette);
    return [id, Object.freeze(palette)];
  }),
);
export function getPalette(id) {
  const palette = palettes.get(id);
  if (!palette) throw new Error("未知色卡");
  return palette;
}
