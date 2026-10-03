# 第三方来源与许可

## MARD 公开色卡数据

- 项目：https://github.com/maxcleme/beadcolors
- 固定提交：`f97ff4283d03cef5cd7e1071a86f5892e0c0c61b`
- 源文件：`raw/mard.csv`（291 色）
- 原始 CSV SHA-256：`108A0118BC209E4A74FBFC2433C20A3B8AC6E8B91BE0BBD412A1636EE05FB12B`
- MIT 许可原文：`src/data/MARD-LICENSE.txt`

保持原色号与 RGB/HEX，基础色卡按 A–H、M 系列筛选，得到 221 色。公开数据不等同于厂商保证的精确实物颜色。CSV 的颜色名称在该数据源中与色号相同，不虚构中文官方色名。

## Noto Sans CJK SC

- 项目：https://github.com/notofonts/noto-cjk
- 源文件：`Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf`
- 下载日期：2026-10-02；本地文件固定在代码资产中，导出时不联网获取。
- 分发文件：`assets/fonts/NotoSansSC-Regular.ttf`，使用 FontTools 4.66.1 固定 `wght=400` 实例化；使用应用无需 Python。
- 分发文件 SHA-256：`87C44BD5391CA100010E104F58BD815D11866BB1784FD4213F18E5DCF8E00828`
- SIL Open Font License 1.1，许可原文：`assets/fonts/OFL.txt`。

PDF 嵌入完整字体，网页 UI 使用设备系统字体。字体源当时为 main，固定本地字节及哈希用于重现。

转换命令：`python -m fontTools.varLib.instancer NotoSansSC-VF.ttf wght=400 --output NotoSansSC-Regular.ttf --update-name`。使用 TrueType 是因为当前 pdf-lib/fontkit 对原 OpenType CFF 中文字体的子集输出无法通过 Poppler 渲染验证。

TrueType 子集也存在部分轮廓损坏，因此最终用 `scripts/prepare-font.py` 预压缩完整正常字重字体，并导出 Unicode 到原始 glyph ID 及字宽的映射。字体数据没有删除字形或改动设计，PDF 使用完整 FontFile2 和使用字符的 ToUnicode/W 映射。预压缩文件 SHA-256：`4C2A4179C9E11055345B2D21839F8D181158013DC92943ADE38955AD076CDDD8`。执行此开发脚本需要 FontTools；使用和构建应用不需要 Python。

## 运行库

`@heybox/hb-sdk` 0.8.4（ISC）、`pdf-lib` 1.17.1（MIT）、`@pdf-lib/fontkit` 1.1.1（MIT），依赖由 package-lock.json 固定。Vite 和 Playwright 仅用于构建及测试；各包完整许可证保留于安装包内。

SDK CLI 的传递依赖 sharp 从 0.34.5 覆盖为 0.35.4，修复已知上游图像库漏洞：[维护者安全公告](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c)。浏览器图片转换不使用 sharp；覆盖后的 SDK 构建和审计单独验证。
