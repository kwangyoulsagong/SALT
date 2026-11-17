import {
  ForecastNotAvailableError,
  isForecastOwner,
  toEarningsOutlook,
  toMacroEvents,
  type EarningsOutlookView,
  type ForecastReader,
  type MacroEventView,
} from "../domain";

export interface SymbolEventsView {
  symbol: string;
  events: MacroEventView[];
  /** 국내 종목 다음 실적 공시 — 확정 일정 또는 예상 창(확정 아님) + 실적 공시 뒤 반응. 코인 · 자료 없음은 `null`(F008 슬라이스 24 2단계) */
  earnings: EarningsOutlookView | null;
  /** 화면 이름의 근거 — 호재 · 악재를 판정하지 않는다(FEATURE-008 FR-31) */
  label: "주요 사건 (호재 · 악재 판정 아님)";
  disclaimer: string;
}

const DISCLAIMER =
  "과거 같은 일정 뒤 가격이 움직인 분포입니다. 이번에도 같다는 뜻이 아니며 투자 판단과 손실 책임은 본인에게 있습니다.";

/**
 * 다가오는 주요 사건(거시 일정)과 그 뒤 과거 반응 — F008 `SRV-REQ-037` FR-10 · `FC-REQ-005`.
 *
 * 전망과 같은 **소유자 전용**(아니면 404, ADR-003). 숫자는 `forecast.v_event_card` 그대로 — 금액이 없다.
 */
export class GetSymbolEvents {
  constructor(
    private readonly forecasts: ForecastReader,
    private readonly ownerEmails: readonly string[],
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(user: { userId: string; email?: string }, symbol: string): Promise<SymbolEventsView> {
    if (!isForecastOwner(user.email, this.ownerEmails)) throw new ForecastNotAvailableError();
    const normalized = symbol.trim().toUpperCase();
    const [rows, earnings] = await Promise.all([this.forecasts.eventCards(normalized), this.forecasts.earningsOutlook(normalized)]);
    return {
      symbol: normalized,
      events: toMacroEvents(rows),
      earnings: toEarningsOutlook(earnings.window, earnings.reactions, this.now()),
      label: "주요 사건 (호재 · 악재 판정 아님)",
      disclaimer: DISCLAIMER,
    };
  }
}
