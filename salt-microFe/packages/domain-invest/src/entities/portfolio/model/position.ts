import type { FlowRange, LedgerAssetType, LedgerSide, RadarAxisKey } from "@repo/core/position";

export type {
  FlowRange,
  LedgerAssetType,
  LedgerFigures,
  LedgerSide,
  PositionFlowVM,
  PositionOverviewVM,
  PositionRadarAxis,
  PositionTransactionPageVM,
  PositionTransactionVM,
  RadarAxisKey,
  TransactionCreateInput,
  TransactionPatchInput,
  TransactionPreviewInput,
  TransactionPreviewVM,
} from "@repo/core/position";
export { INSUFFICIENT_QUANTITY_CODE } from "@repo/core/position";

/** 기간 버튼 순서(FR-71) — 기본은 1개월 */
export const FLOW_RANGES: ReadonlyArray<{ value: FlowRange; label: string }> = [
  { value: "1w", label: "1주" },
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "1y", label: "1년" },
];
export const DEFAULT_FLOW_RANGE: FlowRange = "1m";

const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
/** 부호를 문자로도(색만으로 말하지 않는다 — `a11y-policy.md`) */
export const formatSignedPct = (n: number) => `${sign(n)}${Math.abs(n).toFixed(2)}%`;

/** 축 이름 · 원래 단위 값 표기 — 모르는 키는 BFF 가 거른다(FR-93) */
export const RADAR_AXIS: Record<RadarAxisKey, { label: string; raw: (raw: number) => string; what: string }> = {
  concentration: { label: "집중도", raw: (raw) => `최대 비중 ${raw.toFixed(1)}%`, what: "한 종목이 평가금에서 차지하는 비중" },
  volatility: { label: "변동성", raw: (raw) => `연율 ${raw.toFixed(1)}%`, what: "최근 30일 하루 수익률의 흔들림(연율)" },
  drawdown: { label: "낙폭", raw: (raw) => `최대 ${formatSignedPct(raw)}`, what: "최근 90일 최고점에서 가장 깊이 내려간 폭" },
  news: { label: "뉴스 리스크", raw: (raw) => `부정 기사 ${raw.toFixed(0)}%`, what: "최근 7일 보유 종목 기사 중 부정 비중" },
};

export const POSITION_MESSAGES = {
  heading: "포지션",
  loading: "포지션을 불러오는 중이에요",
  loadFailed: "포지션을 불러오지 못했어요.",
  flowLoadFailed: "평가금 흐름을 불러오지 못했어요.",
  signInRequired: "로그인하면 포지션을 볼 수 있어요.",
  /** 보유 0(FR-78) — 차트 · 레이더를 0 으로 그리지 않는다 */
  emptyTitle: "첫 보유 기록을 입력하세요",
  emptyBody: "이미 산 거래를 적으면 평가금 · 흐름 · 리스크가 여기 모여요. 주문은 나가지 않아요.",
  /** 하단 링크(FR-109) */
  manageLink: "보유 기록 관리",
  settingsLink: "설정",
  hero: {
    totalValue: "총 평가금",
    profit: "평가 손익",
    invested: "투자 원금",
    holdingsCount: "보유 종목",
    topWeight: "최대 비중",
    return30d: "30일 수익률",
    count: (n: number) => `${n}개`,
    /** 매입가 숨김(F009 FR-27) — 원금 · 손익을 그리지 않는다 */
    hiddenByPurchasePrice: "매입가 숨김 중",
    return30dNone: "30일 미만 보유",
    rateNone: "—",
    return30dNote: "매수 · 매도 금액을 뺀 수익률이에요(시간가중).",
  },
  flow: {
    heading: "평가금 흐름",
    rangeLabel: "기간",
    mdd: "기간 최대 낙폭",
    mddRange: (peak: string, trough: string) => `${peak} 고점 → ${trough} 저점`,
    mddNone: "아직 이틀 치 기록이 없어요",
    periodReturn: "기간 수익률",
    note: "그날 들고 있던 수량 × 그날 종가예요. 지난 사실이고 예측이 아니에요.",
    empty: "이 기간에는 보유 기록이 없어요.",
    chartLabel: (range: string, from: string, to: string) => `${range} 평가금 흐름, ${from}부터 ${to}까지`,
    missing: (symbols: string) => `종가가 아직 없는 종목(${symbols})은 그날 평가금에서 빠졌어요.`,
  },
  radar: {
    heading: "리스크 레이더",
    chartLabel: "리스크 레이더 4축 점수",
    tableCaption: "축별 점수와 상한",
    axis: "축",
    score: "점수",
    limit: "상한",
    measure: "잰 값",
    insufficient: "데이터 부족",
    over: "상한 이상",
    within: "상한 아래",
    /** 상한에 닿은 축의 사유 — 사실만 말한다(명령형 · 원인 단정 0) */
    reason: (label: string, score: number, limit: number) => `${label} ${score.toFixed(0)}점 — 상한 ${limit}점 이상이에요.`,
    concentrationReason: (name: string, pct: number, limit: number) =>
      `${name} 한 종목이 평가금의 ${pct.toFixed(1)}%예요 — 상한 ${limit}% 이상이에요.`,
    newsNote: "국내 주식 기사엔 감성 표시가 없어 뉴스 축에 들어가지 않아요.",
    scaleNote: "점수는 0~100이고 상한은 서버 설정값이에요.",
  },
  degraded: {
    unvalued_holding: "시세가 아직 반영되지 않은 보유가 있어요.",
    timeline_truncated: "거래 기록이 많아 앞부분을 다 읽지 못했어요.",
    missing_close: "종가가 아직 없는 종목이 있어 일부 날짜 평가금이 작게 나왔어요.",
    flow_unavailable: "가격 기록을 불러오지 못해 30일 수익률 · 변동성 · 낙폭을 비웠어요.",
    news_unavailable: "뉴스를 불러오지 못해 뉴스 리스크 축을 비웠어요.",
  } as Record<string, string>,
} as const;

/** 거래 기록 표시 이름(F006 G절 2단계) — 시트 · 목록이 같이 쓴다 */
export const LEDGER_SIDE_LABEL: Record<LedgerSide, string> = { buy: "매수", sell: "매도" };
export const LEDGER_ASSET_LABEL: Record<LedgerAssetType, string> = { crypto: "코인", kr_stock: "국내 주식" };

/** 거래일 표시 — 한국 날짜(목록 · 시트 거래일 칸 기본값). 시각은 적지 않는다(손으로 적은 날짜다) */
export const toKoreanDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

export const TRANSACTION_LIST_MESSAGES = {
  /** 패널 제목 — 페이지 제목("보유 기록 관리")과 겹치지 않게 */
  heading: "거래 기록",
  description: "적어 둔 매수 · 매도 기록이에요. 고르면 고치거나 지울 수 있어요. 주문은 나가지 않아요.",
  loading: "거래 기록을 불러오는 중이에요",
  loadFailed: "거래 기록을 불러오지 못했어요.",
  empty: "아직 적은 거래가 없어요.",
  more: "더 보기",
  namesDegraded: "종목 이름을 불러오지 못해 코드로 보여요.",
  rowLabel: (name: string, side: string, date: string) => `${date} ${name} ${side} 기록 고치기`,
  quantityAt: (quantity: string, price: string) => `${quantity} × ${price}원`,
  backToPortfolio: "포트폴리오",
} as const;
