export async function readImage(file) {
  if (file.size > 8 * 1024 * 1024) throw new Error("图片超过 8 MiB，请先缩小");
  if (!/\.(png|jpe?g|webp)$/i.test(file.name))
    throw new Error("请选择 PNG、JPEG 或 WebP 图片");
  const url = URL.createObjectURL(file),
    image = new Image();
  try {
    image.src = url;
    await image.decode();
    const width = image.naturalWidth,
      height = image.naturalHeight;
    if (width > 8192 || height > 8192 || width * height > 16 * 1024 * 1024)
      throw new Error("图片像素过大，请缩小至 8192 边长、1600 万像素以内");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    return {
      width,
      height,
      data: ctx.getImageData(0, 0, width, height).data,
      preview: url,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw new Error(
      error.message.includes("像素过大")
        ? error.message
        : "无法读取图片，请检查文件是否完整",
    );
  }
}
export function makeDemo() {
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 28;
  const c = canvas.getContext("2d");
  const rect = (x, y, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  // Original windowsill plant, independent of reference artwork.
  rect(11, 6, 2, 15, "#54775D");
  rect(6, 9, 6, 3, "#789D69");
  rect(4, 7, 5, 3, "#93B57F");
  rect(13, 12, 6, 3, "#789D69");
  rect(16, 10, 4, 3, "#93B57F");
  rect(8, 3, 8, 4, "#D68B93");
  rect(10, 1, 4, 8, "#D68B93");
  rect(10, 3, 4, 4, "#F4D28D");
  rect(6, 19, 12, 3, "#B18378");
  rect(7, 22, 10, 2, "#C29C87");
  rect(8, 24, 8, 2, "#C29C87");
  rect(5, 26, 14, 1, "#DBCFB6");
  return {
    width: 24,
    height: 28,
    data: c.getImageData(0, 0, 24, 28).data,
    preview: canvas.toDataURL(),
  };
}
