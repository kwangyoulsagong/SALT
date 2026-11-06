/**
 * 국내 시장 상태 태그(F016 단계 A · `SRV-REQ-051` FR-2 · 3 · 6) — VI 사건 · 시장 조치(서킷브레이커 · 사이드카).
 *
 * 2026-11-06 코스피 서킷브레이커 날 화면이 정지를 몰라 "10분 전 시세"로 보였다. 이 파일은 **정지가 숫자 옆에 보이게** 하는
 * 판정만 갖는다 — 값은 KIS(VI 현황 · 현재가 상태 칸)와 우리 지수 분 기록에서 온다. 원인 해석 · 문장 0.
 */

import { kstDateOf, type KrMarket } from "./KrStock";
import type { KrIntradayPoint } from "./KrMarketSummary";

// ==================== VI (FR-2) ====================

/** VI 종류 — KIS `vi_kind_code` 1 정적 · 2 동적 · 3 정적 + 동적(근거 등급 [약] — 2026-11-06 장중 표본은 2 만) */
export type KrViKind = "static" | "dynamic" | "both";

export const krViKindOf = (code: string | null | undefined): KrViKind | null =>
  code === "1" ? "static" : code === "2" ? "dynamic" : code === "3" ? "both" : null;

/** VI 발동 한 건 — (종목 · 발동 시각) 하나에 한 행. 해제 전엔 `releasedAt = null` */
export interface KrViEventFact {
  code: string;
  triggeredAt: Date;
  releasedAt: Date | null;
  kind: KrViKind | null;
  /** 발동가(원) */
  triggerPrice: number | null;
  /** 정적 · 동적 기준가 대비 괴리율(%) — 해당 없는 쪽은 `null` */
  staticGapRate: number | null;
  dynamicGapRate: number | null;
  /** 그날 그 종목 몇 번째 발동인가 */
  count: number | null;
}

/**
 * VI 는 2분 단일가(랜덤 엔드 30초 이내)다. 해제 시각이 아직 안 온 사건을 이보다 오래 "발동 중"으로 보지 않는다 —
 * 수집이 끊겨 해제를 못 받은 사건이 하루 내내 칩으로 남지 않게
 */
export const KR_VI_MAX_ACTIVE_MS = 5 * 60_000;

/**
 * 한 번 수집에서 몇 분 앞까지 다시 읽나. 목록이 발동 시각 내림차순이라, 이보다 오래된 행이 나오면 멈춘다 — 그 행들은 지난
 * 회차가 이미 받았고, 해제 시각이 바뀔 수 있는 것(2분 단일가)은 전부 이 창 안에 있다
 */
export const KR_VI_REREAD_MS = 3 * 60_000;
/**
 * 한 회차 연속 조회 상한(한 쪽 30건) — 한도 맨 뒤 작업이라 장 초반 몰림에도 120건에서 멈춘다. 2026-11-06 실측에선 KIS 가 다음 쪽을
 * 주지 않아(최근 30건 고정) 회차마다 한 쪽이다 — 1분에 30건 넘게 발동하면 그 앞쪽은 종류 · 시각을 놓친다(칩은 현재가 상태 칸으로 선다)
 */
export const KR_VI_MAX_PAGES = 4;

/** 사건이 지금 발동 중인가 — 해제 시각이 없거나 아직 안 왔고, 발동이 `KR_VI_MAX_ACTIVE_MS` 안 */
export const isKrViEventActive = (event: Pick<KrViEventFact, "triggeredAt" | "releasedAt">, now: Date): boolean =>
  (event.releasedAt === null || event.releasedAt.getTime() > now.getTime()) &&
  now.getTime() - event.triggeredAt.getTime() <= KR_VI_MAX_ACTIVE_MS;

// ==================== 시장 조치 (FR-3) ====================

export type KrMarketActionKind = "circuit_breaker" | "sidecar";
/** `feed` — 장운영정보 실시간 필드(실측 전 — 다음 발동일) · `inferred` — 지수 분 기록으로 추정 */
export type KrMarketActionSource = "feed" | "inferred";

export interface KrMarketAction {
  market: KrMarket;
  /** KST 거래일 `YYYY-MM-DD` */
  tradeDate: string;
  kind: KrMarketActionKind;
  /** 서킷브레이커 1 · 2 · 3 단계(사이드카는 1) */
  stage: number;
  direction: "up" | "down";
  startedAt: Date;
  /** 끝을 아직 못 봤으면 `null` — 3단계는 그날 매매 종료라 끝이 없다 */
  endedAt: Date | null;
  source: KrMarketActionSource;
}

/** 지수 업종 코드 → 시장. 서킷브레이커는 시장 지수 기준이라 코스피 200(2001)은 대상이 아니다 */
export const KR_MARKET_INDEX: Readonly<Record<string, KrMarket>> = { "0001": "KOSPI", "1001": "KOSDAQ" };

/**
 * 서킷브레이커 단계 — 지수가 전일 종가 대비 이만큼 내려 1분 이어지면 발동(KRX 규정, 리서치 2026-11-06 §2 [2차]).
 * 단계마다 하루 한 번 · 1 · 2단계는 20분 정지 뒤 10분 단일가 · 3단계는 그날 매매 종료
 */
