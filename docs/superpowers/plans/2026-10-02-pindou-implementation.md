# 拼豆图纸工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user chooses delegation. Track completed steps with checkboxes.

**Goal:** 实现本地图片转换、MARD 图纸与用量统计，提供 PNG、PDF、CSV 导出和小黑盒适配。

**Architecture:** 用官方模板在空的 `app/` 子目录创建应用，保留外层已批准的文档。转换核心产生统一的结果快照；Canvas、PDF 与 CSV 消费同一快照。浏览器和小黑盒文件访问分开适配，转换放在 Worker 中。

**Tech Stack:** Vanilla JavaScript ES modules、Vite、Canvas 2D、`@heybox/hb-sdk` 0.8.4、`pdf-lib` 1.17.1、`@pdf-lib/fontkit` 1.1.1、Noto Sans CJK SC、Node.js 内置测试工具、`@playwright/test` 1.63.0。上述 npm 版本在 2026-10-02 已只读核对，安装时固定版本并生成锁文件。

**Spec:** [已批准的设计规格](../specs/2026-10-02-pindou-design.md)。用户已批准并选择直接实施。实现与验证结果见 `docs/verification/`。

**执行时确认的约束：** 官方 CSP 禁止 Worker、fetch，官方 Mock 禁止 iframe 下载。网页版保留 Worker 与真实下载；客户端采用分段计算和字体脚本加载，Mock 明确说明下载限制。字体子集发生损坏，改用预压缩完整 TrueType 字体，并增加轮廓一致性及独立渲染检查。相应取舍记录在执行账本。

## Global Constraints

- Node.js 必须满足官方要求的 22.20.0 或更高版本；不额外引入 UI 框架。
- 单文件上限 8 MiB；解码图片最大 1600 万像素且任意边不超过 8192 像素。
- 自定义宽高均为 1–200 的整数；孔距范围 1–10 mm，为可选估算项。
- 预设为 29×29、58×58、32×32、64×64、96×96；默认等比居中留空。
- 自动尺寸：两边均不超过 200 的像素模式原图保留原生尺寸；其余输入长边 64 格，短边四舍五入且至少 1 格。
- alpha 小于 128 为空格；其他半透明格与白色合成后匹配。
- 颜色上限为不限制、8、16、24、32、48，默认 24；无抖动。
- 从 1 开始的全局行列坐标；每 10 格加粗线；深浅底色切换编号文字颜色。
- PDF 默认 A4 竖版，约 15 mm 页边距，格子至少 5 mm，色号至少 7 pt，中文字体内嵌。
- 首版 MARD，预览与导出标明屏幕参考色；PDF 不照抄参考文件。
- 所有导出共用同一快照；不计透明空格，不添加备料余量。
- 运行时本地处理；不声明 network、companion 或 userInfo；不提交审核或公开发布。
- 只改本项目文件，不改上级仓库其他项目。Git 作者未配置，暂不提交，不伪造作者或修改全局设置；文件与验证记录保留在工作区。

## Review Focus

1. 全透明图、1×1 图及极窄图：允许零豆数，短边至少一格，不出现除零或空数组崩溃；任务 2、4 验证。
2. 200×200 多色图：颜色上限和统计准确，页面仍可交互，PDF 最后一块不漏格；任务 2、4、6 验证。
3. 长色号和中文长作品名：格内色号完整可读，标题换行或截短，不挤出页边；任务 3、4 验证。
4. 连续换图、改设置和旧 Worker 回包：旧任务不覆盖最新结果，失败保留前一份快照；任务 5、6 验证。
5. 原生保存取消、缺能力、重名：分别反馈，目录授权由新的用户点击取得，未写完不提示成功；任务 5 验证。

## 文件职责与共享接口

所有应用路径相对工作区根，运行测试命令时工作目录为 `app/`。

| 文件 | 职责 |
| --- | --- |
| `app/src/palettes.js`、`app/src/data/mard.json` | 验证并提供本地 MARD 基础与扩展色卡 |
| `app/src/core/dimensions.js`、`color.js`、`convert.js` | 尺寸、Lab 配色、颜色归并及最终统计 |
| `app/src/core/convert.worker.js` | 转换 Worker 与请求编号协议 |
| `app/src/render/chart.js`、`png.js` | 图纸 Canvas、完整 PNG 排版 |
| `app/src/export/layout.js`、`pdf.js`、`csv.js` | PDF 分块和分页、PDF、CSV |
| `app/src/platform/browser.js`、`heybox.js` | 浏览器、SDK 文件适配 |
| `app/src/image.js`、`state.js`、`main.js`、`styles.css` | 解码、安全状态转换、工作台交互及样式 |
| `app/assets/fonts/NotoSansSC-Regular.ttf、.deflate、-metrics.json` | 打包的中文字体，保留 OFL 许可 |
| `app/tests/*.test.js`、`app/e2e/workbench.spec.js` | 纯算法／文件测试与真实浏览器验收 |
| `app/README.md`、`app/THIRD_PARTY_NOTICES.md` | 使用与真机验收说明、数据／字体许可及来源版本 |

