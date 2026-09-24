import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  fact,
  guardSentences,
  languageViolations,
  numericTokens,
  templateExplanation,
  verifyExplanation,
  type CoachExplanation,
  type CoachExplanationInput,
  type NumericFact,
} from "../index";

/** 말투 · 숫자 검증기 (F008 `SRV-REQ-037` FR-7 · 공통 수용 기준 4). */

describe("languageViolations", () => {
  it("확신 · 명령형 매매 지시 · 목표가를 잡는다", () => {
    assert.deepEqual(languageViolations("이번 상승은 확실합니다."), ["certainty"]);
    assert.deepEqual(languageViolations("지금 분할 매수를 고려하세요."), ["imperative_trade"]);
    assert.deepEqual(languageViolations("비중 축소를 검토하세요."), ["imperative_trade"]);
    assert.deepEqual(languageViolations("지금 파세요."), ["imperative_trade"]);
    assert.deepEqual(languageViolations("목표가는 1억 5천입니다."), ["target_price"]);
  });

  it("사실 서술 · 면책 부정문 · 행동 기록 권유는 통과한다", () => {
    for (const ok of [
      "점수상 매수 검토 구간입니다.",
      "과거 분포 기반 범위이며 예측을 보장하지 않습니다.",
      "거래 전 진입가를 적어 두면 비교할 수 있습니다.",
      "RSI 28로 과매도 구간입니다.",
    ]) {
      assert.deepEqual(languageViolations(ok), [], ok);
    }
  });
});

describe("숫자 대조 — 값 · 단위 · 방향 (C03)", () => {
  const facts = [fact(2.34, "percent"), fact(-20, "percent"), ...numericTokens("RSI 31 · 공포 심리 22")];

  it("반올림 · 같은 방향 · 세는 말은 허용한다", () => {
    for (const ok of ["변동률은 2.3%예요.", "20% 하락했어요.", "−20% 움직였어요.", "RSI가 31이에요.", "RSI 31점이에요.", "두 가지, 3개 요인이 있어요."]) {
      assert.deepEqual(guardSentences([ok], facts).dropped, [], ok);
    }
  });

  it("진단 C03 의 재현 문장을 막는다", () => {
    const cases: Array<[string, NumericFact[], string]> = [
      ["수익률은 12%예요.", [], "unverified_number"],
      ["가격이 20% 상승했어요.", [fact(-20, "percent")], "unverified_number"],
      ["금리가 상승해서 가격이 하락했어요.", [], "unsupported_causal"],
      ["31% 올랐어요.", numericTokens("RSI 31"), "unverified_number"],
    ];
    for (const [sentence, f, reason] of cases) {
      assert.deepEqual(guardSentences([sentence], f).dropped[0]?.reasons, [reason], sentence);
    }
  });

  it("원 · 억 · 만은 같은 금액이다", () => {
    const price = [fact(115_650_000, "krw")];
    assert.deepEqual(guardSentences(["현재가는 1억 1,565만 원이에요."], price).dropped, []);
    assert.deepEqual(guardSentences(["현재가는 115,650,000원이에요."], price).dropped, []);
    assert.equal(guardSentences(["현재가는 2억 원이에요."], price).dropped.length, 1);
  });

  it("근거 숫자가 있는 인과는 통과한다", () => {
    assert.deepEqual(guardSentences(["RSI가 31로 떨어져서 과매도 구간이에요."], facts).dropped, []);
  });

  it("날짜의 하이픈은 부호가 아니다", () => {
    assert.deepEqual(numericTokens("2026-09-24").map((t) => [t.value, t.sign]), [[2026, null], [9, null], [24, null]]);
  });

  it("규칙 문장(사실 없이 부르면)은 숫자를 보지 않는다", () => {
    assert.deepEqual(guardSentences(["수익률은 12%예요."]).dropped, []);
  });
});

const input: CoachExplanationInput = {
  symbol: "BTC",
  koreanName: "비트코인",
  mode: "long_term",
  currentPrice: 115_650_000,
  change24h: -1.23,
  tradeValue24h: 312_000_000_000,
  evidence: [
    { label: "판단", value: "장기 모아가기 후보" },
    { label: "근거", value: "공포 심리 22" },
    { label: "근거", value: "RSI 31" },
    { label: "주의", value: "거래대금 감소" },
  ],
  news: [{ title: "BTC ETF 순유입 3일째", source: "코인데스크" }],
};

describe("templateExplanation", () => {
  it("입력 사실로만 만들고 말투 검사를 통과한다", () => {
    const t = templateExplanation(input, new Date("2026-09-24T00:00:00Z"));
    assert.deepEqual(t.keyDrivers, ["공포 심리 22", "RSI 31"]);
    assert.deepEqual(t.risks, ["거래대금 감소"]);
    assert.deepEqual(t.newsSummary, ["BTC ETF 순유입 3일째 (코인데스크)"]);
    const all = [t.modeReasoning, t.timeframe, ...t.keyDrivers, ...t.risks, ...t.newsSummary];
    const v = verifyExplanation({ ...t, disclaimer: "", generatedAt: "", cached: false } as CoachExplanation, input, new Date());
    assert.equal(v.dropped.length, 0, JSON.stringify(v.dropped));
    assert.ok(all.every((s) => languageViolations(s).length === 0));
  });
});

/**
 * 코치 규칙 문장 전수 검사 — 사용자에게 가는 한국어 문자열 리터럴(주석 제외)에 명령형 매매 지시 · 확신 표현이 0건.
 * 2026-09-24 전에는 "분할 매수를 고려하세요" 같은 문장이 규칙 코드에 있었다.
 */
describe("코치 규칙 문장", () => {
  it("명령형 매매 지시 · 확신 · 목표가 0건", () => {
    const dirs = ["../policy", "../../application"].map((d) => join(__dirname, d));
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "languageGuard.ts")) {
        const code = readFileSync(join(dir, file), "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*$/gm, "");
        for (const m of code.matchAll(/["`]([^"`\n]*[가-힣][^"`\n]*)["`]/g)) {
          if (languageViolations(m[1]).length) offenders.push(`${file}: ${m[1]}`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });
});
