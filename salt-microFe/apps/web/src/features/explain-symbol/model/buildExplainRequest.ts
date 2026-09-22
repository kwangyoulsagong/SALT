import type { CoachMode, SymbolCoachViewModel } from "@repo/core/coach";

import { selectModeView } from "@/entities/coach";

import { EXPLAIN_MESSAGES } from "./messages";
import type { ExplainSubject, ExplainSymbolRequest } from "./types";

/** 서버 `explainCoachSchema` 의 상한 */
const EVIDENCE_MAX = 20;
const EVIDENCE_VALUE_MAX = 120;
/** 해설 카드의 "관련 뉴스 5줄 요약"(FR-135) 재료. 서버 상한은 10 */
const NEWS_MAX = 5;
const NEWS_TITLE_MAX = 200;

const clip = (text: string) =>
  text.length > EVIDENCE_VALUE_MAX ? text.slice(0, EVIDENCE_VALUE_MAX) : text;

/**
 * 해설 요청 본문을 만든다. **새 숫자를 만들지 않는다** — 뷰모델과 시세 목록의 값을 라벨과
 * 함께 옮겨 적을 뿐이다(공통 수용 기준 3).
 *
 * 판단이 막힌 모드는 부르는 쪽이 버튼을 그리지 않는다(FR-135). 그래도 여기 오면 `null` 이다.
 */
export const buildExplainRequest = (
  view: SymbolCoachViewModel,
  mode: CoachMode,
  subject: ExplainSubject,
): ExplainSymbolRequest | null => {
  const modeView = selectModeView(view, mode);
  if (!modeView?.renderable) return null;

  const { judgment } = modeView;
  const label = EXPLAIN_MESSAGES.evidence;
  const evidence: ExplainSymbolRequest["evidence"] = [
    { label: label.judgment, value: clip(judgment.headline || judgment.label) },
    ...judgment.reasons.map((reason) => ({ label: label.reason, value: clip(reason) })),
    ...judgment.risks.map((risk) => ({ label: label.risk, value: clip(risk) })),
  ];

  const { technical, sentiment, whale } = view.evidence;
  if (technical?.rsi != null) evidence.push({ label: label.rsi, value: String(technical.rsi) });
  if (sentiment) {
    evidence.push({ label: label.sentiment, value: clip(`${sentiment.score} (${sentiment.label})`) });
  }
  if (whale.count > 0) {
    evidence.push({ label: label.whaleBuy, value: String(whale.buyAmountKRW) });
    evidence.push({ label: label.whaleSell, value: String(whale.sellAmountKRW) });
  }

  const news = view.evidence.news.slice(0, NEWS_MAX).map((item) => ({
    title: item.title.slice(0, NEWS_TITLE_MAX),
    source: item.source,
  }));

  return {
    symbol: view.symbol,
    koreanName: subject.koreanName,
    mode,
    currentPrice: subject.currentPrice,
    change24h: subject.change24h,
    tradeValue24h: subject.tradeValue24h,
    evidence: evidence.slice(0, EVIDENCE_MAX),
    ...(news.length > 0 ? { news } : {}),
  };
};