数据接口使用 JSDoc 记录：

- `ImagePixels = {width:number, height:number, data:Uint8ClampedArray}`，数据长度恰为 `width*height*4`。
- `Color = {code:string, name:string, hex:string, rgb:[number,number,number]}`。
- `Palette = {id:string, brand:string, version:string, source:string, colors:Color[]}`。
- `Settings = {imageMode:'pixel'|'photo', sizeMode:'auto'|'preset'|'custom', width:number, height:number, keepAspect:boolean, maxColors:number, pitchMm:number|null}`；`maxColors=0` 表示不限制。
- `Pattern = {width:number, height:number, cells:(string|null)[], palette:Palette, counts:{code:string,count:number}[], total:number, settings:Settings}`；按行顺序存储，统计用量降序。
- `ExportInfo = {title:string}`，作品名不改变结果快照或数量。
- `Tile = {colStart:number,rowStart:number,colCount:number,rowCount:number}`，起点从 1 开始。

### Task 1：官方模板、色卡和依赖

**Files:** `app/package.json`、`app/vite.config.js`、`app/src/palettes.js`、`app/src/data/mard.json`、`app/tests/palettes.test.js`、`app/THIRD_PARTY_NOTICES.md`、`app/.gitignore`。

**Interfaces:** 产生 `getPalette(id:'mard-basic'|'mard-full'):Palette`、`validatePalette(palette:Palette):void`；非法编号、重复编号和非法 RGB 抛出可解释错误。

- [x] 在执行隔离检查后运行 `npx @heybox/hb-sdk@0.8.4 create app`。此目录必须不存在或为空；不得清空外层文档。安装模板依赖，并固定 PDF、fontkit 和 Playwright 版本。
- [x] 配置 `test` 为 `node --test tests/*.test.js`，`test:e2e` 为 `playwright test`，`dev:web` 为浏览器版 Vite 入口；保留官方 `dev` 和 `build`。使用 `category:tool`、名称“拼豆工作台”和 filesystem 权限，注册无参 Manifest 插件。
- [x] 安装 SDK 官方 Agent Skill，读取实际安装的 `SKILL.md` 和在线 `llms.txt`，运行 doctor；失败时只修复当前项目的缺失项，不覆盖被用户改过的技能。
- [x] 先写色卡测试：全色 291、A–H 与 M 系列基础色 221、唯一编号、RGB 整数 0–255、重复编号和损坏数据拒绝。执行 `node --test tests/palettes.test.js`，确认未实现 API 导致失败。
- [x] 从 `maxcleme/beadcolors` 固定提交的 `raw/mard.csv` 转为 JSON；保留 MIT 许可、提交 SHA 与源文件 SHA-256。按系列划分基础色而非数组截取，实现上述接口。
- [x] 重跑色卡测试与 `npm run hb-sdk -- doctor`；色卡通过、项目技能 OK，全局技能缺失见最终验证记录；保存安装版本和诊断记录。

### Task 2：转换核心与 Worker

**Files:** `app/src/core/dimensions.js`、`color.js`、`convert.js`、`convert.worker.js`、`app/tests/convert.test.js`。

**Interfaces:** 消费 `ImagePixels`、`Settings` 和任务 1 的 `Palette`。产生 `resolveDimensions(image,settings):{width,height}`、`rgbToLab(rgb):number[]`、`convertRgba(image,settings,palette):Pattern`。Worker 收到 `{requestId,image,settings,palette}`，回传 `{requestId,pattern}` 或 `{requestId,error}`。

