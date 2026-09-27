import type { TradeBehaviorPreviewResult, TradeSide } from "@repo/core/coach";

import { formatPrice } from "@/shared/lib";

import { formatSignedDecimal, formatSignedRate, tagName } from "../lib";
import { MIRROR_MESSAGES } from "../model";
import { previewLine, previewLines, previewQuestion } from "./Mirror.css";

const { preview: P, tags: TAGS } = MIRROR_MESSAGES;

interface TradeBehaviorLinesProps {
  side: TradeSide;
  /** 사이즈 계산 응답의 `behavior`. 못 구했으면 `null` — 아무것도 그리지 않는다 */
  preview: TradeBehaviorPreviewResult;
}

/**
 * 거래 폼 아래 한 줄 (F009 FR-19 · 시나리오 5 · `FE-REQ-039`). **차단이 아니다** — 저장 버튼은 그대로다.
 *
 * - 매수: 이 거래가 붙을 자동 태그 중 **엣지 없음**(서버가 고른 것)만 한 줄씩. 없으면 아무것도 없다
 * - 매도: "오늘 처음 본다면" 질문 + 계획 손절 vs 지금. 매입가 · 손익률은 없다(미래를 보게 한다)
 */
export const TradeBehaviorLines = ({ side, preview }: TradeBehaviorLinesProps) => {
  if (preview === null) return null;

  if (side === "sell") {
    const framing = preview.sellFraming;
    if (!framing) return null;
    const now = framing.currentPrice !== null ? formatPrice(framing.currentPrice) : null;
    const line =
      framing.stopPrice !== null && now !== null
        ? P.sellStopVsNow(formatPrice(framing.stopPrice), now)
        : now !== null
          ? P.sellNowOnly(now)
          : null;
    return (
      <ul className={previewLines} aria-label={P.sellQuestion}>
        <li className={previewQuestion}>{P.sellQuestion}</li>
        {line && <li className={previewLine}>{line}</li>}
      </ul>
    );
  }

  const warnings = preview.edgeWarnings.flatMap((warning) => {
    const expectancy =
      warning.avgR !== null
        ? TAGS.expectancyR(formatSignedDecimal(warning.avgR))
        : warning.avgReturn !== null
          ? TAGS.expectancyReturn(formatSignedRate(warning.avgReturn))
          : null;
    return expectancy ? [{ tag: warning.tag, text: P.edge(tagName(warning.tag), warning.count, expectancy) }] : [];
  });
  if (warnings.length === 0) return null;

  return (
    <ul className={previewLines}>
      {warnings.map((warning) => (
        <li key={warning.tag} className={previewLine}>
          {warning.text}
        </li>
      ))}
    </ul>
  );
};
