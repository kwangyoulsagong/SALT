import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { templateExplanation, verifyExplanation } from "../policy/explanationTemplate";
import { languageViolations } from "../policy/languageGuard";
import { explanationFixtures } from "./fixtures/explanationFixtures";

/**
 * 해설 품질 — 픽스처 50건(FEATURE-008 FR-49 · `SRV-REQ-037` FR-15).
 *
 * 해설 품질은 예측 적중률과 **따로** 잰다 — 해설 방식은 판단 · 채점에 영향이 없다. 여기서는 사람이 없어도
 * 재는 네 가지를 템플릿 해설(LLM 이 실패하거나 걸릴 때 나가는 바닥 문장)에 건다:
 *
 * | 지표 | 정의 | 기준 |
 * |---|---|---|
 * | 사실 정확도 | 템플릿을 LLM 문장처럼 검증기(`verifyExplanation` — 숫자 · 단위 · 방향 · 극성 · 금지어)에 넣었을 때 버려진 문장 | 0 |
 * | 금지어 | 확신 · 명령형 매매 · 목표가 · 성적 금지어(`languageViolations`) | 0 |
 * | 인용률 | 뉴스 요약 줄 중 입력 기사 하나로 거슬러 가고 출처 이름이 붙은 줄 | 100% |
 * | 가독성 | 문장 평균 길이 · 최대 길이(공백 포함 글자 수) · 빈 칸 | 평균 ≤ 60 · 최대 ≤ 160 · 빈 칸 0 |
 *
 * 픽스처는 `fixtures/explanationFixtures.ts` — 규칙이 실제로 만드는 판단 문장으로 만든다.
 * 사람이 보는 블라인드 비교(LLM vs 템플릿 20건)는 `scripts/explain-ab-sheet.ts` 가 평가지를 만든다.
 */

const FIXTURES = explanationFixtures(50);
const NOW = new Date(Date.UTC(2026, 10, 2));

/** 화면이 문장으로 읽는 단위 — 마침표 · 물음표 · 느낌표 뒤 공백에서 끊는다(스트림 `sentencesOf` 와 같은 기준) */
const sentences = (text: string): string[] => text.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);

const measure = () => {
  let dropped = 0;
  let violations = 0;
  let newsLines = 0;
  let citedLines = 0;
  let emptySections = 0;
  const lengths: number[] = [];
  for (const input of FIXTURES) {
    const t = templateExplanation(input, NOW);
    dropped += verifyExplanation(t, input, NOW).dropped.length;
    const all = [t.modeReasoning, ...t.keyDrivers, ...t.risks, ...t.newsSummary].flatMap(sentences);
    violations += all.filter((s) => languageViolations(s).length > 0).length;
    lengths.push(...all.map((s) => s.length));
    if (!t.modeReasoning || t.keyDrivers.length === 0 || t.risks.length === 0) emptySections += 1;
    for (const line of t.newsSummary) {
      const src = (input.news ?? []).find((n) => line.startsWith(n.title));
      if (!src?.source) continue; // 출처 이름 없는 기사 — 붙일 출처가 없다
      newsLines += 1;
      if (line.endsWith(`(${src.source})`)) citedLines += 1;
    }
  }
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  return { dropped, violations, newsLines, citedLines, emptySections, avg, max: Math.max(...lengths), count: lengths.length };
};

describe("해설 품질 — 템플릿 픽스처 50건 (FEATURE-008 FR-49)", () => {
  const m = measure();

  it("측정값", () => {
    // 출처 없는 기사(`source` 빈 값)는 인용률 분모에서 뺀다 — 이름이 없으면 붙일 출처가 없다
    // 체크리스트에 옮겨 적는 줄 — 기준이 바뀌면 이 값부터 본다
    console.log(
      `[explain-quality] fixtures=50 sentences=${m.count} dropped=${m.dropped} violations=${m.violations} ` +
        `cited=${m.citedLines}/${m.newsLines} empty=${m.emptySections} avgLen=${m.avg.toFixed(1)} maxLen=${m.max}`
    );
    assert.equal(FIXTURES.length, 50);
  });

  it("사실 정확도 — 검증기가 버리는 템플릿 문장 0", () => assert.equal(m.dropped, 0));
  it("금지어 0", () => assert.equal(m.violations, 0));
  it("인용률 100% — 출처 있는 기사 줄은 전부 출처가 붙는다", () => {
    const withSource = FIXTURES.flatMap((f) => (f.news ?? []).slice(0, 5)).filter((n) => n.source).length;
    assert.equal(m.newsLines, withSource);
    assert.equal(m.citedLines, m.newsLines);
  });
  it("가독성 — 평균 ≤ 60자 · 최대 ≤ 160자 · 빈 칸 0", () => {
    assert.equal(m.emptySections, 0);
    assert.ok(m.avg <= 60, `avg ${m.avg}`);
    assert.ok(m.max <= 160, `max ${m.max}`);
  });
  it("판단 문장을 따옴표로 감싸 \"입니다\"를 덧붙이지 않는다(2026-11-02 블라인드 평가 · 실화면)", () => {
    for (const f of FIXTURES) assert.doesNotMatch(templateExplanation(f, NOW).modeReasoning, /["”]입니다/);
  });
  it("결정적이다 — 같은 입력이면 같은 문장", () => {
    const a = FIXTURES.map((f) => JSON.stringify(templateExplanation(f, NOW)));
    const b = FIXTURES.map((f) => JSON.stringify(templateExplanation(f, NOW)));
    assert.deepEqual(a, b);
  });
});