- [x] 先写尺寸和采样测试：像素 17×13 自动保留；照片 1000×500 自动为 64×32；极窄输入为 64×1；非法宽高拒绝；等比留空与拉伸分别有预期格子布局。
- [x] 写计数测试：2×2 三格完全不透明、一格透明得到总数 3；alpha 127 不计数、128 与白色合成；全透明 1×1 得到零颜色与零数量。命令 `node --test tests/convert.test.js` 必须先失败。
- [x] 实现尺寸验证、最近邻／面积加权平滑采样、透明规则及 CIELAB 距离匹配。限制用色采用按样本频数加权的 Lab 中位切分，代表色映射到豆子色卡，再从所选豆色匹配原样本。
- [x] 加入“不限制”和每个颜色上限的测试；对确定性多色夹具断言 `counts.length <= maxColors`、全部编号在色卡中、数量和等于非空格数。加入相同输入结果稳定和 200×200 测试。
- [x] 将纯转换放入 Worker，错误保留请求编号，传递字节数组副本或明确转移所有权，不能意外耗尽用于后续生成的原图像素。
- [x] 运行 `npm test`，要求所有算法和色卡测试通过。

### Task 3：Canvas 图纸、PNG 和 CSV

**Files:** `app/src/render/chart.js`、`png.js`、`app/src/export/csv.js`、`app/src/export/names.js`、`app/tests/csv.test.js`、`app/e2e/render.spec.js`。

**Interfaces:** 消费 `Pattern`、`ExportInfo`。产生 `drawChart(canvas,pattern,{cellSize,grid,labels,coordinates}):void`、`createPng(pattern,info):Promise<Blob>`、`createCsv(pattern):string`、`safeFilename(title):string`。

- [x] 先写 CSV 的 BOM、字段转义、实际数量和安全文件名测试；作品名含路径字符时不得形成路径。写真实浏览器渲染测试，检查 1×1、长色号和 200×200 Canvas 可产生非空 PNG。分别运行 Node 与 Playwright 对应测试，确认功能缺失的失败。
- [x] 实现正方形格子、1 基坐标、细线／十格粗线、空格标识和文字对比度。编号显示与隐藏不改变 Pattern。
- [x] PNG 排版包含标题、尺寸、MARD 版本、总量及清单，最长边不超过 8192 px、总面积不超过 3200 万像素；预算不足时缩小格子而不丢行列。Canvas 返回 null Blob 或编码失败时抛错。
- [x] CSV 由 `counts` 和当前色卡生成，名称含逗号、换行和引号时正确转义；清单颜色与计数逐一对应。
- [x] 重跑本任务测试并保存深浅格、透明区和长色号的渲染截图，检查可读性。

### Task 4：真正的 PDF 文件

**Files:** `app/src/export/layout.js`、`pdf.js`、`app/assets/fonts/NotoSansSC-Regular.ttf、.deflate、-metrics.json`、`app/assets/fonts/OFL.txt`、`app/tests/pdf.test.js`。

**Interfaces:** 消费 `Pattern`、`ExportInfo`。产生 `planTiles(width,height,{columns,rows}):Tile[]`、`createPdf(pattern,info,fontBytes:Uint8Array):Promise<Uint8Array>`；接口不依赖浏览器 DOM，便于直接重开文件验证。

- [x] 先写分块测试，至少包括 1×1、35×47、200×200：每个格子恰覆盖一次、边缘范围正确、无越界。写 PDF 测试：合法 PDF 字节可用 `PDFDocument.load` 重开；单色、零色和 291 色清单均有图纸与适当续页；应先失败。
- [x] 下载官方 Noto Sans SC TrueType 字体和 `Sans/LICENSE`，派生正常字重及预压缩文件，记录来源／SHA；随应用打包，不在导出时访问 CDN。中文与拉丁字体度量用于标题折行和色号格宽计算。
- [x] 用 pdf-lib 实现独立排版和完整字体内嵌（字体取舍见最终记录）：A4 总览、续页用量表、矢量分块图、全局坐标、页码、覆盖范围和分块用量。按最长色号决定格宽，文字不少于 7 pt，格边不少于 5 mm。
- [x] 检查零色清单有明确“无须摆豆”的文字；每个分块数量和等于全图数量；长中文标题完整换行或明确截短。
- [x] 运行 `node --test tests/exports.test.js tests/pdf-render.test.js tests/font-glyphs.test.js`；把单页、多页、全色清单、中文长标题夹具输出至 `app/test-results/pdf/`。
- [x] 用 Poppler 重开并渲染全部验证 PDF 页；逐页检查中文、色号、网格、页码、分页和清单续页。保存检查记录，修复缺字、重叠或裁切后再渲染。

### Task 5：工作台交互与平台适配

**Files:** `app/index.html`、`app/src/main.js`、`styles.css`、`image.js`、`state.js`、`platform/browser.js`、`platform/heybox.js`、`app/tests/state.test.js`、`app/tests/platform.test.js`、`app/e2e/workbench.spec.js`、`app/assets/icon.png`、`app/assets/cover.png`。

