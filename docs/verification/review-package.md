# Final review package

Review the actual files under `app/`, not a commit diff. All are new implementation in the scoped project. Parent repository has unrelated work; read-only review, no Git mutations and no subagents. Branch `codex/pindou-workbench`; no commits because author identity was not configured. No release/merge requested.

Spec: `docs/superpowers/specs/2026-10-02-pindou-design.md`.
Plan: `docs/superpowers/plans/2026-10-02-pindou-implementation.md`.
Decisions and RED→GREEN evidence: `docs/verification/progress.md` (all Ruling lines).

Application: PNG/JPEG/WebP import, MARD 221/291 palettes, pixel/photo sampling, automatic/preset/custom1–200 grid, capped colors, transparent cells, same immutable result for preview/PNG/CSV/PDF, worker request IDs, original plant demo, web/SDK adapters, responsive workbench.

Verification so far: Node 19/19 plus new independent Poppler font regression1/1; four real Edge E2E pass including real downloads and 200×200; SDK build passes after sharp security override, prod npm audit zero findings. Final suite/build and visual inspection run concurrently with your read-only review. CFF font subset incompatibility was already reproduced and corrected to local normal-weight TrueType. Files in test-results are transient and may be overwritten by checks.

Review Focus (verbatim):

1. 全透明图、1×1 图及极窄图：允许零豆数，短边至少一格，不出现除零或空数组崩溃；任务 2、4 验证。
2. 200×200 多色图：颜色上限和统计准确，页面仍可交互，PDF 最后一块不漏格；任务 2、4、6 验证。
3. 长色号和中文长作品名：格内色号完整可读，标题换行或截短，不挤出页边；任务 3、4 验证。
4. 连续换图、改设置和旧 Worker 回包：旧任务不覆盖最新结果，失败保留前一份快照；任务 5、6 验证。
5. 原生保存取消、缺能力、重名：分别反馈，目录授权由新的用户点击取得，未写完不提示成功；任务 5 验证。

Check correctness, boundary handling, resource bounds, output consistency, native click activation and truthful save statuses, no image upload, and maintenance/security. Grade silent-spec edge cases by reasonable user impact. Return file:line findings Critical/Important/Minor, concise strengths, verdict, and an explicit Declined to judge list (empty if none). Do not report real-client behavior as tested: protocol tests are substitutes, real devices remain a release check.
