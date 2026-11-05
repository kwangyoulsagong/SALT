import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `viewTransitionName` 을 단 스타일 블록은 `zIndex` 도 같이 단다(2026-11-05).
 *
 * `view-transition-name` 은 쌓임 맥락을 만든다. 그 요소에 z-index 가 없으면 안에 든 떠 있는 것(메뉴 · 툴팁)의 z-index 가 맥락 안에
 * 갇혀 뒤에 오는 본문에 깔린다 — 앱 머리의 계정 메뉴가 홈 카드에 깔려 로그아웃을 누를 수 없었다(`5a86dafa` 부터).
 * 규칙 문서로 두면 다시 터진다 — 그래서 `src/**\/*.css.ts` 를 전부 센다.
 */
const SRC = join(__dirname, "..");

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css.ts") ? [path] : [];
  });

/** `at` 을 감싸는 가장 안쪽 `{ … }` 블록 */
const enclosingBlock = (source: string, at: number): string => {
  let depth = 0;
  let open = at;
  for (; open >= 0; open -= 1) {
    if (source[open] === "}") depth += 1;
    if (source[open] === "{") {
      if (depth === 0) break;
      depth -= 1;
    }
  }
  depth = 0;
  let close = open;
  for (; close < source.length; close += 1) {
    if (source[close] === "{") depth += 1;
    if (source[close] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return source.slice(open, close + 1);
};

const offenders = (source: string): string[] => {
  const found: string[] = [];
  for (const match of source.matchAll(/viewTransitionName\s*:/g)) {
    const block = enclosingBlock(source, match.index);
    if (!/zIndex\s*:/.test(block)) found.push(block.slice(0, 80));
  }
  return found;
};

describe("viewTransitionName 쌓임 맥락", () => {
  it("검사기 — 경계", () => {
    expect(offenders(`style({ a: 1, viewTransitionName: "x" })`)).toHaveLength(1);
    expect(offenders(`style({ zIndex: 1, viewTransitionName: "x" })`)).toHaveLength(0);
    // 다른 블록의 zIndex 는 세지 않는다
    expect(offenders(`a = style({ zIndex: 1 }); b = style({ viewTransitionName: "x" })`)).toHaveLength(1);
    // 미디어 쿼리 안 블록
    expect(offenders(`style({ "@media": { m: { zIndex: 2, viewTransitionName: "x" } } })`)).toHaveLength(0);
  });

  it("모든 .css.ts 에서 viewTransitionName 블록에 zIndex 가 있다", () => {
    const bad = cssFiles(SRC).flatMap((file) => offenders(readFileSync(file, "utf8")).map((b) => `${file}: ${b}`));
    expect(bad).toEqual([]);
  });
});
