import { logger } from "../../shared/config/logger";
import {
  CRYPTO_WARNING_MAX_AGE_MS,
  isFreshMoveBeta,
  moveCardReasons,
  type CryptoWarningReader,
  type CryptoWarningRow,
  type KrStatusBadge,
  type MoveBetaReader,
  type MoveBetaRow,
  type MoveCardEvents,
  type MoveCardPolicy,
} from "../domain";

/**
 * 카드 조건의 공용 조각(F016 단계 C · `SRV-REQ-051` FR-8) — 상세(`GetWhyMoved`)와 표(`ListKrStockQuotes` · `GetMarketOverview`)가
 * **같은 판정**을 쓴다. 상세 쪽 파일과 나눈 이유는 import 순환(`ReadKrStock` 의 `KrStockRead` 를 상세가 상속한다)
 */

/** 분해 · 카드 조건 의존 — β · σ 는 예측 배치 뷰, 카드 문턱은 서버 설정 */
export interface MoveDependencies {
  betas: MoveBetaReader;
  warnings: CryptoWarningReader;
  policy: MoveCardPolicy;
}

/** 예측 배치 β · σ — 실패 · 오래됨은 없는 것으로(분해는 β=1 로 선다) */
export const loadBetas = async (reader: MoveBetaReader, keys: string[], now: Date): Promise<Map<string, MoveBetaRow>> => {
  try {
    const rows = await reader.latest(keys);
    return new Map([...rows].filter(([, r]) => isFreshMoveBeta(r, now)));
  } catch (error) {
    logger.warn(`등락 β 읽기 실패: ${(error as Error).message}`);
    return new Map();
  }
};

const KR_ALERT_BADGES: ReadonlySet<KrStatusBadge> = new Set(["caution", "warning", "danger"]);
export const KR_STATE_BADGES: ReadonlySet<KrStatusBadge> = new Set([
  "caution",
  "warning",
  "danger",
  "attention",
  "administrative",
  "liquidation",
  "overheat",
]);

/** 국내 카드 사건 — 종목 상태 칩 · 그 시장의 오늘 조치. 표와 상세가 같은 판정을 쓴다 */
export const krMoveEvents = (badges: KrStatusBadge[], viToday: boolean, actions: Array<{ market: string }>, market: string): MoveCardEvents => ({
  vi: viToday || badges.includes("vi"),
  marketAction: actions.some((a) => a.market === market),
  halt: badges.includes("halted") || badges.includes("paused"),
  warning: badges.some((b) => KR_ALERT_BADGES.has(b)),
});

/** 코인 카드 사건 — 거래소 유의 · 주의만(VI · 정지 · 시장 조치가 없다) */
export const cryptoMoveEvents = (warning: { warning: boolean; cautions: string[] } | null): MoveCardEvents => ({
  vi: false,
  marketAction: false,
  halt: false,
  warning: warning !== null && (warning.warning || warning.cautions.length > 0),
});

/**
 * 시장 표 행의 카드 표시(FE-REQ-063 FR-6) — 행마다 같은 판정(`moveCardReasons`)을 β 뷰 한 번 읽기로. 표는 분해까지 하지 않는다
 * (지수를 못 읽어도 행 표시는 크기 · 사건으로 선다 — 상세에서 ①이 없으면 카드가 서지 않는 차이는 그날 지수 결측뿐)
 */
export const moveCardFlags = async (
  reader: MoveBetaReader,
  policy: MoveCardPolicy,
  rows: Array<{ key: string; changeRate: number | null; events: MoveCardEvents }>,
  now: Date
): Promise<Map<string, boolean>> => {
  const betas = await loadBetas(reader, rows.map((r) => r.key), now);
  return new Map(
    rows.map((r) => [
      r.key,
      r.changeRate !== null && moveCardReasons(r.changeRate, betas.get(r.key)?.sigmaRate ?? null, r.events, policy).length > 0,
    ])
  );
};


/** 경보 스냅샷을 오늘 사실로 써도 되나 — 2일 넘은 스냅샷은 없는 것으로(상세 · 표 같은 판정) */
export const freshCryptoWarning = (row: CryptoWarningRow | undefined, now: Date): CryptoWarningRow | null =>
  row && now.getTime() - row.fetchedAt.getTime() <= CRYPTO_WARNING_MAX_AGE_MS ? row : null;
