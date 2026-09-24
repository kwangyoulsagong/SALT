import {
  ForecastNotAvailableError,
  isForecastOwner,
  toForecastHorizon,
  type ForecastHorizonView,
  type ForecastReader,
  type PortfolioProbe,
} from "../domain";

export interface SymbolForecastView {
  symbol: string;
  horizons: ForecastHorizonView[];
  /** 화면 하단 고정 문구의 근거 — 방향 예측이 아니라 과거 채점된 변동 범위다 */
  label: "변동 범위 (방향 예측 아님)";
  disclaimer: string;
}

const DISCLAIMER =
  "과거 분포와 채점 결과로 만든 가격 범위입니다. 예측을 보장하지 않으며 투자 판단과 손실 책임은 본인에게 있습니다.";

/**
 * 종목 가격 전망 — F008 `SRV-REQ-037` · `ADR-003`.
 *
 * ## 소유자만 — 응답에 없어야 한다
 *
 * 전망은 서버 설정의 소유자 계정에만 나간다(ADR-003 §1 · §6). 아닌 계정에는 **404** 다 —
 * "막혔다"는 안내조차 주지 않는다(FEATURE-008 UX "Not owner: 섹션 자체가 없다"). 프론트 플래그로
 * 숨기는 것이 아니라 서버가 내려보내지 않는다.
 *
 * ## 숫자는 전부 `salt-forecast` 가 채점한 것
 *
 * 여기서는 가격 · 원화 환산만 한다. 보유 수량이 있으면 "이 주에 판다면" 평가금액 변화 범위를 싣는다.
 */
export class GetSymbolForecast {
  constructor(
    private readonly forecasts: ForecastReader,
    private readonly portfolio: PortfolioProbe,
    private readonly ownerEmails: readonly string[]
  ) {}

  async execute(user: { userId: string; email?: string }, symbol: string): Promise<SymbolForecastView> {
    if (!isForecastOwner(user.email, this.ownerEmails)) throw new ForecastNotAvailableError();
    const normalized = symbol.trim().toUpperCase();
    const [rows, holding] = await Promise.all([
      this.forecasts.cards(normalized),
      this.portfolio.getHolding(user.userId, normalized),
    ]);
    const horizons = [1, 2, 3, 4].map((h) => {
      const row = rows.find((r) => r.horizonWeeks === h);
      return row
        ? toForecastHorizon(row, holding)
        : {
            horizonWeeks: h,
            renderable: false,
            blockedReason: "not_generated" as const,
            asOf: null,
            basePrice: null,
            range: null,
            scenario: null,
            trackRecord: null,
            modelVersion: "",
          };
    });
    return { symbol: normalized, horizons, label: "변동 범위 (방향 예측 아님)", disclaimer: DISCLAIMER };
  }
}
