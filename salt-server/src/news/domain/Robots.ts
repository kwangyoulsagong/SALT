/**
 * robots.txt 판정(`SRV-REQ-058` FR-1 · FR-4) — AI 경로가 받는 페이지 · RSS 는 매체가 허락한 것만.
 *
 * 규칙(RFC 9309 + AI 토큰 보수 판정 — 순수, I/O 없음):
 * - 그룹 = 붙어 있는 `User-agent` 줄들 + 뒤따르는 `Allow` · `Disallow`. 토큰 이름이 같은 그룹들을 합치고, 없으면 `*` 그룹
 * - 경로는 가장 긴 패턴이 이긴다 · 길이가 같으면 `Allow` · `*` 은 아무 글자 · `$` 는 끝 · 빈 `Disallow` 는 규칙 없음
 * - **AI 경로는 토큰 전부가 허락할 때만** — 우리 이름(`saltreader`)뿐 아니라 매체가 AI 용으로 막는 이름(ClaudeBot · GPTBot …)도 본다.
 *   매체가 AI 봇을 막았으면 우리 이름이 달라도 "AI 이용을 막는다"는 뜻으로 읽는다(2026-11-14 실측: 국내 9곳이 이렇게 막는다)
 * - robots 를 못 받았을 때: 4xx 는 "규칙 없음"(전부 허락 — RFC 9309 §2.3.1.3) · 5xx · 연결 실패는 전부 막힘(§2.3.1.4)
 */

/** AI 경로가 지켜야 하는 토큰 — 우리 이름 + 매체가 AI 이용을 막을 때 쓰는 이름 */
export const AI_ROBOTS_TOKENS = [
  "saltreader",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "gptbot",
  "google-extended",
  "ccbot",
] as const;

interface RobotsRule {
  allow: boolean;
  pattern: string;
}

interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export interface RobotsSnapshot {
  /** HTTP 상태(0 = 연결 실패) */
  status: number;
  body: string;
}

export const parseRobots = (text: string): RobotsGroup[] => {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      if (key === "disallow" && value === "") continue;
      current.rules.push({ allow: key === "allow", pattern: value });
    }
  }
  return groups;
};

const patternToRegExp = (pattern: string): RegExp => {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
};

/** 한 토큰이 이 경로를 받아도 되나 — 이름이 같은 그룹, 없으면 `*` 그룹. 둘 다 없으면 허락 */
export const isPathAllowedFor = (groups: RobotsGroup[], token: string, path: string): boolean => {
  const own = groups.filter((g) => g.agents.includes(token));
  const chosen = own.length > 0 ? own : groups.filter((g) => g.agents.includes("*"));
  let best: RobotsRule | null = null;
  for (const rule of chosen.flatMap((g) => g.rules)) {
    if (!patternToRegExp(rule.pattern).test(path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
    ) {
      best = rule;
    }
  }
  return best ? best.allow : true;
};

export type RobotsVerdict = "allowed" | "blocked_ai" | "blocked_all" | "unreachable";

/**
 * AI 경로 판정 — `allowed` 만 받는다. 막힌 까닭을 남긴다(덮임률 리포트가 "막힌 매체 몫"을 따로 센다)
 */
export const robotsVerdictFor = (snapshot: RobotsSnapshot, url: string): RobotsVerdict => {
  if (snapshot.status === 0 || snapshot.status >= 500) return "unreachable";
  if (snapshot.status >= 400) return "allowed";
  const parsed = new URL(url);
  const path = `${parsed.pathname}${parsed.search}` || "/";
  const groups = parseRobots(snapshot.body);
  if (!isPathAllowedFor(groups, "*", path)) return "blocked_all";
  return AI_ROBOTS_TOKENS.every((token) => isPathAllowedFor(groups, token, path)) ? "allowed" : "blocked_ai";
};
