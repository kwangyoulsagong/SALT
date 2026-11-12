/**
 * 오늘 왜 움직였나 뷰모델 — **순수 함수** (F016 단계 C · `BFF-REQ-051` FR-1).
 *
 * 서버 `GET /api/market/kr/:code/why-moved` · `GET /api/investment/crypto/:symbol/why-moved` 가 다 계산한다
 * (분해 %p · 반올림 · 카드 조건 · 사실 시각순). BFF 가 하는 일:
 *
 * 1. **필드를 골라 옮긴다** — 숫자 계산 0(합 · 차 · 반올림 0). 서버가 칸을 늘려도 화면 계약이 저절로 늘지 않는다
 * 2. **계약이 깨지면 던진다**(`WhyMovedContractError`) — 서비스가 `unavailable` 로 바꾼다. 분해 칸을 0 으로 채우지 않는다
 * 3. **열거값은 아는 것만** — 모르는 사실 kind · 이유는 버린다(화면에 문구가 없다). 분해 `method` 는 모르면 계약 깨짐(라벨이 걸려 있다)
 *
 * ③ 한 줄(`summary` · `gate`)은 단계 D 가 칸과 같이 넣는다 — 쓰지 않는 칸을 미리 두지 않는다.
 */

import { toNewsTagVM, type NewsTagVM } from "./news-tag.viewmodel";

export const MOVE_FACT_KINDS = [
  "news",
  "disclosure",
  "vi",
  "market_action",
  "halt",
  "warning",
  "flow",
  "crypto_news",
  "crypto_warning",
] as const;
export type MoveFactKindVM = (typeof MOVE_FACT_KINDS)[number];

export const MOVE_CARD_REASONS = ["large_move", "vi", "market_action", "halt", "warning"] as const;
export type MoveCardReasonVM = (typeof MOVE_CARD_REASONS)[number];

export const MOVE_SPLIT_METHODS = ["regression", "market_adjusted", "benchmark"] as const;
export type MoveSplitMethodVM = (typeof MOVE_SPLIT_METHODS)[number];

/** ① 분해 — %p(서버가 소수 둘째 자리로). `sector` 가 없으면 두 단(시장 → 종목) */
export interface MoveSplitVM {
  total: number;
  market: number;
  sector: number | null;
  idio: number;
  method: MoveSplitMethodVM;
  /** 시장 기준 — 국내 `0001` · `1001`, 코인 `KRW-BTC` */
  marketIndex: string;
  sectorIndex: string | null;
  /** 업종 이름 — 원천 값(`전기·전자`). 모르면 `null`(화면이 "업종") */
  sectorName: string | null;
}

/** ② 사실 한 줄 — 제목은 원문 그대로(시황 · 기사) 또는 사건 코드(`vi:static:2` · `circuit_breaker:1:down` · `paused`) — 문구는 화면 i18n */
export interface MoveFactVM {
  id: string;
  kind: MoveFactKindVM;
  at: string;
  source: string;
  title: string;
  /** 숫자 사실 — 프로그램 순매수(원) · VI 발동가(원) · 없으면 `null` */
  value: number | null;
  /** 측정 태그(F017 단계 6 · `BFF-REQ-052` FR-5) — 소식만 · 종류를 못 맞히거나 모르는 라벨이면 null */
  tag: NewsTagVM | null;
}

export interface WhyMovedVM {
  date: string;
  show: boolean;
  reasons: MoveCardReasonVM[];
  /** 평소 하루 변동(%) — 모르면 `null` */
  usualRate: number | null;
  split: MoveSplitVM | null;
  facts: MoveFactVM[];
  unavailable: MoveFactKindVM[];
}

export class WhyMovedContractError extends Error {
  constructor(field: string) {
    super(`why-moved 응답 계약 깨짐: ${field}`);
    this.name = "WhyMovedContractError";
  }
}

type Raw = Record<string, unknown>;
const obj = (v: unknown, field: string): Raw => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new WhyMovedContractError(field);
  return v as Raw;
};
const str = (r: Raw, k: string): string => {
  if (typeof r[k] !== "string") throw new WhyMovedContractError(k);
  return r[k] as string;
};
const strOrNull = (r: Raw, k: string): string | null => (r[k] === null || r[k] === undefined ? null : str(r, k));
const num = (r: Raw, k: string): number => {
  if (typeof r[k] !== "number" || !Number.isFinite(r[k])) throw new WhyMovedContractError(k);
  return r[k] as number;
};
const numOrNull = (r: Raw, k: string): number | null => (r[k] === null || r[k] === undefined ? null : num(r, k));
const arr = (r: Raw, k: string): unknown[] => {
  if (!Array.isArray(r[k])) throw new WhyMovedContractError(k);
  return r[k] as unknown[];
};
const known = <T extends string>(values: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (values as readonly string[]).includes(v);

const toSplitVM = (raw: unknown): MoveSplitVM | null => {
  if (raw === null || raw === undefined) return null;
  const s = obj(raw, "split");
  const method = s.method;
  if (!known(MOVE_SPLIT_METHODS, method)) throw new WhyMovedContractError("split.method");
  return {
    total: num(s, "total"),
    market: num(s, "market"),
    sector: numOrNull(s, "sector"),
    idio: num(s, "idio"),
    method,
    marketIndex: str(s, "marketIndex"),
    sectorIndex: strOrNull(s, "sectorIndex"),
    sectorName: strOrNull(s, "sectorName"),
  };
};

/** 서버 `data` → 화면 계약. 국내 · 코인 같은 모양 */
export const toWhyMovedVM = (raw: unknown): WhyMovedVM => {
  const r = obj(raw, "data");
  if (typeof r.show !== "boolean") throw new WhyMovedContractError("show");
  return {
    date: str(r, "date"),
    show: r.show,
    reasons: arr(r, "reasons").filter((x): x is MoveCardReasonVM => known(MOVE_CARD_REASONS, x)),
    usualRate: numOrNull(r, "usualRate"),
    split: toSplitVM(r.split),
    facts: arr(r, "facts").flatMap((d): MoveFactVM[] => {
      const f = obj(d, "fact");
      if (!known(MOVE_FACT_KINDS, f.kind)) return [];
      return [{ id: str(f, "id"), kind: f.kind, at: str(f, "at"), source: str(f, "source"), title: str(f, "title"), value: numOrNull(f, "value"), tag: toNewsTagVM(f.tag) }];
    }),
    unavailable: arr(r, "unavailable").filter((x): x is MoveFactKindVM => known(MOVE_FACT_KINDS, x)),
  };
};
