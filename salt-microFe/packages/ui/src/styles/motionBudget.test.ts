import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 전환은 **바뀌는 속성만** 적고, 레이아웃 속성은 움직이지 않는다 (FE-REQ-062 FR-1 · FR-6 · `motion.md` §5).
 *
 * 2026-11-26 실측: 옛 토큰 `vars.transitions.fast`("0.1s ease")를 속성 없이 써서 브라우저가 `transition: all` 로 읽은 요소가 180개 —
 * 투자 표 별 버튼 101개 · 가계부 칩 41개. 진척 막대는 `width`, 날마다 막대는 `height` 를 움직였다. 규칙 문서에만 두면 다시 생긴다
 * (`done-checklist.md` §1) — `*.css.ts` 의 `transition` 값을 훑어 센다. 기준은 0 이다(늘 0 을 지킨다).
 */
const REPO = join(__dirname, "../../../..");
const ROOTS = ["apps", "packages"];

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".") || name === "dist" || name === "storybook-static") return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css.ts") || path.endsWith("/styles/transition.ts") || path.endsWith("/styles/press.ts") ? [path] : [];
  });

/** 움직이면 매 프레임 레이아웃 · 큰 칠하기가 나는 속성 — `all` 도 이것들을 포함한다 */
const FORBIDDEN = /^(all|width|height|min-width|min-height|max-width|max-height|top|left|right|bottom|inset|margin(-\w+)?|padding(-\w+)?|box-shadow|flex-basis|grid-template-\w+)$/;

/** `${…}` 안의 쉼표는 나누지 않고 바깥 쉼표로만 전환 하나하나를 가른다 */
const splitParts = (body: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i]!;
    if (char === "$" && body[i + 1] === "{") depth += 1;
    if (char === "}" && depth > 0) depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

/** 대문자 상수(`HOVER_TRANSITION` · `PRESS_TRANSITION` …)는 그 자리에서 이 시험이 따로 본다 */
const CONSTANT = /^\$\{[A-Z][A-Z_]+\}$|^[A-Z][A-Z_]+$/;

/**
 * 전환 값 하나를 판정한다. 돌려주는 것은 문제 설명(없으면 빈 배열).
 * - 속성 없이 길이로 시작(`vars.motion.duration.base` · `0.2s` · 옛 `vars.transitions.*`) → 브라우저가 `all` 로 읽는다
 * - 금지 속성(`all` · `width` · `height` · `box-shadow` …)
 */
export const transitionProblems = (expression: string): string[] => {
  const trimmed = expression.trim().replace(/,$/, "");
  if (/^["'`]none["'`]$/.test(trimmed) || /^\{/.test(trimmed)) return [];
  if (/^vars\.transitions/.test(trimmed) || /^vars\.motion/.test(trimmed)) return [`속성 없음: ${trimmed}`];
  if (CONSTANT.test(trimmed)) return [];
  const quoted = /^(["'`])([\s\S]*)\1$/.exec(trimmed);
  if (!quoted) return [`알 수 없는 값: ${trimmed}`];
  return splitParts(quoted[2]!).flatMap((part) => {
    if (CONSTANT.test(part)) return [];
    const property = /^([a-z-]+)\s/.exec(part)?.[1];
    if (!property) return [`속성 없음: ${part}`];
    return FORBIDDEN.test(property) ? [`금지 속성 ${property}: ${part}`] : [];
  });
};

/** 주석을 지운다 — 설명 글의 "transition: all" 을 세지 않는다 */
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

/** `transition:` 뒤 값 하나 — 따옴표 · 템플릿(`${}` 안 포함)이면 닫힐 때까지, 아니면 식별자 · 멤버 식 */
export const readValue = (source: string, from: number): string => {
  let i = from;
  while (source[i] === " ") i += 1;
  const open = source[i];
  if (open === '"' || open === "'" || open === "`") {
    let depth = 0;
    for (let j = i + 1; j < source.length; j += 1) {
      const char = source[j];
      if (open === "`" && char === "$" && source[j + 1] === "{") depth += 1;
      else if (char === "}" && depth > 0) depth -= 1;
      else if (char === open && depth === 0) return source.slice(i, j + 1);
    }
    return source.slice(i);
  }
  return /^[\w.$[\]"']+/.exec(source.slice(i))?.[0] ?? source.slice(i, i + 1);
};

export const problemsInSource = (raw: string): string[] => {
  const source = stripComments(raw);
  return [...source.matchAll(/\btransition:/g)].flatMap((match) => transitionProblems(readValue(source, match.index! + match[0].length)));
};

const problemsIn = (file: string): string[] =>
  problemsInSource(readFileSync(file, "utf8")).map((problem) => `${relative(REPO, file)} — ${problem}`);

describe("transitionProblems — 판정 경계", () => {
  it.each([
    ["`background-color ${vars.motion.duration.hover} ${vars.motion.easing.standard}`"],
    ["`transform ${vars.motion.duration.base} ${vars.motion.easing.move}`"],
    ["`${HOVER_TRANSITION}, ${PRESS_TRANSITION}`"],
    ["HOVER_TRANSITION"],
    ['"none"'],
    ["`opacity ${vars.motion.duration.instant}, color ${vars.motion.duration.instant}`"],
    ["`scale ${vars.motion.duration.instant} ${vars.motion.easing.enter}`"],
  ])("통과 %s", (value) => {
    expect(transitionProblems(value)).toEqual([]);
  });

  it.each([
    ["vars.transitions.fast"],
    ["vars.motion.duration.base"],
    ["`${vars.motion.duration.base} ease`"],
    ['"0.2s ease"'],
    ["`all ${vars.motion.duration.base}`"],
    ["`width ${vars.motion.duration.base}`"],
    ["`height ${vars.motion.duration.base}`"],
    ["`transform ${vars.motion.duration.base}, box-shadow ${vars.motion.duration.base}`"],
  ])("막음 %s", (value) => {
    expect(transitionProblems(value).length).toBeGreaterThan(0);
  });
});

describe("problemsInSource — 파일 모양 그대로", () => {
  it("인라인 객체 · 주석 · 여러 줄은 값 하나만 읽는다", () => {
    const ok = [
      'const a = style({ "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } } });',
      "/** 옛 transition: all 은 지웠다 */",
      "// transition: width 0.2s",
      "const b = style({ transition: `${HOVER_TRANSITION}, ${PRESS_TRANSITION}`, ...press });",
      "globalStyle(`${row} > td`, { transition: HOVER_TRANSITION });",
    ].join("\n");
    expect(problemsInSource(ok)).toEqual([]);
  });

  it("옛 토큰 · 길이만 · 금지 속성은 파일 안에서도 잡는다", () => {
    const bad = [
      "const a = style({ transition: vars.transitions.fast, cursor: \"pointer\" });",
      "const b = style({ transition: `width ${vars.motion.duration.base}` });",
      "const c = style({",
      "  transition: `${vars.motion.duration.hover} ${vars.motion.easing.standard}`,",
      "});",
    ].join("\n");
    expect(problemsInSource(bad)).toHaveLength(3);
  });
});

describe("레포의 전환 값", () => {
  it("속성 없는 전환 · `all` · 레이아웃 속성 전환이 0 이다", () => {
    const files = ROOTS.flatMap((root) => cssFiles(join(REPO, root)));
    expect(files.length).toBeGreaterThan(100);
    expect(files.flatMap(problemsIn)).toEqual([]);
  });
});
