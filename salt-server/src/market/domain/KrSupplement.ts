/**
 * 국내 주식 부가 정보(F011 슬라이스 6 · `SRV-REQ-040` FR-49 · 50) — 코스피 · 코스닥 지수 요약과 종목별 투자자 매매동향.
 *
 * 시세(`KrStock.ts`)와 파일을 나눈 이유: 둘 다 **없어도 화면 본문이 선다**(부가 정보). 읽기는 저장값만이고,
 * 수집은 한도가 모자라면 가장 먼저 물러난다(FR-91 — 실시간 > 보유 · 관심 폴링 > 시총 폴링 > 일봉 > 부가).
 */

import { kstAt, kstDateOf } from "./KrStock";
import type { KrAfterHoursQuote } from "./KrStock";

// ==================== 지수 (FR-48) ====================

/** KIS 업종 코드 → 화면 이름. 서버가 이름까지 정한다 — 프론트 상수 금지(요약은 서버 소유) */
export const KR_INDEX_NAMES: Readonly<Record<string, string>> = {
  "0001": "코스피",
  "1001": "코스닥",
  "2001": "코스피 200",
};

/**
 * `KIS_SUMMARY_INDICES`("0001,1001") → 보여 줄 지수 코드(설정 순서 = 화면 순서). 이름을 모르는 코드 · 중복은 버린다 —
 * 오타 하나가 빈 칸을 그리지 않게
 */
export const parseKrSummaryIndices = (raw: string): string[] => [
  ...new Set(
    raw
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code in KR_INDEX_NAMES)
  ),
];

/** 지수 조회 한 건 — 값은 포인트, 등락은 전일 대비(부호 포함) */
export interface KrIndexQuoteFact {
  code: string;
  value: number;
  change: number;
  changeRate: number;
  /** 상승 · 보합 · 하락 종목 수 — 시장 분위기 한 줄(코인 요약의 분위기 칸과 같은 자리) */
  advancers: number | null;
  unchanged: number | null;
  decliners: number | null;
}

export interface StoredKrIndexQuote extends KrIndexQuoteFact {
  updatedAt: Date;
}

// ==================== 투자자별 매매동향 (FR-29) ====================

/** 투자자 한 부류의 하루 순매수 — 수량(주)과 금액(원). 매수 − 매도라 음수면 순매도 */
export interface KrInvestorNet {
  quantity: bigint;
  /** 원. KIS 는 백만 원 단위로 준다 — 어댑터가 원으로 바꾼다 */
  value: number;
}

export interface KrInvestorFlowFact {
  /** 거래일(KST, YYYY-MM-DD) */
  date: string;
  individual: KrInvestorNet;
  foreign: KrInvestorNet;
  institution: KrInvestorNet;
}

/**
 * 하루치 행을 저장해도 되는가 — 당일 행은 **장 마감 뒤 18:00 KST 부터만**(그 전 값은 장중 잠정치일 수 있다).
 * 다음 회차가 30거래일을 다시 받아 덮으므로 18시 이후 행이 잠정이었어도 하루 뒤 고쳐진다
 */
export const KR_INVESTOR_SETTLE_KST_HOUR = 18;

export const isSettledInvestorDay = (date: string, at: Date): boolean => {
  const today = kstDateOf(at);
  return date < today || (date === today && at.getTime() >= kstAt(today, KR_INVESTOR_SETTLE_KST_HOUR).getTime());
};

/**
 * 가장 최근 확정 시각(`at` 이전 18:00 KST). 이 뒤에 받은 종목은 그 회차에서 다시 부르지 않는다 — 놓친 회차를 다음 날 아침에
 * 따라 돌아도, 한도에 양보한 회차를 21:40 이 이어 받아도 같은 기준이다(슬라이스 6b)
 */
export const latestInvestorSettleAt = (at: Date): Date => {
  const today = kstAt(kstDateOf(at), KR_INVESTOR_SETTLE_KST_HOUR);
  // KST 는 서머타임이 없다 — 하루 전 18:00 은 24시간 전이다
  return at.getTime() >= today.getTime() ? today : new Date(today.getTime() - 86_400_000);
};

/** 상세 화면이 받는 최대 거래일 — KIS 가 한 번에 주는 것이 30거래일이다 */
export const KR_INVESTOR_MAX_DAYS = 30;

