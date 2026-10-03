# SDD ledger — plan: docs/superpowers/plans/2026-10-02-pindou-implementation.md

Execution: user approved spec and plan, chose native execution (直接实时 interpreted as 直接实施).
Branch: codex/pindou-workbench. No commits until user provides Git author configuration.
Ruling: Develop in approved app/ directory on a local feature branch — the existing parent repository contains unrelated uncommitted work, and the plan specifies this location — no changes to other projects or shared branches.
Ruling: Use this Windows-compatible local ledger instead of POSIX helper scripts that write at the parent repository root — keep all task artifacts inside the authorized workspace — manual completion records retain commands and results.
Pre-flight 1→2: Palette inputs and getPalette outputs match.
Pre-flight 2→3/4/5: Pattern is the single immutable output consumed by all renderers and UI; no schema conflict.
Pre-flight 3/4→5: Browser Blob PNG and Uint8Array PDF will both be normalized to bytes by UI before platform save.
Pre-flight 5→6: Explicit browser download-started differs from native saved; E2E checks actual downloaded files.

Task 1: complete. Official SDK 0.8.4 template created; local project skill installed; palette tests RED→GREEN (3/3). Dependencies pinned; source/hash/license notices added. Doctor reports local project skill OK; overall global-agent skill checks remain SKILL_MISSING because unrelated global agent configurations are intentionally untouched.
Task 2: complete. Conversion tests RED→GREEN (9/9); Node suite 12/12. Worker and stale request IDs implemented.
Task 3: complete. CSV/filename/tiles tests and real PNG download RED→GREEN; output count matches preview. Added Canvas budget regression, observed 52,765,696 pixels RED then capped GREEN.
Task 4: implementation complete. Real PDF reopens with embedded CJK font, empty and full legends; Node suite 19/19. All-page rendering pending after final E2E (Playwright clears test-results).
Task 5: implementation complete. Three then four real Edge E2E tests pass. SDK protocol substitute covers cancellation, missing save capability, exclusive directory creation and awaited write. Original assets and final screenshots pending.
Task 6: in progress. SDK build succeeds (16.9 MiB including bundled CJK font). Browser build, visual review and final code review pending.
Task 5: assets complete. Original 200×200 icon and 510×272 cover generated from the code-drawn plant. Desktop/mobile screenshots inspected; fit now uses both viewport dimensions.
Task 4: independent rendering regression RED→GREEN. Original CFF subset produced invalid embedded font warnings and tofu Chinese text. Static normal-weight TrueType subset passes Poppler; PDF bytes remain small. Maximum 200×200/full-color PDF added.
Ruling: Use Noto Sans SC normal-weight TrueType instead of CFF OTF — the original subset output failed independent rendering — retain OFL, source and derived-file hash; a different font asset is bundled.
Ruling: Override only SDK CLI sharp to 0.35.4 — npm audit identified high-severity inherited image-library vulnerabilities, maintenance changelog reviewed — SDK build passes and production dependency audit now reports zero findings; retain override until upstream updates.
Task 6: application implementation complete; final fresh-context review and all-page visual verification underway. Updated SDK build 11.3 MiB after TrueType replacement.
Final review: fresh-context gpt-6-astra reviewer completed, four Important findings, no Critical. Read-only review package retained. One fix pass follows.
Final: fixed PDF main-thread blocking — maximum PDF heartbeat RED (3390 ms gap)→GREEN; browser exports run in a worker. Native path uses precompressed intact font and bounded drawing/serialization chunks.
Final: fixed native save races — deferred write/identity/cancellation tests RED→GREEN; active write disables cancellation and replacement; stale callbacks do not clear a new file.
Final: fixed native import ordering — initiating-click token tests RED→GREEN; demo and later imports invalidate earlier picker/read results before decode.
Final: fixed connecting file actions — embedded SDK protocol E2E RED→GREEN; no adapter until confirmed handshake mode and file controls disabled while connecting.
Ruling: Use cooperative chunks in SDK contexts — actual official Host reports worker-src none and connect-src none, and public plugin has no project option to relax them — web retains Worker; client work is asynchronous on the page with bounded yields rather than a background thread.
Ruling: Embed precompressed intact TrueType with cached Unicode metrics through pdf-lib low-level font APIs — both CFF and TrueType fontkit subsets damaged glyphs; new actual-outline regression caught the second issue — files are about 6 MiB, larger than subset PDFs; removes synchronous full-font parsing/compression from client export.
Ruling: Represent SDK Mock export as generated but preview-restricted — official iframe sandbox lacks allow-downloads — download is only available in standalone web or real-client native save; regression never falsely reports a blocked download started.
Final: minor (deferred): strengthen the existing photo averaging unit test to assert its chosen gray color, rather than only cell count; averaging implementation remains covered by visual and real photo import checks.
Final: Ruling: real-client picker/save compatibility remains a release check — local protocol substitutes and official Mock establish code paths but not actual device support — each declared platform still needs device validation before release.
Final: Ruling: root performs the full-page visual review, final suite/build and dependency audit — these were deliberately not duplicated by the read-only reviewer — checks and logs retained in this project.
Final: Ruling: supplied reference fidelity and remote deployment are outside implementation review — no artwork, layout or content was copied; publishing is not part of the user's current authorization — original demo delivered and remote project remains unbound.
Ruling: Add a separate vite.web.config.js for standalone browser dev/build — the official Manifest plugin intentionally injects an APP-only entry gate — both distributions use the same application code; the web distribution does not include that gate.
Final verification: complete. Node 24/24 (zero skipped), Edge E2E 6/6, web and official SDK builds pass, final SDK package about 10.2 MiB, production audit zero findings. Official Host handshake/conversion/PDF generation succeeds with truthful preview-restricted status.
Final visual verification: complete. Poppler rendered 95 pages across six fixtures; inspected all 14 contact sheets plus enlarged demo grid and maximum last tile. Final Chinese, numerals, codes, legend continuation, grid coverage and page numbering show no defects. Inspected desktop and 390px screenshots.
Task 4, 5, 6: complete. Earlier pending/subset/size entries are superseded by the final intact-font implementation and final verification above. Definitive results: docs/verification/2026-10-02-pindou.md.
Ruling: Retain local branch, live previews and uncommitted scoped files — approved plan already specifies no commits without configured Git author and no remote deployment — no new permission menu or merge is needed to deliver the working tool.
