import { type ArticleCandidate, pickSameArticle } from "./ArticleBody";
import type { AiBodyVia, OutletDef } from "./Outlets";

/**
 * AI 가 읽는 기사 본문(`SRV-REQ-058`) — 포털 검색을 거치지 않고 **매체가 직접 낸 RSS** 로 같은 기사의 원문 주소를 찾는다.
 *
 * 규칙(순수):
 * - 같은 기사 판정은 사람용 본문(`SRV-REQ-054`)과 **같은 함수**(`pickSameArticle` — Dice ≥ 0.8 · 2일 · 줄인 제목). 못 이으면 남의 기사를 붙이지 않는다
 * - 제목이 생긴 지 `AI_LINK_WINDOW_MS` 안에서만 다시 잇는다 — RSS 는 최근 수십 건뿐이라 그 뒤엔 나타나지 않는다
 * - 원문 문단은 사실 추출이 끝나거나 `AI_BODY_KEEP_MS` 가 지나면 지우고 해시 · 길이만 남긴다(기사 문장을 오래 두지 않는다 — `ADR-009` v4)
 */

export const AI_LINK_WINDOW_MS = 24 * 60 * 60 * 1000;
export const AI_BODY_KEEP_MS = 7 * 24 * 60 * 60 * 1000;
export const AI_FETCH_MAX_ATTEMPTS = 3;
/** 실패 뒤 다시 받기까지 — 5분 · 10분 · 20분(지수) */
export const AI_FETCH_RETRY_BASE_MS = 5 * 60 * 1000;
/** 덮임 판정 — 제목이 생긴 뒤 이 안에 본문이 있어야 "덮음"(FR-6) */
export const AI_COVER_WITHIN_MS = 60 * 60 * 1000;

/**
 * 행 상태 — 끝난 것: `ok` · `no_outlet` · `blocked` 는 매체가 켜지면 다시 볼 수 있어 끝이 아니다.
 * - `pending` 원문 주소를 찾았고 받기 전 · `ok` 받음 · `empty` 받았는데 본문이 없음 · `failed` 받기 실패(재시도 3회)
 * - `unmatched` 매체 RSS 에서 같은 기사를 못 찾음(창 안이면 다시) · `blocked` 매체가 꺼짐(약관 · robots) · `no_outlet` 목록에 없는 매체
 * - `robots_blocked` 매체는 켜졌지만 이 기사 주소를 robots 가 막음
 */
export type AiBodyStatus = "pending" | "ok" | "empty" | "failed" | "unmatched" | "blocked" | "no_outlet" | "robots_blocked";

/** 본문을 찾을 제목 하나 — 키는 사람용 본문과 같은 꼴(`kr:<일련번호>` · `coin:<id>`) */
export interface AiTitle {
  key: string;
  market: "kr" | "coin";
  title: string;
  publishedAt: Date;
  /** 원장이 부르는 매체 이름(제공처 · 제목 꼬리 · 원장 `source`) */
  outletName: string | null;
  /** 원장 주소가 이미 매체 원문(코인 영문 RSS)이면 그 주소 */
  directUrl: string | null;
  /** 제목에 걸린 종목(국내 6자리 코드 · 코인 심볼) — 사실 추출이 그대로 싣는다 */
  symbols: string[];
}

export interface RssItem {
  url: string;
  outletId: string;
  title: string;
  publishedAt: Date;
}

export interface AiBodyLink {
  key: string;
  market: "kr" | "coin";
  title: string;
  titlePublishedAt: Date;
  symbols: string[];
  outletId: string | null;
  via: AiBodyVia | null;
  status: Extract<AiBodyStatus, "pending" | "unmatched" | "blocked" | "no_outlet">;
  itemUrl: string | null;
}

/** 지금 이 제목의 행을 다시 판정할 때인가 — 끝난 행은 건드리지 않는다 */
export const needsLink = (status: AiBodyStatus | null, publishedAt: Date, now: Date): boolean => {
  if (status === null) return true;
  if (status !== "unmatched" && status !== "blocked") return false;
  return now.getTime() - publishedAt.getTime() <= AI_LINK_WINDOW_MS;
};

/**
 * 제목 → 원문 주소. 매체가 꺼져 있으면 `blocked`, 목록에 없으면 `no_outlet` — 둘 다 덮임률이 이유별로 센다.
 * `enabled` 는 약관 · robots 를 합친 지금 판정(`news_outlet.enabled`)
 */
export const linkTitle = (
  title: AiTitle,
  outlet: OutletDef | undefined,
  enabled: boolean,
  items: readonly RssItem[],
): AiBodyLink => {
  const base = { key: title.key, market: title.market, title: title.title, titlePublishedAt: title.publishedAt, symbols: title.symbols };
  if (!outlet) return { ...base, outletId: null, via: null, status: "no_outlet", itemUrl: null };
  const head = { ...base, outletId: outlet.id, via: outlet.via };
  if (!enabled) return { ...head, status: "blocked", itemUrl: null };
  if (title.directUrl) return { ...head, status: "pending", itemUrl: title.directUrl };
  const candidates: ArticleCandidate[] = items
    .filter((i) => i.outletId === outlet.id)
    .map((i) => ({ title: i.title, originalUrl: i.url, portalUrl: null, publishedAt: i.publishedAt }));
  const same = pickSameArticle({ key: title.key, title: title.title, publishedAt: title.publishedAt }, candidates);
  return same ? { ...head, status: "pending", itemUrl: same.originalUrl } : { ...head, status: "unmatched", itemUrl: null };
};

/** 추출 시도 상한 — 넘으면 그 본문은 추출을 끝낸 것으로 친다(사실 0, `extracted_at` 찍힘) */
export const AI_EXTRACT_MAX_ATTEMPTS = 3;

/** 사실 추출이 읽는 본문 한 건(`SRV-REQ-053` FR-14) — `via` 가 AI 경로인 행만 */
export interface AiBodyForExtraction {
  key: string;
  market: "kr" | "coin";
  title: string;
  publishedAt: Date;
  /** 본문을 받은 시각 — 사실의 `available_at`(이 시각 전엔 우리가 몰랐다) */
  fetchedAt: Date;
  symbols: string[];
  url: string;
  outletName: string;
  via: AiBodyVia;
  paragraphs: string[];
  attempts: number;
}

/** 실패 n 번째 뒤 다시 받을 시각 — 3회를 넘으면 `null`(끝) */
export const nextFetchAt = (attempts: number, now: Date): Date | null =>
  attempts >= AI_FETCH_MAX_ATTEMPTS ? null : new Date(now.getTime() + AI_FETCH_RETRY_BASE_MS * 2 ** (attempts - 1));
