export function rgbToLab(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  const f = (n) =>
    n > 216 / 24389 ? Math.cbrt(n) : ((24389 / 27) * n + 16) / 116;
  const x = f((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047);
  const y = f(r * 0.2126729 + g * 0.7151522 + b * 0.072175);
  const z = f((r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function nearestColor(lab, colors) {
  let best = colors[0],
    distance = Infinity;
  for (const c of colors) {
    const d = c.lab.reduce((s, v, i) => s + (v - lab[i]) ** 2, 0);
    if (d < distance) {
      best = c;
      distance = d;
    }
  }
  return best;
}
export function textColor(rgb) {
  return rgbToLab(rgb)[0] < 55 ? "#FFFFFF" : "#27243B";
}
