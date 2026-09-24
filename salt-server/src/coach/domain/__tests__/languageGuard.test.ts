import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  guardSentences,
  isAllowedNumber,
  languageViolations,
  templateExplanation,
  verifyExplanation,
  type CoachExplanation,
  type CoachExplanationInput,
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

describe("숫자 대조", () => {
  it("반올림 · 부호 · 작은 개수는 허용하고 입력에 없는 숫자는 막는다", () => {
    assert.equal(isAllowedNumber(2.3, [2.34]), true);
    assert.equal(isAllowedNumber(-2.34, [2.34]), true);
    assert.equal(isAllowedNumber(3, []), true); // "3가지"
    assert.equal(isAllowedNumber(145000, [100]), false);
    const r = guardSentences(["RSI 28입니다.", "RSI 72입니다."], [28]);
    assert.deepEqual(r.kept, ["RSI 28입니다."]);
    assert.deepEqual(r.dropped[0]?.reasons, ["unverified_number"]);
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
