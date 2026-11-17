import { createHash } from "node:crypto";

/**
 * 원인 스냅샷 — 그날 패널이 보인 원인 → 근거 → 결과를 **결과(다음 등락)가 나오기 전에** 남긴다
 * (F017 v4 순서 5a · `SRV-REQ-053` FR-18 · `DB-REQ-043` FR-8). 예측(`FC-REQ-022` FR-15 원인 설명 채점)이 export 뷰로 읽는다.
 *
 * ## 불변식
 *
 * 1. **한 거래일 = 그날이 끝난 뒤(또는 끝나기 직전) 본 원인만** — 화면의 "오늘"은 KST 날짜라(`GetWhyMoved` `toView(today…)`)
 *    장 전 · 장중에 찍으면 어제 등락이나 반나절 등락을 그날 원인으로 적게 된다. 그래서 찍는 창을 시장마다 하나로 고정한다:
 *    - 국내 — 장 마감(15:30) 뒤 15:40 ~ 23:59 KST. 거래일 = 그 KST 날짜(휴장일 행은 예측이 일봉이 없어 버린다)
 *    - 코인 — 업비트 하루(09:00 ~ 다음 날 09:00 KST)가 끝나기 직전 08:00 ~ 08:59 KST. 거래일 = 그 하루가 시작한 KST 날짜(전날)
 *    창 밖이면 찍지 않는다 — 맥이 잠들어 놓친 날은 **빈 날**이지 다른 시각 값으로 메운 날이 아니다
 * 2. 덧붙이기만 — (시장, 종목, 거래일, 지문) 유일. 같은 원인을 다시 보면 행이 늘지 않고, 원인이 바뀌면 새 행(채점은 그날 마지막 행)
 * 3. 지문 = 원인 목록(종류 · 단계 · 머리말 · 근거)과 등락 — 표시용 시각 문구가 바뀌어도 같은 원인이면 같은 지문
 */

export type CauseMarket = "kr" | "crypto";

const KST_MS = 9 * 3_600_000;

/** 국내 찍는 창 — 마감 10분 뒤부터(마지막 체결 · 지수 반영) 그날 끝까지 */
export const KR_CAPTURE_FROM_MIN = 15 * 60 + 40;
/** 코인 찍는 창 — 하루 끝 1시간 전부터 끝 직전까지 */
export const CRYPTO_CAPTURE_FROM_MIN = 8 * 60;
export const CRYPTO_DAY_START_MIN = 9 * 60;

const kstParts = (now: Date): { date: string; minute: number } => {
  const k = new Date(now.getTime() + KST_MS);
  return { date: k.toISOString().slice(0, 10), minute: k.getUTCHours() * 60 + k.getUTCMinutes() };
};

const previousDate = (date: string): string => new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** 지금 이 시장의 원인을 찍어도 되나 — 되면 그 거래일(YYYY-MM-DD), 아니면 null(불변식 1) */
export const causeCaptureDate = (market: CauseMarket, now: Date): string | null => {
  const { date, minute } = kstParts(now);
  if (market === "kr") return minute >= KR_CAPTURE_FROM_MIN ? date : null;
  return minute >= CRYPTO_CAPTURE_FROM_MIN && minute < CRYPTO_DAY_START_MIN ? previousDate(date) : null;
};

export const causeMarketOf = (symbol: string): CauseMarket => (/^\d{6}$/.test(symbol) ? "kr" : "crypto");

export interface CauseSnapshotCandidate {
  kind: string;
  strength: "likely" | "possible" | "none";
  headline: string;
  factId: string | null;
  at: string | null;
  evidence: Array<{ kind: string; value: string; compare: string | null; source: string; at: string | null; supports: boolean }>;
}

/** 저장 한 행 — 시장 층 · 사용자 열 0 */
export interface CauseSnapshotRecord {
  market: CauseMarket;
  symbol: string;
  tradeDate: string;
  fingerprint: string;
  topKind: string;
  topStrength: "likely" | "possible" | "none";
  changeRate: number;
  split: { market: number; sector: number | null; idio: number; method: string } | null;
  candidates: CauseSnapshotCandidate[];
  capturedAt: Date;
}

/** 지문(불변식 3) — 근거의 표시 문구까지 넣는다: 같은 종류여도 숫자가 바뀌면 다른 원인 기록이다 */
export const causeFingerprint = (changeRate: number, candidates: readonly CauseSnapshotCandidate[]): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        c: Math.round(changeRate * 100) / 100,
        k: candidates.map((c) => [c.kind, c.strength, c.headline, c.factId, c.evidence.map((e) => [e.kind, e.value, e.compare, e.supports])]),
      })
    )
    .digest("hex")
    .slice(0, 32);

/** 패널 원인 칸 → 저장 행. 원인 목록이 비면(있을 수 없지만 — `MoveCause` 불변식 3) 찍지 않는다 */
export const toCauseSnapshot = (
  market: CauseMarket,
  symbol: string,
  tradeDate: string,
  capturedAt: Date,
  view: {
    split: { market: number; sector: number | null; idio: number; method: string } | null;
    causes: ReadonlyArray<CauseSnapshotCandidate & { note?: string; evidence: ReadonlyArray<CauseSnapshotCandidate["evidence"][number] & { gloss?: string | null }> }>;
    changeRate: number;
  }
): CauseSnapshotRecord | null => {
  const top = view.causes[0];
  if (!top) return null;
  // 풀이(gloss) · 왜 그 단계인가(note)는 화면 문구라 저장하지 않는다 — 채점은 종류 · 단계 · 근거 수만 본다
  const candidates: CauseSnapshotCandidate[] = view.causes.map((c) => ({
    kind: c.kind,
    strength: c.strength,
    headline: c.headline,
    factId: c.factId,
    at: c.at,
    evidence: c.evidence.map((e) => ({ kind: e.kind, value: e.value, compare: e.compare, source: e.source, at: e.at, supports: e.supports })),
  }));
  return {
    market,
    symbol,
    tradeDate,
    fingerprint: causeFingerprint(view.changeRate, candidates),
    topKind: top.kind,
    topStrength: top.strength,
    changeRate: view.changeRate,
    split: view.split,
    candidates,
    capturedAt,
  };
};
