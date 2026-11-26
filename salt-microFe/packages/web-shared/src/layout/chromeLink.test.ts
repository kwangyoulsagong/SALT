import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 공용 크롬(머리 · 탭 · 로고 · 벨 · 프로필)의 zone 을 넘는 링크는 `ChromeLink` 한 벌(2026-11-26 — 알림 벨이 일반 `ZoneLink` 라
 * 투자 zone 에서 누르면 벨 칸에 "이동 중" 이 붙어 머리가 깨지고 미리 그린 화면 없이 새로 떴다). 크롬 파일이 `ZoneLink` · `CrossZoneLink` 를
 * 직접 import 하면 실패한다 — prerender 표지 · 대기 문구 끔 · 계측 셋이 빠지는 길이 그것뿐이라서.
 * 예외: `ChromeLink` 자신 · 본문 링크인 404 화면(`NotFoundPage` — 큰 글자 링크라 대기 문구가 칸을 깨지 않는다)
 */
const LAYOUT = join(__dirname);
const ALLOWED = new Set(["ChromeLink.tsx", "NotFoundPage.tsx"]);
const DIRECT = /import\s*\{[^}]*\b(ZoneLink|CrossZoneLink)\b[^}]*\}\s*from\s*["']\.\.\/ui/;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : files(path);
    return /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });

describe("크롬 링크 한 벌", () => {
  it("크롬 파일은 ZoneLink · CrossZoneLink 를 직접 쓰지 않는다(ChromeLink 로)", () => {
    const offenders = files(LAYOUT)
      .filter((path) => !ALLOWED.has(path.split("/").pop()!))
      .filter((path) => DIRECT.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(LAYOUT.length + 1));
    expect(offenders).toEqual([]);
  });

  it("경계 — 직접 import 는 걸리고 ChromeLink 는 통과한다", () => {
    expect(DIRECT.test('import { ZoneLink } from "../ui";')).toBe(true);
    expect(DIRECT.test('import { CrossZoneLink, opensElsewhere } from "../ui";')).toBe(true);
    expect(DIRECT.test('import { ChromeLink } from "./ChromeLink";')).toBe(false);
  });
});
