/**
 * 리스크 레이더 4축(F006 G절 FR-73 · `SRV-REQ-028` FR-82) — 집중도 · 변동성 · 낙폭 · 뉴스 리스크.
 *
 * 축마다 0~100 점(`value`) · 원래 단위 값(`raw`) · 상한(`limit`, 점) · 넘음(`breached`) · 사유 코드. 축 정의(창 · 만점 기준)와
 * 상한은 **서버 설정**(`env.ts` `PORTFOLIO_RADAR_*`)에서 들어온다 — 이 파일에 숫자 문턱이 없다.
 * 재료가 모자란 축은 `value: null` + `insufficient_data` — 0 점으로 그리지 않는다(FE FR-92). 현금 비중 축은 없다(입금 기록이 없다).
 */

export type RadarAxisKey = "concentration" | "volatility" | "drawdown" | "news";
export type RadarReasonCode = "over_limit" | "within_limit" | "insufficient_data";

export interface RadarAxis {
  key: RadarAxisKey;
  /** 0~100 점. 재료가 모자라면 `null` */
  value: number | null;
  /** 원래 단위 — 집중도 · 뉴스 = %, 변동성 = 연율 %, 낙폭 = % (음수) */
  raw: number | null;
  limit: number;
  breached: boolean;
  reasonCode: RadarReasonCode;
  /** 집중도 축의 최대 비중 종목 — 다른 축은 `null` */
  subject: string | null;
}

export interface RiskRadarPolicy {
  concentrationLimit: number;
  /** 연율 변동성 몇 % 를 100 점으로 보나 */
  volatilityFullScalePct: number;
  volatilityLimit: number;
  /** 낙폭 몇 % 를 100 점으로 보나(양수) */
  drawdownFullScalePct: number;
  drawdownLimit: number;
  newsLimit: number;
  /** 종목 하나가 뉴스 축에 들어가려면 감성이 붙은 기사가 몇 건 이상이어야 하나 */
  newsMinArticles: number;
  /** 뉴스 축 값을 내려면 평가금 중 몇 % 가 기사 조건을 채워야 하나 */
  newsMinCoveragePct: number;
}

export interface RadarInputs {
  /** 최대 비중 — 보유가 없거나 평가금 합이 0 이면 `null` */
  topWeight: { symbol: string; pct: number } | null;
  /** 연율 변동성(%) — `annualizedVolatility` */
  volatilityPct: number | null;
  /** 창 최대 낙폭(%, 0 이하) — `maxDrawdown` */
  drawdownPct: number | null;
  /** 보유마다 평가금 비중(%) · 감성 붙은 기사 수 · 그중 부정 수 */
  news: Array<{ weightPct: number; labeled: number; negative: number }>;
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const axis = (
  key: RadarAxisKey,
  value: number | null,
  raw: number | null,
  limit: number,
  subject: string | null = null,
): RadarAxis => {
  if (value === null) return { key, value: null, raw: null, limit, breached: false, reasonCode: "insufficient_data", subject };
  const breached = value >= limit;
  return { key, value, raw, limit, breached, reasonCode: breached ? "over_limit" : "within_limit", subject };
};

/**
 * 뉴스 리스크 — 기사 조건을 채운 보유만 평가금으로 가중한 부정 기사 비중(%). 그 보유의 비중 합이 문턱 미만이면 `null`
 * (국내 주식 제목엔 감성이 없다 — 국내만 들고 있으면 이 축은 "데이터 부족"이다)
 */
export const newsNegativeShare = (
  news: RadarInputs["news"],
  policy: Pick<RiskRadarPolicy, "newsMinArticles" | "newsMinCoveragePct">,
): number | null => {
  const covered = news.filter((n) => n.labeled >= policy.newsMinArticles && n.weightPct > 0);
  const coverage = covered.reduce((acc, n) => acc + n.weightPct, 0);
  if (covered.length === 0 || coverage < policy.newsMinCoveragePct) return null;
  return covered.reduce((acc, n) => acc + n.weightPct * (n.negative / n.labeled), 0) / coverage * 100;
};

export const buildRiskRadar = (inputs: RadarInputs, policy: RiskRadarPolicy): RadarAxis[] => {
  const news = newsNegativeShare(inputs.news, policy);
  return [
    axis("concentration", inputs.topWeight ? clamp(inputs.topWeight.pct) : null, inputs.topWeight?.pct ?? null,
      policy.concentrationLimit, inputs.topWeight?.symbol ?? null),
    axis("volatility",
      inputs.volatilityPct === null ? null : clamp((inputs.volatilityPct / policy.volatilityFullScalePct) * 100),
      inputs.volatilityPct, policy.volatilityLimit),
    axis("drawdown",
      inputs.drawdownPct === null ? null : clamp((Math.abs(inputs.drawdownPct) / policy.drawdownFullScalePct) * 100),
      inputs.drawdownPct, policy.drawdownLimit),
    axis("news", news === null ? null : clamp(news), news, policy.newsLimit),
  ];
};
