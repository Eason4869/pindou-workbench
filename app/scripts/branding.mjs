import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { BRAND } from "../src/brand.js";
import { getPalette } from "../src/palettes.js";

// Original bead flower: vector master and platform-sized raster assets.
const app = fileURLToPath(new URL("../", import.meta.url));
const rows = ["...P...", "..PCP..", ".PCYCP.", "..PCP..", "...GGG.", ".GGG...", "...G..."];
const colors = { P: "#7562CA", C: "#D68B93", Y: "#F4D28D", G: "#4E846D" };
const beads = rows.flatMap((row, y) => [...row].flatMap((color, x) => color === "." ? [] : [{ x, y, color }]));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="42" fill="#F3EFFB"/>${beads.map(({x,y,color}) =>
  `<circle cx="${37+x*21}" cy="${37+y*21}" r="9.2" fill="${colors[color]}"/><circle cx="${37+x*21}" cy="${37+y*21}" r="3.1" fill="#F3EFFB"/>`).join("")}</svg>\n`;
await mkdir(resolve(app, "assets"), { recursive: true });
await writeFile(resolve(app, "assets/logo.svg"), svg);
const palette = getPalette("mard-basic");
const codes = { P: "D20", C: "F20", Y: "A11", G: "B25" };
const diagramColors = Object.fromEntries(Object.entries(codes).map(([key, code]) => [key, palette.colors.find(c=>c.code===code)]));
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  await page.setContent('<html lang="zh-CN"><body></body></html>');
  const images = await page.evaluate(async ({svg, beads, diagramColors, brand}) => {
    const logo = new Image();
    logo.src = "data:image/svg+xml;base64," + btoa(svg);
    await logo.decode();
    const icon = document.createElement("canvas"); icon.width=200; icon.height=200;
    icon.getContext("2d").drawImage(logo,0,0);
    const cover = document.createElement("canvas"); cover.width=510; cover.height=272;
    const c=cover.getContext("2d");
    c.fillStyle="#F3EFFB"; c.fillRect(0,0,510,272);
    c.drawImage(logo,23,24,58,58);
    c.fillStyle="#27243B"; c.font='bold 30px "Microsoft YaHei"'; c.fillText(brand.name,25,124);
    c.fillStyle="#766C89"; c.font='14px "Microsoft YaHei"'; c.fillText("从图片，到你的拼豆设计图",25,154);
    c.font='12px "Microsoft YaHei"'; c.fillText("MARD 色号 / 用量清单 / PDF",25,182);
    c.fillStyle="#7562CA"; c.font='12px "Microsoft YaHei"'; c.fillText(brand.author+"  ·  v"+brand.version,25,235);
    c.fillStyle="#FFFFFF"; c.beginPath(); c.roundRect(282,21,207,230,12); c.fill();
    c.fillStyle="#7562CA"; c.font='12px "Microsoft YaHei"'; c.fillText("每一格，都有对应的色号",298,47);
    const ox=299,oy=65,cell=24;
    for(const bead of beads){
      const color=diagramColors[bead.color];
      c.fillStyle=color.hex; c.fillRect(ox+bead.x*cell,oy+bead.y*cell,cell,cell);
      c.fillStyle=bead.color==='P' || bead.color==='G'?'#FFFFFF':'#27243B';
      c.font='9px "Microsoft YaHei"'; c.textAlign='center'; c.textBaseline='middle';
      c.fillText(color.code,ox+(bead.x+.5)*cell,oy+(bead.y+.5)*cell);
    }
    c.strokeStyle="#D5CCE5"; c.lineWidth=.8;
    for(let n=0;n<=7;n++){c.beginPath();c.moveTo(ox+n*cell,oy);c.lineTo(ox+n*cell,oy+7*cell);c.stroke();c.beginPath();c.moveTo(ox,oy+n*cell);c.lineTo(ox+7*cell,oy+n*cell);c.stroke();}
    return {icon:icon.toDataURL().split(',')[1],cover:cover.toDataURL().split(',')[1]};
  }, {svg,beads,diagramColors,brand:BRAND});
  for(const name of ["icon","cover"])await writeFile(resolve(app,`assets/${name}.png`),Buffer.from(images[name],"base64"));
} finally { await browser.close(); }
console.log(`Brand assets ready: ${BRAND.name}, ${BRAND.version}, ${BRAND.author}; SVG + 200×200 icon + 510×272 cover.`);
