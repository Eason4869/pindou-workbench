import dataUri from "../../assets/fonts/NotoSansSC-Regular.deflate?inline";
// SDK CSP allows bundled scripts, but blocks fetch even for a local font URL.
// This lazy module carries the intact compressed font as a Vite data URI.
export async function loadFontBytes() {
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1),
    padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((base64.length * 3) / 4 - padding);
  let offset = 0;
  for (let i = 0; i < base64.length; i += 131072) {
    const raw = atob(base64.slice(i, i + 131072));
    for (let j = 0; j < raw.length; j++) bytes[offset++] = raw.charCodeAt(j);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return bytes;
}
