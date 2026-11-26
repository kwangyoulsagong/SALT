/** 3차 베지어 이징 — 토큰의 `enter` 곡선을 그대로 따른다 */
export const bezier = ([x1, y1, x2, y2]: readonly number[]) => (t: number) => {
  // x(s) = t 를 뉴턴법으로 풀고 y(s) 를 돌려준다
  const cx = 3 * x1!, bx = 3 * (x2! - x1!) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1!, by = 3 * (y2! - y1!) - cy, ay = 1 - cy - by;
  let s = t;
  for (let i = 0; i < 6; i += 1) {
    const x = ((ax * s + bx) * s + cx) * s - t;
    const dx = (3 * ax * s + 2 * bx) * s + cx;
    if (Math.abs(dx) < 1e-6) break;
    s -= x / dx;
  }
  return ((ay * s + by) * s + cy) * s;
};
