export function safeFilename(title) {
  let name = String(title || "拼豆图纸")
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, 80);
  if (!name) name = "拼豆图纸";
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))
    name = "图纸_" + name;
  return name;
}
