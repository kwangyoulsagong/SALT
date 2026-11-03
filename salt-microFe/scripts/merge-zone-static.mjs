#!/usr/bin/env node
/**
 * zone 운영 빌드의 정적 파일을 한 곳에 합친다 (`FE-REQ-054` FR-5, `ADR-005` 규칙 7 개정 2026-11-03).
 *
 * 운영 빌드는 모든 zone 이 같은 `/_next/static` 을 쓴다(`@repo/config-next`). 청크 이름에 내용 해시가 있어 이름이 같으면 내용도
 * 같아야 한다 — 같은 이름에 다른 내용이 나오면 **합치지 않고 실패**한다(덮으면 한 zone 이 남의 청크를 받는다).
 *
 * 배포(`OPS-001`)는 이 규칙대로 zone 정적 파일을 한 저장소에 올린다. 로컬은 셸 `.next/static` 에 합쳐 셸이 서비스한다:
 *
 *   pnpm --filter "./apps/web*" build && node scripts/merge-zone-static.mjs   # 기본: apps/web/.next/static 로
 *   node scripts/merge-zone-static.mjs --check                                # 충돌만 본다(쓰지 않음)
 *   node scripts/merge-zone-static.mjs --out <dir>                            # 다른 곳으로(배포 산출물)
 *
 * **순서: 빌드 → 합치기 → `next start`.** 셸이 뜬 뒤에 합치면 그 사이 투자 화면 청크가 404 다.
 * `ZONE_STATIC=per-zone` 은 빌드와 기동 **둘 다** 같은 값으로 — `next start` 도 `next.config.js` 를 다시 읽어 assetPrefix 를 정한다.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { ZONES, ZONE_IDS } = require("../packages/core/src/zones/registry.cjs");

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const outIndex = args.indexOf("--out");
const shellStatic = join(root, "apps", ZONES.shell.app, ".next", "static");
if (outIndex >= 0 && (!args[outIndex + 1] || args[outIndex + 1].startsWith("--"))) {
  console.error("--out 뒤에 경로가 없다");
  process.exit(1);
}
// 상대 경로도 절대 경로로 — 셸 자신의 static 을 가리키면 그 zone 은 건너뛴다(같은 폴더 복사 금지)
const out = outIndex >= 0 ? resolve(process.cwd(), args[outIndex + 1]) : shellStatic;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** 상대 경로 → { 해시, 어느 zone } */
const seen = new Map();
const conflicts = [];
let shared = 0;
const sources = [];

for (const id of ZONE_IDS) {
  const dir = join(root, "apps", ZONES[id].app, ".next", "static");
  if (!existsSync(dir)) {
    console.error(`빌드가 없다: ${relative(root, dir)} — 먼저 pnpm --filter "./apps/web*" build`);
    process.exit(1);
  }
  // dev 산출물은 해시 없는 이름이라 합칠 수 없다(`development/` 폴더가 표지) — 운영 빌드가 아니면 멈춘다
  if (existsSync(join(dir, "development"))) {
    console.error(`운영 빌드가 아니다(dev 산출물): ${relative(root, dir)} — dev 서버를 내리고 pnpm --filter "./apps/web*" build`);
    process.exit(1);
  }
  sources.push({ id, dir });
  for (const file of walk(dir)) {
    const rel = relative(dir, file);
    const h = hash(file);
    const prev = seen.get(rel);
    if (!prev) seen.set(rel, { h, zone: id });
    else if (prev.h === h) shared += 1;
    else conflicts.push(`${rel} (${prev.zone} ≠ ${id})`);
  }
}

console.log(`zone ${sources.length} · 파일 ${seen.size} · 같은 이름 같은 내용 ${shared} · 충돌 ${conflicts.length}`);
if (conflicts.length > 0) {
  console.error(`같은 이름 · 다른 내용 — 합치지 않는다:\n  ${conflicts.slice(0, 20).join("\n  ")}`);
  process.exit(1);
}
if (checkOnly) process.exit(0);

mkdirSync(out, { recursive: true });
for (const { dir } of sources) {
  if (resolve(dir) === out) continue;
  // 같은 이름은 내용이 같다(위에서 확인) — 덮어도 결과가 같다
  cpSync(dir, out, { recursive: true, force: false, errorOnExist: false });
}
console.log(`합침 → ${relative(root, out) || out}`);
