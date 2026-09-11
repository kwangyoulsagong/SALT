#!/usr/bin/env node
/**
 * 스트리밍 측정 게이트 (FE-REQ-008 FR-30~32).
 *
 * HTTP 응답의 **chunk 도착 시각**을 잰다. 첫 chunk 가 첫 블록 페인트,
 * 마지막 chunk 가 마지막 블록 완료다.
 *
 * ```bash
 * pnpm --filter web build
 * cd apps/web && STREAMING_PROBE=1 npx next start -p 3000
 *
 * node scripts/measure-streaming.mjs http://localhost:3000/streaming-probe
 * node scripts/measure-streaming.mjs "http://localhost:3000/streaming-probe?mode=blocking"
 * ```
 *
 * 판정: **첫 블록 p95 < 300ms** 이고 **총 완료 시간이 1콜 집계 대비 악화되지 않을 것**.
 * 만족하지 못하는 화면은 스트리밍을 쓰지 않고 1콜 집계로 되돌린다 (FR-31).
 *
 * 의존성 없음 — Node 18+ 의 fetch 만 쓴다.
 */

const url = process.argv[2];
const runs = Number(process.argv[3] ?? 7);

if (!url) {
  console.error("사용법: node scripts/measure-streaming.mjs <url> [반복횟수]");
  process.exit(1);
}

const once = async () => {
  const t0 = performance.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  const reader = res.body.getReader();
  const marks = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    marks.push(Number((performance.now() - t0).toFixed(1)));
  }
  return { bytes, chunks: marks.length, first: marks[0], last: marks.at(-1), marks };
};

const quantile = (xs, q) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

const results = [];
for (let i = 0; i < runs; i += 1) results.push(await once());

const firsts = results.map((r) => r.first);
const lasts = results.map((r) => r.last);

console.log(url);
console.log(`  runs=${runs} chunks=${results[0].chunks} bytes=${results[0].bytes}`);
console.log(`  첫 chunk : median ${quantile(firsts, 0.5)}ms  p95 ${quantile(firsts, 0.95)}ms`);
console.log(`  마지막   : median ${quantile(lasts, 0.5)}ms  p95 ${quantile(lasts, 0.95)}ms`);
console.log(`  chunk 도착(1회): [${results[0].marks.join(", ")}]`);

const gate = quantile(firsts, 0.95) < 300;
console.log(`  FR-31 첫 블록 300ms 게이트: ${gate ? "통과" : "미달"}`);
