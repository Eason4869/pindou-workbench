export function sample(image, x, y, w, h, smooth) {
  if (!smooth) {
    const sx = Math.min(
      image.width - 1,
      Math.floor(((x + 0.5) * image.width) / w),
    );
    const sy = Math.min(
      image.height - 1,
      Math.floor(((y + 0.5) * image.height) / h),
    );
    return Array.from(
      image.data.slice(
        (sy * image.width + sx) * 4,
        (sy * image.width + sx) * 4 + 4,
      ),
    );
  }
  const x0 = (x * image.width) / w,
    x1 = ((x + 1) * image.width) / w,
    y0 = (y * image.height) / h,
    y1 = ((y + 1) * image.height) / h;
  const sum = [0, 0, 0];
  let alpha = 0,
    area = 0;
  for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++)
    for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
      const weight =
        (Math.min(sx + 1, x1) - Math.max(sx, x0)) *
        (Math.min(sy + 1, y1) - Math.max(sy, y0));
      const i = (sy * image.width + sx) * 4,
        a = image.data[i + 3] / 255;
      for (let c = 0; c < 3; c++) sum[c] += image.data[i + c] * a * weight;
      alpha += a * weight;
      area += weight;
    }
  return [
    ...sum.map((v) => (alpha ? v / alpha : 0)),
    Math.round((alpha / area) * 255),
  ];
}
