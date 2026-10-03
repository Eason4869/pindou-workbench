export function resolveDimensions(image, settings) {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 1 ||
    image.height < 1
  )
    throw new Error("图片尺寸无效");
  if (settings.sizeMode === "auto") {
    if (
      settings.imageMode === "pixel" &&
      image.width <= 200 &&
      image.height <= 200
    )
      return { width: image.width, height: image.height };
    const scale = 64 / Math.max(image.width, image.height);
    return {
      width: Math.max(1, Math.round(image.width * scale)),
      height: Math.max(1, Math.round(image.height * scale)),
    };
  }
  const { width, height } = settings;
  if (![width, height].every((n) => Number.isInteger(n) && n >= 1 && n <= 200))
    throw new Error("尺寸必须是 1–200 的整数");
  return { width, height };
}
