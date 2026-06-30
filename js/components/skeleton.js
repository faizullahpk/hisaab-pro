/** Hisaab Pro — Skeleton loaders */
export function skeletonCard() {
  return `<div class="card">
    <div class="skeleton skeleton--title"></div>
    <div class="skeleton skeleton--text" style="width:90%"></div>
    <div class="skeleton skeleton--text" style="width:75%"></div>
    <div class="skeleton skeleton--block" style="margin-top:16px"></div>
  </div>`;
}
export function skeletonRows(n = 4) {
  return Array.from({ length: n }).map(() => `
    <div class="flex center gap-3" style="padding:12px 0">
      <div class="skeleton skeleton--circle" style="width:40px;height:40px"></div>
      <div style="flex:1">
        <div class="skeleton skeleton--text" style="width:40%"></div>
        <div class="skeleton skeleton--text" style="width:65%"></div>
      </div>
      <div class="skeleton skeleton--text" style="width:60px"></div>
    </div>`).join("");
}
export function skeletonGrid(n = 4) {
  return `<div class="grid grid-4">${Array.from({ length: n }).map(skeletonCard).join("")}</div>`;
}
