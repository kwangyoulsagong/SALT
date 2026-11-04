#!/usr/bin/env node
/**
 * done 전 검사 — 지금까지 "파이프라인 다 했어?"에서 반복해 빠진 것을 기계가 먼저 본다 (`DEV-001`).
 *
 * 규칙 문서(`.claude/rules/done-checklist.md`)에 적기만 한 항목은 다시 빠졌다. 기계로 셀 수 있는 것은 여기서 센다.
 *
 * 보는 것 (브랜치 = merge-base(기준, HEAD) 이후 커밋 + 작업 트리 + 미추적)
 *  1. 주인 REQ — 바뀐 코드 파일마다 **첫** REQ 번호(머리 주석) + 더한 코드 줄의 REQ 번호.
 *     각 REQ 의 스펙 · 체크리스트 · 회고가 있고, 이 브랜치에서 셋 다 고쳐졌는가
 *  2. done 으로 옮긴 영역 스펙 — 체크리스트 · 회고가 있는가
 *  3. 루트 슬라이스 — 영역 스펙을 고쳤으면 루트 슬라이스 문서를 하나는 고쳤는가, 고친 슬라이스마다 체크리스트 · 회고가 있는가
 *  4. 마스터 인덱스 — 영역 스펙을 고쳤으면 같이 고쳤는가
 *  5. `.claude/rules/**` 200줄 상한
 *  6. 참고한 외부 서비스 이름 — 더한 줄 · 커밋 메시지. 이름 목록은 레포에 두지 않는다
 *     (`.git/info/reference-brands` 한 줄에 하나, 또는 `SALT_REFERENCE_BRANDS` 쉼표 구분)
 *
 * 실행: `node scripts/check-done.mjs` · 기준 바꾸기 `--base <ref>`(기본 main). 실패가 있으면 exit 1.
 * 이 검사가 통과해도 사람이 볼 것(리뷰 체크리스트 "사람" 칸)은 남는다.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
const root = git("rev-parse", "--show-toplevel");
const baseArg = process.argv.indexOf("--base");
const baseRef = baseArg > 0 ? process.argv[baseArg + 1] : "main";
const base = git("merge-base", baseRef, "HEAD");
const lines = (s) => (s ? s.split("\n").filter(Boolean) : []);

// 바뀐 파일(이름 바꾸기는 새 이름) — 커밋 + 작업 트리 + 미추적
const changes = new Map(); // path -> status(A/M/D/R)
for (const row of lines(git("diff", "--name-status", "-M", base))) {
  const [status, ...paths] = row.split("\t");
  changes.set(paths.at(-1), status[0]);
}
for (const p of lines(git("ls-files", "--others", "--exclude-standard"))) changes.set(p, "A");
const live = [...changes].filter(([, s]) => s !== "D").map(([p]) => p);
const touched = (p) => changes.has(p) && changes.get(p) !== "D";

const fails = [];
const notes = [];
const fail = (msg) => fails.push(msg);

// ── 1. 주인 REQ ────────────────────────────────────────────────
const REQ = /\b(FE|BFF|SRV|DB|FC|RN)-REQ-\d{3}\b/g;
const AREA = { FE: "salt-microFe", RN: "salt-microFe", BFF: "bff", SRV: "salt-server", DB: "salt-server", FC: "salt-forecast" };
const CODE = /\.(ts|tsx|mts|cts|js|mjs|cjs|py|kt|kts|sql|prisma)$/;
const isCode = (p) => CODE.test(p) && !/(^|\/)(requirements|docs|node_modules|dist|\.next)\//.test(p);

const addedLines = (p) => {
  if (changes.get(p) === "A" && !lines(git("ls-files", "--", p)).length) return readFileSync(path.join(root, p), "utf8");
  return lines(git("diff", "-U0", base, "--", p))
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .join("\n");
};

const owners = new Map(); // REQ -> 왜 걸렸나(파일)
for (const p of live.filter(isCode)) {
  const full = path.join(root, p);
  if (!existsSync(full)) continue;
  const first = readFileSync(full, "utf8").match(REQ)?.[0];
  if (first && !owners.has(first)) owners.set(first, `${p} 머리`);
  for (const id of addedLines(p).match(REQ) ?? []) if (!owners.has(id)) owners.set(id, `${p} 더한 줄`);
}

const findSpec = (area, id) => {
  for (const stage of ["to-do", "in-progress", "done"]) {
    const dir = path.join(root, area, "requirements/specs", stage);
    if (!existsSync(dir)) continue;
    const hit = readdirSync(dir).find((f) => f.startsWith(`${id}-`) || f === `${id}.md`);
    if (hit) return path.join(area, "requirements/specs", stage, hit);
  }
  return null;
};

for (const [id, why] of [...owners].sort()) {
  const area = AREA[id.split("-")[0]];
  const spec = findSpec(area, id);
  const checklist = `${area}/requirements/reports/checklists/${id}.md`;
  const retro = `${area}/requirements/reports/retrospects/${id}.md`;
  const missing = [];
  if (!spec) missing.push("스펙 없음");
  else if (!touched(spec)) missing.push("스펙 Changelog 안 고침");
  if (!existsSync(path.join(root, checklist))) missing.push("체크리스트 없음");
  else if (!touched(checklist)) missing.push("체크리스트 안 고침");
  if (!existsSync(path.join(root, retro))) missing.push("회고 없음");
  else if (!touched(retro)) missing.push("회고 안 고침");
  if (missing.length) fail(`주인 REQ ${id} (${why}) — ${missing.join(" · ")}`);
}

// ── 2. done 으로 옮긴 영역 스펙 ────────────────────────────────
const areaSpecs = live.filter((p) => /^[^/]+\/requirements\/specs\//.test(p) && !p.startsWith("requirements/"));
for (const p of areaSpecs.filter((p) => p.includes("/specs/done/") && changes.get(p) !== "M")) {
  const id = path.basename(p).match(/^([A-Z]+-REQ-\d{3})/)?.[1];
  if (!id) continue;
  const area = p.split("/")[0];
  for (const kind of ["checklists", "retrospects"]) {
    if (!existsSync(path.join(root, area, "requirements/reports", kind, `${id}.md`))) fail(`done 으로 옮긴 ${id} — ${kind} 없음`);
  }
}

// ── 3. 루트 슬라이스 ───────────────────────────────────────────
// 슬라이스 = `*-slice.md`. 계획 · 운영(DESIGN · OPS · QA) 문서는 세지 않는다
const rootSlices = live.filter((p) => /^requirements\/specs\/(to-do|in-progress|done)\/[^/]+-slice\.md$/.test(p));
if (areaSpecs.length && !rootSlices.length) fail("영역 스펙을 고쳤는데 루트 슬라이스 문서(requirements/specs/**)를 하나도 안 고쳤다");
for (const p of rootSlices) {
  const name = path.basename(p, ".md").replace(/-slice$/, "");
  for (const kind of ["checklists", "retrospects"]) {
    if (!existsSync(path.join(root, "requirements/reports", kind, `${name}.md`))) fail(`루트 슬라이스 ${name} — requirements/reports/${kind}/${name}.md 없음`);
  }
}

// ── 4. 마스터 인덱스 ───────────────────────────────────────────
const master = "requirements/specs/in-progress/salt-requirements-master-index.md";
if (areaSpecs.length && !touched(master)) fail("영역 스펙을 고쳤는데 마스터 인덱스(상태표 · 슬라이스 단락 · §8 변경 이력)를 안 고쳤다");

// ── 5. 규칙 문서 200줄 ─────────────────────────────────────────
for (const p of live.filter((p) => /(^|\/)\.claude\/rules\/.+\.md$/.test(p))) {
  const n = readFileSync(path.join(root, p), "utf8").split("\n").length;
  if (n > 200) fail(`${p} — ${n}줄(규칙 문서 상한 200)`);
}

// ── 6. 참고한 외부 서비스 이름 ─────────────────────────────────
// 작업 트리를 따로 열어도 같은 목록을 읽도록 공용 git 디렉터리에서
const brandFile = path.join(path.resolve(root, git("rev-parse", "--git-common-dir")), "info/reference-brands");
const brands = [
  ...(existsSync(brandFile) ? lines(readFileSync(brandFile, "utf8")) : []),
  ...(process.env.SALT_REFERENCE_BRANDS ?? "").split(","),
]
  .map((b) => b.trim())
  .filter((b) => b && !b.startsWith("#"));
if (!brands.length) {
  notes.push("외부 서비스 이름 목록이 없어 6번을 건너뛰었다 — .git/info/reference-brands 에 한 줄에 하나");
} else {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const word = new RegExp(brands.map((b) => (/^[a-z]/i.test(b) ? `\\b${esc(b)}\\b` : esc(b))).join("|"), "i");
  const textFiles = live.filter((p) => /\.(md|ts|tsx|mjs|cjs|js|py|kt|json|css)$/.test(p));
  for (const p of textFiles) {
    const hit = addedLines(p).split("\n").find((l) => word.test(l));
    if (hit) fail(`외부 서비스 이름 — ${p}: ${hit.trim().slice(0, 80)}`);
  }
  const msg = git("log", `${base}..HEAD`, "--format=%h %s%n%b");
  const hit = msg.split("\n").find((l) => word.test(l));
  if (hit) fail(`외부 서비스 이름 — 커밋 메시지: ${hit.trim().slice(0, 80)}`);
}

// ── 결과 ───────────────────────────────────────────────────────
console.log(`done 전 검사 — 기준 ${baseRef}(${base.slice(0, 8)}) · 바뀐 파일 ${live.length} · 주인 REQ ${owners.size}`);
for (const n of notes) console.log(`  · ${n}`);
if (!fails.length) {
  console.log("  ✓ 기계가 보는 항목 통과 — 남은 것은 .claude/rules/done-checklist.md 의 \"사람\" 칸");
  process.exit(0);
}
for (const f of fails) console.log(`  ✗ ${f}`);
console.log(`실패 ${fails.length}건`);
process.exit(1);
