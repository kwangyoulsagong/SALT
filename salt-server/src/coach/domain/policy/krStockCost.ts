import { KstDate } from "../../../shared/domain";

/**
 * 국내 주식 명시 비용(F011 `SRV-REQ-040` FR-44 · 리서치 권고 18). 왕복 = 위탁 수수료 한쪽 × 2 + **매도 거래세**.
 *
 * 거래세는 매도일로 정해진다 — 채점 이력에 2025 매도(0.15%)가 섞이는데 2026 세율(0.20%)로 채점하면 과거 성과가
 * 실제와 다르다. 그래서 상수 하나가 아니라 **구간 표**다. 표는 세법이 바뀔 때만 고친다(사전등록
 * `kr-judgment-backtest@2` [[sell_tax]] 와 같은 값 — 둘이 갈라지면 백테스트와 라이브가 다른 비용으로 채점된다).
 *
 * 코스피 = 증권거래세 + 농어촌특별세 0.15%, 코스닥 = 증권거래세 단일. 아래 구간은 두 시장 합계가 같다.
 * 코넥스(0.10%)는 서버 마스터에 없다. 세법상 양도 시기(결제 T+2)와 매도일의 어긋남 — 연말 1~2 거래일 — 은 근사로 둔다.
 *
 * 암묵 비용(스프레드 · 슬리피지)은 넣지 않는다 — 근거 수치가 없다(권고 18 '약'). 응답은 명시 비용만이라고 밝힌다.
 * 세금은 **세전**이다 — 대주주 양도세 · 배당 분리과세는 개인 사정이라 서버가 계산하지 않는다.
 */
export const KR_STOCK_SELL_TAX: readonly { from: string; rate: number }[] = [
  { from: "2021-01-01", rate: 0.0023 },
  { from: "2023-01-01", rate: 0.002 },
  { from: "2024-01-01", rate: 0.0018 },
  { from: "2025-01-01", rate: 0.0015 },
  { from: "2026-01-01", rate: 0.002 },
];

/**
 * 위탁 수수료 한쪽 기본값 — 비대면 기본 0.015% + 유관기관 제비용 약 0.0036%. 우대(0.0036% 만)면 왕복이 0.207% 로
 * 낮아지지만 보수적 쪽을 쓴다. 증권사가 바뀌면 env(`KR_STOCK_COMMISSION_RATE_PER_SIDE`)로 바꾼다
 */
export const DEFAULT_KR_STOCK_COMMISSION_PER_SIDE = 0.000186;

/** 매도일(KST)의 거래세율. 표보다 앞선 날짜는 첫 구간 — 서버 일봉은 2021 이후다 */
export const krStockSellTaxRate = (soldAt: Date): number => {
  const day = KstDate.fromInstant(soldAt).toString();
  let rate = KR_STOCK_SELL_TAX[0].rate;
  for (const band of KR_STOCK_SELL_TAX) {
    if (band.from <= day) rate = band.rate;
  }
  return rate;
};

/** 그 매도일의 국내 주식 왕복 명시 비용 */
export const krStockRoundTripCost = (soldAt: Date, commissionPerSide: number): number =>
  commissionPerSide * 2 + krStockSellTaxRate(soldAt);