export const KR_CIRCUIT_BREAKER_STAGES: ReadonlyArray<{ stage: number; rate: number }> = [
  { stage: 3, rate: -20 },
  { stage: 2, rate: -15 },
  { stage: 1, rate: -8 },
];
export const KR_CIRCUIT_BREAKER_HALT_MS = 20 * 60_000;
/**
 * 1 · 2단계는 14:50 뒤엔 발동하지 않는다(KRX 규정 [2차]). 우리 추정에도 같은 선을 긋는다 — 15:20~15:30 종가 단일가는 지수가
 * 10분 멈춰 있어 이 선이 없으면 큰 하락 날 마감 단일가를 서킷브레이커로 읽는다
 */
const KR_CB_LAST_TRIGGER_KST_MINUTE = 14 * 60 + 50;
/** 지수가 이만큼 그대로면 매매가 멈춘 것으로 본다 — 발동 조건 "1분 지속"과 같은 길이. 분 기록 두 점이면 된다 */
const KR_CB_FLAT_MS = 60_000;

const kstMinuteOf = (at: Date) => {
  const kst = new Date(at.getTime() + 9 * 3_600_000);
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
};

/**
 * 지수 분 기록 하루치로 서킷브레이커 구간을 찾는다(`source=inferred`). **같은 입력이면 같은 답**이라 매분 다시 돌려도 행이
 * 늘지 않고, 지난 날 기록으로 재생 검증한다(2026-11-06 코스피: 09:04~09:32 4923.47 고정 → 09:34 재개).
 *
 * 규칙: 분 기록이 60초 이상 같은 값이고 그 값이 전일 종가 대비 단계 문턱 이하 → 그 구간의 첫 점이 시작, 값이 처음 바뀐 점이
 * 끝(아직 그대로면 `null`). 단계마다 첫 구간 하나 · 앞 단계보다 높은 단계만(단계는 내려가지 않는다). 지수가 1분 동안 소수 넷째
 * 자리까지 그대로인 것은 매매가 멈췄을 때뿐이라 본다 [추정] — 수집이 끊긴 분은 기록이 없어 "같은 값"으로 세지 않는다
 */
export const detectKrCircuitBreakers = (
  market: KrMarket,
  points: KrIntradayPoint[],
  prevClose: number
): KrMarketAction[] => {
  if (!(prevClose > 0) || points.length < 2) return [];
  const sorted = [...points].sort((a, b) => a.at.getTime() - b.at.getTime());
  const found: KrMarketAction[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) j++;
    const run = { start: sorted[i], last: sorted[j], next: sorted[j + 1] ?? null };
    i = j + 1;
    if (run.last.at.getTime() - run.start.at.getTime() < KR_CB_FLAT_MS) continue;
    const rate = ((run.start.value - prevClose) / prevClose) * 100;
    const hit = KR_CIRCUIT_BREAKER_STAGES.find((s) => rate <= s.rate);
    if (!hit) continue;
    if (hit.stage < 3 && kstMinuteOf(run.start.at) > KR_CB_LAST_TRIGGER_KST_MINUTE) continue;
    if (found.some((f) => f.stage >= hit.stage)) continue;
    found.push({
      market,
      tradeDate: kstDateOf(run.start.at),
      kind: "circuit_breaker",
      stage: hit.stage,
      direction: "down",
      startedAt: run.start.at,
      endedAt: hit.stage === 3 ? null : run.next?.at ?? null,
      source: "inferred",
    });
  }
  return found;
};

/** 재개 예정 — 1 · 2단계는 시작 + 20분(뒤이어 10분 단일가), 3단계 · 사이드카(5분)는 각각 그날 끝 · 시작 + 5분 */
export const krMarketActionResumesAt = (action: Pick<KrMarketAction, "kind" | "stage" | "startedAt">): Date | null => {
  if (action.kind === "sidecar") return new Date(action.startedAt.getTime() + 5 * 60_000);
  return action.stage >= 3 ? null : new Date(action.startedAt.getTime() + KR_CIRCUIT_BREAKER_HALT_MS);
};

/**
 * 지금 걸려 있는가 — 끝을 못 봤고 같은 KST 날짜의 정규장(종가 단일가 포함) 안. 장이 닫히면 끝을 못 본 조치도 내린다 —
 * 다음 날 아침에 어제 띠가 남지 않게
 */
export const isKrMarketActionActive = (
  action: Pick<KrMarketAction, "endedAt" | "tradeDate">,
  now: Date,
  regularSession: boolean
): boolean => action.endedAt === null && regularSession && action.tradeDate === kstDateOf(now);

// ==================== Port ====================

/** KIS VI 현황(`FHPST01390000`) — 한 쪽 30건 · 발동 시각 내림차순. **트랜잭션 밖에서 부른다** */
export interface KrMarketStatusPort {
  viEventsPage(date: string, continued: boolean): Promise<{ events: KrViEventFact[]; hasMore: boolean }>;
}

export interface KrMarketStatusStore {
  /** (종목 · 발동 시각) 유일 — 같은 사건은 해제 시각 · 괴리율만 덮는다. 마스터에 없는 코드(ETN 등)도 받는다 */
  upsertViEvents(events: KrViEventFact[], at: Date): Promise<void>;
  /** 종목마다 `since` 뒤 가장 최근 사건 하나 — 쿼리 한 번 */
  latestViEvents(codes: string[], since: Date): Promise<Map<string, KrViEventFact>>;
  /** (시장 · 거래일 · kind · 단계) 유일 — 끝 시각만 덮는다(늦게 본 끝이 앞 회차의 `null` 을 채운다) */
  upsertMarketActions(actions: KrMarketAction[], at: Date): Promise<void>;
  marketActions(tradeDate: string): Promise<KrMarketAction[]>;
}