**Interfaces:** 消费上述转换和导出接口。产生 `decodeImage(file:Blob):Promise<ImagePixels>`、`createBrowserAdapter():Adapter`、`createHeyboxAdapter(sdk):Adapter`。Adapter 暴露 `pickImageFromClick():Promise<Blob|null>`、`saveFromClick(bytes,name,mime):Promise<{status:'saved'|'download-started'|'cancelled'|'needs-directory'}>`、`saveToDirectoryFromClick(bytes,name):Promise<{status:'saved'|'cancelled'}>`。浏览器下载只报告已发起，不能报告磁盘写入成功。

- [x] 先写状态测试：旧 requestId 不能覆盖最新快照、解码／导出失败保留已有结果、改设置置为待生成。写平台测试：取消无报错，缺能力返回需选目录，同名及授权失效提供明确错误，文件写入未完成时不返回 saved。
- [x] 浏览器使用原生文件输入和 Blob 下载；SDK 接入只从公开入口导入并订阅握手状态。原生 picker 在按钮点击中直接调用，不先等待握手。
- [x] 实现保存优先 saveFile，缺能力时显示“选择保存文件夹”，在新的点击中请求 readwrite 目录。用针对协议的最小 SDK 测试替身覆盖难以在本机真机自动化的错误边界；不把替身结果标为真机验收。
- [x] 完成图片限制、对象 URL 释放、任务编号和 Worker 交互；实现原创像素示例、尺寸／颜色／孔距设置、生成、缩放、网格／色号切换、清单和三种导出。
- [x] 应用已批准的紫色工作台视觉；桌面三栏，390 px 窄屏顺序布局，所有控件有可见标签、键盘焦点和合理禁用状态。生成和导出期间阻止重复提交。
- [x] 从原创示例制作 200×200 图标和 510×272 封面；保留实际页面能力说明。重跑 Node 和浏览器测试，检查布局、错误反馈及旧结果保留。

### Task 6：集成验证与交付

**Files:** `app/playwright.config.js`、`app/e2e/workbench.spec.js`、`app/README.md`、`docs/verification/2026-10-02-pindou.md`。

**Interfaces:** 验证整条已实现用户流程，不新增业务接口。

- [x] 测试前先记录实际本地预览 URL。启动服务若会打开浏览器，提前在聊天说明；普通网页入口与官方 Mock 入口分别提供。
- [x] 真正导入 PNG、JPEG、WebP，覆盖透明输入、损坏文件、非法尺寸、照片模式、预设／自定义／自动尺寸、最大 200×200、连续换图；新检查在缺失行为时先失败，再修复。
- [x] 捕获三种真实下载：PNG 可解码，PDF 可重开，CSV 有正确数量；与网页当前统计核对。下载期间改设置时，不得混用结果。检查页面无未处理异常。
- [x] 运行 `npm test`、`npm run test:e2e`、`npm run build`、`npm run hb-sdk -- doctor`。通过后不无理由重复扩大测试。
- [x] 检查生产构建内字体、Worker、图片和色卡使用相对资源路径；不能依赖开发端口、CDN 或运行时联网获取色卡。核对 Manifest 名称、类别、权限及产物预算。
- [x] 截图审阅桌面和窄屏工作台；进行最终代码质量检查与全页 PDF 视觉复核，修复确认的问题并重跑受影响检查。
- [x] README 写明安装、两个预览入口、导出操作、孔距估算、屏幕色差和真机验证步骤；交付可用入口、验证结果和未做的真机项。保持服务供用户体验，不自动绑定远端、不部署。

## 执行方式与自检

建议由当前助手在本聊天直接实施，按任务顺序完成，最后集中检查；本项目模块共享同一数据接口，顺序实施便于保持计数和输出一致。用户也可选择分任务委派子代理并逐任务审阅；选择后才采用该方式。

覆盖自检：规格的输入、尺寸、配色、三种导出、平台、响应式、性能和错误要求均有任务；五项 Review Focus 均有对应检查；共享接口名称一致；PDF 文件验证与真机验证区分明确。Git 作者缺失不作为阻止实现的条件。

**执行完成：** 六个任务全部完成；上列复选框表示对应工作已执行，执行中确认的约束与修正以开头说明及 `docs/verification/2026-10-02-pindou.md` 为准。doctor 的全局技能项不是通过状态，客户端真机验证仍为发布前工作。
