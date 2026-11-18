import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CoachExplanationInput } from "../../domain";
import { buildExplanationPrompt, buildLineExplanationPrompt } from "../explanationPrompt";

/**
 * 원인 단계 '없음'이면 원인 줄은 서버가 붙인다 — 두 프롬프트(로컬 CLI 줄 형식 · Gemini JSON) 모두 모델에게 원인을 쓰게 하지 않는다
 * (`SRV-REQ-060` FR-6). 단계가 있으면 지금 지시 그대로
 */

const base: CoachExplanationInput = {
  symbol: "005930", koreanName: "삼성전자", mode: "scalp", currentPrice: 192_700, change24h: 1.26, tradeValue24h: 2.2e12,
  evidence: [{ label: "판단", value: "삼성전자 단타 관점은 관망입니다." }],
};
const none: CoachExplanationInput = {
  ...base,
  cause: { strength: "none", headline: "평소 범위 안의 움직임이에요", note: "따로 볼 만한 원인을 찾지 않았어요", evidence: [], result: "오늘 +1.26%" },
};
const likely: CoachExplanationInput = {
  ...base,
  cause: { strength: "likely", headline: "주주환원 확대 공시", note: "공시 뒤부터 움직였어요", evidence: [], result: "오늘 +1.26%" },
};

describe("해설 프롬프트 — 서버 원인 줄", () => {
  it("줄 형식 — '없음'이면 원인 줄을 쓰지 않게, 있으면 원인 → 근거 → 결과", () => {
    assert.match(buildLineExplanationPrompt(none), /근거: \(1~2줄\) 근거 → 결과 순서\. 원인 줄은 쓰지 않기/);
    assert.doesNotMatch(buildLineExplanationPrompt(none), /원인 → 근거 → 결과/);
    assert.match(buildLineExplanationPrompt(likely), /근거: \(1~3줄\) 원인 → 근거 → 결과 순서/);
  });
  it("JSON — '없음'이면 keyDrivers 예시에 원인 칸이 없다", () => {
    assert.doesNotMatch(buildExplanationPrompt(none), /원인\(원인 후보의 단계 그대로\)/);
    assert.match(buildExplanationPrompt(none), /원인은 쓰지 않기/);
    assert.match(buildExplanationPrompt(likely), /원인\(원인 후보의 단계 그대로\)/);
  });
});
