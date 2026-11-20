import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 데스크톱 글자 크기는 다섯 단뿐이다 — 12 · 13 · 14 · 18 · 24(`FE-REQ-047` FR-3 · `screen-desktop.md` §2, 토큰 `deskType`).
 * 사이값(10 · 11 · 15 · 16 · 17 · 20 · 22 · 26 · 28 …)을 숫자로 쓰거나 그 크기를 가리키는 옛 토큰(`fontSizes.lg` · `typography.t6` …)을
 * 쓰면 센다. 이미 있는 것은 화면 REQ(`FE-REQ-048` · `049` · `060`)가 줄인다 — 이 시험은 **늘지 않게** 막는다(줄면 아래 숫자를 낮춘다).
 * 규칙 문서에만 두면 다시 늘어난다(`done-checklist.md` §1).
 */
const REPO = join(__dirname, "../../../..");

/** 2026-11-19 기준(이 시험을 만든 날) — 늘면 실패, 줄면 낮춘다 */
const BUDGET: Record<string, number> = {
  "apps/web/src": 5,
  "packages/domain-invest/src": 54, // 2026-11-19 `FE-REQ-049` 상세 재설계 −8
  "packages/domain-savings/src": 0,
  "packages/domain-household/src": 5, // 2026-11-19 `FE-REQ-060` 가계부 단계 −1
  "packages/domain-tips/src": 0, // 2026-11-20 `FE-REQ-060` 팁 단계 −8
  "packages/web-shared/src": 10,
  "packages/ui/src": 119,
};

/**
 * 휴대폰 PWA 표면(`ADR-012` · `FE-REQ-071` · `FE-REQ-072`) — 데스크톱 다섯 단 대상이 아니다. 여기는 **`appType` 토큰만** 쓴다(숫자 · 옛 토큰 0).
 * 휴대폰 틀 · zone 앱 · 도메인 패키지의 `src/mobile` 진입점
 */
const MOBILE_SURFACE = [
  "packages/web-shared/src/layout/mobile",
  "apps/web-mobile",
  "packages/domain-savings/src/mobile",
  "packages/domain-household/src/mobile",
  "packages/domain-invest/src/mobile",
];
const isMobileSurface = (file: string): boolean =>
  MOBILE_SURFACE.some((root) => relative(REPO, file).startsWith(`${root}/`));

const DESK_SIZES = new Set(["12", "13", "14", "18", "24"]);
/** 다섯 단 밖을 가리키는 옛 토큰 키(`@repo/tokens` `fontSizes` · `typography` · web-shared `fontSizes`) */
const OFF_SCALE_KEYS = new Set([
  "xs", "lg", "2xl", "4xl", "5xl", "6xl",
  "heading3", "heading1", "extraHeadding",
  "t1", "t2", "t3", "t4", "t5", "t6", "t8",
]);

const LITERAL = /fontSize:\s*(?:"(\d+(?:\.\d+)?)px"|(\d+(?:\.\d+)?)(?=\s*[,}\n]))/g;
const TOKEN_REF = /fontSizes(?:\.(\w+)|\["(\w+)"\])|typography\.(t\d)/g;

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css.ts") && !name.endsWith(".test.ts") ? [path] : [];
  });

export const offScaleSizes = (source: string): string[] => {
  const found: string[] = [];
  for (const match of source.matchAll(LITERAL)) {
    const size = match[1] ?? match[2];
    if (size && !DESK_SIZES.has(size)) found.push(`${size}px`);
  }
  for (const match of source.matchAll(TOKEN_REF)) {
    const key = match[1] ?? match[2] ?? match[3];
    if (key && OFF_SCALE_KEYS.has(key)) found.push(key);
  }
  return found;
};

