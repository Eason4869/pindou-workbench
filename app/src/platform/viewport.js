// SDK safeArea coordinates are relative to the usable window, not the screen.
export function observeSafeArea(sdk, root = document.documentElement) {
  if (!sdk.viewport?.getWindowInfo || typeof sdk.on !== "function") return () => {};
  let active = true;
  let changed = false;
  const apply = (info) => {
    if (!active) return;
    const { safeArea: area, windowWidth: width, windowHeight: height } = info;
    if (!area || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    const clamp = (value, limit) => Number.isFinite(value) ? Math.max(0, Math.min(limit, value)) : 0;
    const insets = {
      top: clamp(area.top, height),
      bottom: Number.isFinite(area.bottom) ? clamp(height - area.bottom, height) : 0,
      left: clamp(area.left, width),
      right: Number.isFinite(area.right) ? clamp(width - area.right, width) : 0,
    };
    for (const [side, value] of Object.entries(insets)) root.style.setProperty(`--hb-safe-${side}`, `${value}px`);
  };
  const stop = sdk.on("viewport_change", (info) => {
    changed = true;
    apply(info);
  });
  // An event received during the initial request must win over that old snapshot.
  sdk.viewport.getWindowInfo().then(info => { if (!changed) apply(info); }).catch(() => {});
  return () => { active = false; stop(); };
}