// ==================== 호가 (FR-28) ====================

/** 매도 · 매수 각 10단계 — KIS 호가 TR 이 주는 깊이 그대로 */
export const KR_ORDERBOOK_DEPTH = 10;

/**
 * 같은 종목 호가를 다시 부르지 않는 시간. 저장하지 않는 **요청 시점 조회**라(10초면 낡는 값을 표에 쌓을 이유가 없다)
 * 화면 여러 개 · 새로고침이 같은 10초 안이면 한 번만 부른다 — 기획서 한도 예산의 "호가 10초" 와 같은 값
 */
export const KR_ORDERBOOK_CACHE_MS = 10_000;

export interface KrOrderbookLevel {
  price: number;
  /** 잔량(주) */
  quantity: bigint;
}

export interface KrOrderbookFact {
  code: string;
  /** 매도 — 1단계(가장 싼 매도)부터. 값이 없는 단계(상한가에서 매도 없음 등)는 빠진다 */
  asks: KrOrderbookLevel[];
  /** 매수 — 1단계(가장 비싼 매수)부터 */
  bids: KrOrderbookLevel[];
  totalAskQuantity: bigint;
  totalBidQuantity: bigint;
  /** 호가 접수 시각(KST 벽시계 → 실제 시각). 모르면 null */
  at: Date | null;
}

// ==================== 시간외 단일가 (FR-27) ====================

/** 시간외 단일가 조회 한 건 — 체결이 없으면(가격 0) 어댑터가 `null` 을 준다. 시각은 저장할 때 회차 시각이 붙는다 */
export type KrAfterHoursFact = Omit<KrAfterHoursQuote, "at"> & { code: string };

// ==================== 한도 (FR-91) ====================

/** KIS 초당 거래건수 초과 메시지 코드 — 어댑터 오류가 `msgCode` 로 들고 온다 */
export const KR_RATE_LIMITED_CODE = "EGW00201";

/** 한도 초과로 실패했는가 — 부가 작업은 이걸 보면 회차를 멈추고 다음 회차에 양보한다 */
export const isKrRateLimited = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { msgCode?: unknown }).msgCode === KR_RATE_LIMITED_CODE;

// ==================== Port ====================

/** KIS 부가 조회. **트랜잭션 밖에서 부른다** */
export interface KrSupplementPort {
  indexQuote(code: string): Promise<KrIndexQuoteFact>;
  /** 최근 30거래일(최신이 앞). 거래 없는 날 · 빈 칸은 빠진다 */
  investorFlows(code: string): Promise<KrInvestorFlowFact[]>;
  /** 매도 · 매수 10단계 잔량(FR-28) — 화면이 기다리는 조회라 현재가와 같은 줄에 선다 */
  orderbook(code: string): Promise<KrOrderbookFact>;
  /** 시간외 단일가(FR-27). 그날 체결이 없으면 `null`(KIS 는 0 을 준다) */
  afterHoursQuote(code: string): Promise<KrAfterHoursFact | null>;
}

export interface KrSupplementStore {
  upsertIndexQuotes(facts: KrIndexQuoteFact[], at: Date): Promise<void>;
  indexQuotes(codes: string[]): Promise<StoredKrIndexQuote[]>;
  /** 한 종목의 여러 날을 한 문장으로. 같은 (종목, 날짜)는 덮는다 — 잠정치가 확정치로 바뀐다 */
  upsertInvestorFlows(code: string, rows: KrInvestorFlowFact[], at: Date): Promise<void>;
  /** 시간외 단일가를 현재가 행에 쓴다 — 정규장 칸은 건드리지 않는다. 현재가 행이 없는 종목은 버린다 */
  upsertAfterHours(facts: KrAfterHoursFact[], at: Date): Promise<void>;
  /** `since` 뒤에 한 번이라도 저장한 종목 — 이어 받기가 건너뛸 목록 */
  investorFlowCodesCollectedSince(since: Date): Promise<string[]>;
  /** 최근 `days` 거래일(최신이 앞) · 마지막 수집 시각 */
  investorFlows(code: string, days: number): Promise<{ rows: KrInvestorFlowFact[]; collectedAt: Date | null }>;
}
