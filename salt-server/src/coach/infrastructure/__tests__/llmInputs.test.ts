import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LLM_INPUTS, type CoachExplanationInput, type ExplainCaller, type MoveSummaryPrompt } from "../../domain";
import { buildExplanationPrompt } from "../explanationPrompt";
import { buildMoveSummaryPrompt } from "../moveSummaryPrompt";

/**
 * 설정 화면 "AI 로 가는 것"(`SRV-REQ-048` FR-6 · 서버 S3d)이 **프롬프트가 실제로 읽는 칸과 같다**.
 *
 * 입력 칸마다 값을 바꿔 보고 프롬프트가 바뀌는 칸 = 공개 목록의 `fields` 여야 한다. 칸 목록은 `Record<keyof 입력, …>` 라
 * 입력 타입에 칸을 더하면 이 파일이 컴파일에서 깬다 — 새 칸이 공개 없이 AI 로 가지 않게.
 */
const explanationBase: CoachExplanationInput = {
  symbol: "BTC",
  koreanName: "비트코인",
  mode: "scalp",
  currentPrice: 100_000_000,
  change24h: 1.2,
  tradeValue24h: 500_000_000_000,
  evidence: [{ label: "RSI", value: "55" }],
  stance: "watch",
  news: [{ title: "제목", summary: "요약", source: "출처", sentiment: "중립", url: "https://example.com/a", publishedAt: "2026-11-13T00:00:00Z" }],
};

const explanationVariants: Record<keyof CoachExplanationInput, (i: CoachExplanationInput) => CoachExplanationInput> = {
  symbol: (i) => ({ ...i, symbol: "ETH" }),
  koreanName: (i) => ({ ...i, koreanName: "이더리움" }),
  mode: (i) => ({ ...i, mode: "long_term" }),
  currentPrice: (i) => ({ ...i, currentPrice: 90_000_000 }),
  change24h: (i) => ({ ...i, change24h: -3.4 }),
  tradeValue24h: (i) => ({ ...i, tradeValue24h: 900_000_000_000 }),
  evidence: (i) => ({ ...i, evidence: [{ label: "거래량", value: "2배" }] }),
  stance: (i) => ({ ...i, stance: "avoid" }),
  news: (i) => ({ ...i, news: [{ ...i.news![0], title: "다른 제목" }] }),
};

const moveBase: MoveSummaryPrompt = {
  asset: "kr",
  name: "삼성전자",
  direction: "up",
  dominant: "idio",
  facts: [{ n: 1, id: "f1", kind: "news", at: new Date("2026-11-13T01:00:00Z"), source: "출처", text: "실적 발표" }],
};

const moveVariants: Record<keyof MoveSummaryPrompt, (p: MoveSummaryPrompt) => MoveSummaryPrompt> = {
  asset: (p) => ({ ...p, asset: "crypto" }),
  name: (p) => ({ ...p, name: "SK하이닉스" }),
  direction: (p) => ({ ...p, direction: "down" }),
  dominant: (p) => ({ ...p, dominant: "market" }),
  facts: (p) => ({ ...p, facts: [{ ...p.facts[0], text: "다른 사실" }] }),
};

const changed = <T>(build: (x: T) => string, base: T, variants: Record<string, (x: T) => T>): string[] =>
  Object.entries(variants)
    .filter(([, vary]) => build(vary(base)) !== build(base))
    .map(([key]) => key)
    .sort();

const declared = (job: string): string[] =>
  LLM_INPUTS.find((j) => j.job === job)!
    .inputs.flatMap((i) => i.fields)
    .sort();

describe("AI 로 가는 것 — 공개 목록 = 프롬프트가 읽는 칸", () => {
  it("종목 해설: 바꾸면 프롬프트가 바뀌는 칸 = 공개 목록(판단 방향은 검증기만 본다)", () => {
    assert.deepEqual(changed(buildExplanationPrompt, explanationBase, explanationVariants), declared("explanation"));
  });

  it("종목 해설: 뉴스 주소 · 시각은 싣지 않는다(화면 링크일 뿐)", () => {
    const moved = { ...explanationBase, news: [{ ...explanationBase.news![0], url: "https://example.com/other", publishedAt: "2020-01-01T00:00:00Z" }] };
    assert.equal(buildExplanationPrompt(moved), buildExplanationPrompt(explanationBase));
  });

  it("오늘 등락 한 줄: 바꾸면 프롬프트가 바뀌는 칸 = 공개 목록", () => {
    assert.deepEqual(changed(buildMoveSummaryPrompt, moveBase, moveVariants), declared("move_summary"));
  });

  it("사람의 기록은 0 — 공개 항목 전부 personal false · 호출자 사람 칸은 타입으로 null", () => {
    assert.ok(LLM_INPUTS.every((j) => j.inputs.every((i) => i.personal === false)));
    const caller: ExplainCaller = { userId: null };
    // @ts-expect-error — 사람 id 를 실으면 컴파일에서 깬다(`ports.ts` ExplainCaller)
    const withUser: ExplainCaller = { userId: "u1" };
    assert.equal(caller.userId, null);
    assert.ok(withUser);
  });
});
