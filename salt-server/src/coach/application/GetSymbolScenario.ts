import { logger } from "../../shared/config/logger";
import {
  ForecastNotAvailableError,
  isForecastOwner,
  judgmentAssetClassFor,
  toScenarioHorizons,
  type MarketProbe,
  type ScenarioHorizonView,
  type ScenarioMarket,
  type ShortHorizonReader,
} from "../domain";

export interface SymbolScenarioView {
  symbol: string;
  market: ScenarioMarket;
  /** 늘 셋(1h · 4h · 1d). 막힌 지평은 확률 없이 이유와 시험 성적만 */
  horizons: ScenarioHorizonView[];
  /** 화면 하단 고정 문구 — 확률은 시험을 넘은 칸만, 대칭 범위로 바꿔 채우지 않는다 */
  disclaimer: string;
}

const DISCLAIMER =
  "시험(사전등록 · 기간 나눔 · 비용 차감 · 보정도)을 넘은 칸만 확률을 보여 줍니다. 확률은 자주 빗나가며 투자 판단과 손실 책임은 본인에게 있습니다.";

/**
 * 시나리오 카드 — 다음 1시간 · 4시간 · 1일 오를 확률(F017 v2 단계 5 · `SRV-REQ-053` FR-5 · `FEATURE-017` FR-4).
 *
 * **소유자만**(`ADR-003` — 전망과 같은 판정, 아니면 404 · 읽지도 않는다). 숫자는 예측 뷰가 정하고 여기서는 시장을 고르고
 * 칸 · 예측을 한 번씩 읽어 지평 셋으로 맞출 뿐이다. 뷰 읽기가 실패해도 500 이 아니라 지평 셋 전부 `not_tested`.
 */
export class GetSymbolScenario {
  constructor(
    private readonly reader: ShortHorizonReader,
    private readonly market: MarketProbe,
    private readonly ownerEmails: readonly string[],
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(user: { userId: string; email?: string }, symbol: string): Promise<SymbolScenarioView> {
    if (!isForecastOwner(user.email, this.ownerEmails)) throw new ForecastNotAvailableError();
    const normalized = symbol.trim().toUpperCase();
    const quote = (await this.market.quotes([normalized])).get(normalized);
    const market: ScenarioMarket = judgmentAssetClassFor(quote?.assetType) === "kr_stock" ? "kr" : "crypto";
    const read = await Promise.all([this.reader.cells(market), this.reader.predictions(normalized, market)]).catch(
      (error: unknown) => {
        logger.warn("시나리오 뷰 읽기 실패 — not_tested 로", { symbol: normalized, error: String(error) });
        return null;
      }
    );
    const [cells, predictions] = read ?? [[], []];
    return {
      symbol: normalized,
      market,
      horizons: toScenarioHorizons(market, cells, predictions, this.now()),
      disclaimer: DISCLAIMER,
    };
  }
}