describe("데스크톱 글자 크기 다섯 단(FE-REQ-047 FR-3)", () => {
  it("경계 — 다섯 단 · 단 토큰은 통과, 사이값 · 옛 토큰은 센다", () => {
    expect(offScaleSizes(`fontSize: "13px", x: vars.deskType.body.fontSize, fontSize: 18,`)).toEqual([]);
    expect(offScaleSizes(`fontSize: vars.fontSizes.md, fontSize: vars.fontSizes["xl"], fontSize: vars.typography.t7.fontSize`)).toEqual([]);
    expect(offScaleSizes(`fontSize: "15px", fontSize: 20,`)).toEqual(["15px", "20px"]);
    expect(offScaleSizes(`fontSize: vars.fontSizes.lg, fontSize: vars.fontSizes["2xl"], ...vars.typography.t6`)).toEqual(["lg", "2xl", "t6"]);
  });

  // 모바일 글자(`appType`)는 휴대폰 표면 · 같이 쓰는 조각의 `/m` 표지 선택자 안에서만 — 데스크톱 단 밖 크기를 이 이름으로 우회하지 않게(`FE-REQ-072` FR-4)
  // `MOBILE_ROOT`(`globalStyle` 앞머리)는 `ON_MOBILE` 과 같은 표지다 — 여러 클래스를 한 번에 `/m` 값으로(`screen-mobile.md` §1, `FE-REQ-074` FR-7)
  it("appType 은 휴대폰 표면 · ON_MOBILE · MOBILE_ROOT 를 쓰는 파일에서만", () => {
    const leaks = Object.keys(BUDGET)
      .flatMap((root) => cssFiles(join(REPO, root)))
      .filter((file) => {
        if (isMobileSurface(file)) return false;
        const source = readFileSync(file, "utf8");
        return /appType\./.test(source) && !/ON_MOBILE|MOBILE_ROOT/.test(source);
      })
      .map((file) => relative(REPO, file));
    expect(leaks, `appType 을 휴대폰 선택자 밖에서 썼다:\n${leaks.join("\n")}`).toEqual([]);
  });

  // 데스크톱 화면(`pages`)에 휴대폰 분기를 다시 넣지 않는다(`ADR-012` · `FE-REQ-072` FR-4) — 휴대폰 배치는 `src/mobile` 진입점이 그린다
  it("데스크톱 화면(pages)은 휴대폰 표지(ON_MOBILE · data-surface)를 쓰지 않는다", () => {
    const pageRoots = ["apps/web/src/pages", ...Object.keys(BUDGET).filter((root) => root.startsWith("packages/domain-")).map((root) => `${root}/pages`)];
    const hits = pageRoots
      .flatMap((root) => {
        try {
          statSync(join(REPO, root));
        } catch {
          return [];
        }
        return cssFiles(join(REPO, root));
      })
      .filter((file) => /ON_MOBILE|SURFACE_ATTRIBUTE|data-surface/.test(readFileSync(file, "utf8")))
      .map((file) => relative(REPO, file));
    expect(hits, `데스크톱 화면에 휴대폰 분기 — /m 진입점(src/mobile)으로 옮긴다:\n${hits.join("\n")}`).toEqual([]);
  });

  for (const [root, budget] of Object.entries(BUDGET)) {
    it(`${root} — 단 밖 크기 ${budget} 개 — 늘면 실패 · 줄면 BUDGET 을 낮춘다`, () => {
      const hits = cssFiles(join(REPO, root)).filter((file) => !isMobileSurface(file)).flatMap((file) =>
        offScaleSizes(readFileSync(file, "utf8")).map((size) => `${relative(REPO, file)} ${size}`),
      );
      expect(hits.length, `새로 생긴 단 밖 크기는 deskType 토큰으로:\n${hits.join("\n")}`).toBe(budget);
    });
  }
});

describe("휴대폰 표면 글자는 appType 만(FE-REQ-071 FR-5 · screen-mobile.md §1)", () => {
  it("숫자 글자 크기 · 데스크톱 · 옛 토큰 0", () => {
    const hits = MOBILE_SURFACE.flatMap((root) => {
      const dir = join(REPO, root);
      try {
        statSync(dir);
      } catch {
        return [];
      }
      return cssFiles(dir).flatMap((file) => {
        const source = readFileSync(file, "utf8");
        const literal = [...source.matchAll(LITERAL)].map((m) => `${m[1] ?? m[2]}px`);
        const token = [...source.matchAll(TOKEN_REF), ...source.matchAll(/deskType\./g)].map((m) => m[0]);
        return [...literal, ...token].map((hit) => `${relative(REPO, file)} ${hit}`);
      });
    });
    expect(hits, `휴대폰 표면은 vars.appType.* 로:\n${hits.join("\n")}`).toEqual([]);
  });
});
