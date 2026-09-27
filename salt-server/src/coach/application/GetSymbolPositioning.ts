import {
  ForecastNotAvailableError,
  isForecastOwner,
  toPositioning,
  type Clock,
  type ForecastReader,
  type PositioningView,
} from "../domain";

export interface SymbolPositioningView extends PositioningView {
  symbol: string;
  /** 화면 이름의 근거 — 매매 신호 · 과열 판정이 아니다(FEATURE-008 FR-31 과 같은 선) */
  label: "쏠림 신호 (매매 신호 아님)";
  disclaimer: string;
}

const DISCLAIMER =
  "선물 펀딩비 · 김치 프리미엄이 지금 어디쯤인지와, 과거 같은 신호 뒤 가격이 움직인 분포입니다. 이번에도 같다는 뜻이 아니며 투자 판단과 손실 책임은 본인에게 있습니다.";

/**
 * 쏠림 신호(선물 펀딩비 · 김치 프리미엄) — F008 `SRV-REQ-037` FR-11 · `FC-REQ-007`.
 *
 * 주요 사건과 같은 **소유자 전용**(아니면 404, ADR-003) — 과거 반응 분포는 전망과 같은 종류의 숫자다.
 * 숫자는 두 뷰 그대로이고 원화 금액이 없다(미결제약정은 거래소 공개 값, USD).
 */
export class GetSymbolPositioning {
  constructor(
    private readonly forecasts: ForecastReader,
    private readonly ownerEmails: readonly string[],
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(user: { userId: string; email?: string }, symbol: string): Promise<SymbolPositioningView> {
    if (!isForecastOwner(user.email, this.ownerEmails)) throw new ForecastNotAvailableError();
    const normalized = symbol.trim().toUpperCase();
    const { row, reactions } = await this.forecasts.positioning(normalized);
    return {
      symbol: normalized,
      ...toPositioning(row, reactions, this.clock()),
      label: "쏠림 신호 (매매 신호 아님)",
      disclaimer: DISCLAIMER,
    };
  }
}
