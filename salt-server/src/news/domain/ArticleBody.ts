/**
 * 기사 본문(`SRV-REQ-054`) — 우리 원장에 있는 기사(국내 시황 제목 · 코인 RSS)의 **제목으로 포털 뉴스 검색을 해서 같은 기사를 찾고**,
 * 그 기사 페이지에서 본문 문단만 뽑는다. 화면이 모달을 열 때 한 번 부르고 결과를 캐시한다.
 *
 * 규칙(순수 — I/O 없음):
 * - **같은 기사 판정**: 제목 글자 두 개 묶음(bigram) 겹침 ≥ `BODY_MATCH_MIN` 이고 게시 시각 차이 ≤ `BODY_MATCH_WINDOW_MS`. 못 넘으면 "못 찾음" —
 *   비슷한 남의 기사 본문을 붙이지 않는다(틀린 본문은 본문 없음보다 나쁘다)
 * - **문단 정리**: 저작권 · 기자 메일 · 구독 권유 같은 꼬리 줄을 버리고, 너무 길면 자른다(`BODY_MAX_CHARS`)
 * - **캐시 수명**: 찾음은 영구 · 못 찾음은 포털 색인이 늦을 수 있어 `BODY_RETRY_NOT_FOUND_MS` 뒤 다시 · 실패(네트워크)는 `BODY_RETRY_FAILED_MS` 뒤
 */

/** 찾기 · 뽑기 규칙 판 — 규칙을 고치면 올린다(4 짧은 줄 경계 · 5 두 번째 검색어 · 6 줄인 제목 · 7 날짜 줄 · 글자 크기 안내, 2026-11-09 확인 2회차 · 8 가린 기자 메일 줄, 2026-11-14). 옛 판으로 찾은 행은 "찾음"이어도 다시 찾는다(틀리게 뽑힌 본문이 영구 캐시에 남지 않게) */
export const BODY_EXTRACTOR_VERSION = 8;
export const BODY_MATCH_MIN = 0.8;
/** 줄인 제목 — 짧은 쪽(글자 · 숫자만)이 이 길이 이상이고 긴 쪽 안에 그대로 있으며 게시 시각이 이만큼 안이면 같은 기사(언론사가 제목을 줄여 고침) */
export const BODY_CONTAINED_MIN_CHARS = 12;
export const BODY_CONTAINED_WINDOW_MS = 30 * 60 * 1000;
export const BODY_MATCH_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
export const BODY_MAX_CHARS = 20_000;
export const BODY_MAX_PARAGRAPHS = 80;
export const BODY_RETRY_NOT_FOUND_MS = 3 * 60 * 60 * 1000;
export const BODY_RETRY_FAILED_MS = 30 * 60 * 1000;

export type ArticleBodyStatus = "ok" | "not_found" | "failed";

/** 포털 검색 결과 한 건 — 제목은 태그 · 엔티티를 벗긴 글자 */
export interface ArticleCandidate {
  title: string;
  /** 원문(언론사) 주소 */
  originalUrl: string;
  /** 포털이 기사를 품고 있으면 그 주소(본문 구조가 일정하다), 아니면 `null` */
  portalUrl: string | null;
  publishedAt: Date;
}

export interface StoredArticleBody {
  key: string;
  status: ArticleBodyStatus;
  paragraphs: string[];
  /** 본문을 읽은 주소 · 원문 주소 */
  url: string | null;
  originalUrl: string | null;
  fetchedAt: Date;
  /** 이 행을 만든 뽑기 규칙 판(`BODY_EXTRACTOR_VERSION`) */
  version: number;
}

/** 본문을 찾을 기사 — 키는 원장 출처 + id(`kr:<일련번호>` · `coin:<id>`) */
export interface ArticleBodyQuery {
  key: string;
  title: string;
  publishedAt: Date;
}

export interface ArticleBodyView {
  status: ArticleBodyStatus;
  paragraphs: string[];
  /** 원문 주소(제공처) — 찾았을 때만 */
  originalUrl: string | null;
  fetchedAt: string;
}

/** 제목 끝 " - 매체" 꼬리(구글 뉴스 RSS) · 꺾쇠 머리말([단독] 등)은 판정에서 뺀다 */
export const searchTitleOf = (title: string): string =>
  title.replace(/\s+-\s+[^-]+$/, "").replace(/\s+/g, " ").trim();

/**
 * 두 번째 검색어 — 앞 낱말 다섯(문장부호 · 머리말 뺌). 긴 제목 전체로 찾으면 포털이 0건을 줄 때가 있다(같은 제목이 몇 시간 뒤 0건 —
 * 2026-11-09 확인 2회차). 같은 기사 판정(겹침 0.8)은 그대로라 넓게 찾아도 남의 기사를 붙이지 않는다. 다섯 낱말보다 짧으면 `null`(같은 검색)
 */
export const shortSearchTitleOf = (title: string): string | null => {
  const words = searchTitleOf(title)
    .replace(/^(\[[^\]]*\]\s*)+/, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length > 5 ? words.slice(0, 5).join(" ") : null;
};

const bare = (title: string) =>
  searchTitleOf(title)
    .replace(/^(\[[^\]]*\]\s*)+/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();

const bigrams = (s: string) => {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
  return out;
};

/** 제목 겹침(Dice 계수 0~1) — 띄어쓰기 · 문장부호 · 머리말 차이는 같게 본다 */
export const titleSimilarity = (a: string, b: string): number => {
  const A = bigrams(bare(a));
  const B = bigrams(bare(b));
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared += 1;
  return (2 * shared) / (A.size + B.size);
};

/** 한 제목이 다른 제목을 줄인 것인가 — 짧은 쪽이 긴 쪽 안에 그대로(머리말 · 문장부호 · 매체 꼬리 뺌) */
const isShortenedTitle = (a: string, b: string): boolean => {
  const [x, y] = [bare(a), bare(b)];
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= BODY_CONTAINED_MIN_CHARS && long.includes(short);
};

/**
 * 같은 기사 하나 — 겹침 문턱을 넘거나(2일 안), 줄인 제목이면서 30분 안. 그중 가장 비슷한 것, 같으면 포털이 품은 것(본문 구조가 일정).
 * 줄인 제목은 겹침이 문턱 아래로 떨어진다(실측 0.75 — 언론사가 인용구 뒤를 잘라 고침)
 */
export const pickSameArticle = (query: ArticleBodyQuery, candidates: ArticleCandidate[]): ArticleCandidate | null => {
  let best: { c: ArticleCandidate; score: number } | null = null;
  for (const c of candidates) {
    const gap = Math.abs(c.publishedAt.getTime() - query.publishedAt.getTime());
    if (gap > BODY_MATCH_WINDOW_MS) continue;
    const similar = titleSimilarity(query.title, c.title);
    const shortened = gap <= BODY_CONTAINED_WINDOW_MS && isShortenedTitle(query.title, c.title);
    if (similar < BODY_MATCH_MIN && !shortened) continue;
    const score = Math.max(similar, shortened ? BODY_MATCH_MIN : 0);
    if (!best || score > best.score || (score === best.score && c.portalUrl && !best.c.portalUrl)) best = { c, score };
  }
  return best?.c ?? null;
};

/** 본문이 아닌 줄 — 저작권 · 무단 전재 · 기자 메일만 있는 줄 · 구독 · 공유 권유 · 사진 설명 머리 */
const NOISE = [
  /무단\s*전재|재배포\s*금지|저작권자|copyright|all rights reserved|ⓒ|©/i,
  /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/,
  /^[가-힣]{2,4}\s*(기자|특파원)\s*[\w.+-]+@[\w.-]+$/,
  /\[email(?:&#160;|\s)*protected\]/i, // 매체가 가린 기자 메일(Cloudflare 가림 — "[email protected] 김경아 기자", 2026-11-14)
  /[\w.+-]+@[\w-]+\.[\w.-]+/, // 짧은 줄의 메일 — 기자 이름 · 매체 꼬리(긴 본문 문단은 120자 문턱이 지킨다)
  /(입력|수정|승인|기사입력)\s*[:：]?\s*\d{4}[./-]\d{1,2}[./-]\d{1,2}/,
  /여러분의\s*후원|후원하기/, // 매체 후원 권유 꼬리
  /^#\S/, // 해시태그 줄
  /^▲|사진\s*=|사진\s*제공|\(사진/, // 사진 설명
  /기자\s*이름을\s*클릭하면|확인할 수 있어요!?$|글자\s*크기로\s*변경/, // 기사 화면 안내 문구
  /^\d{4}[./-]\s?\d{1,2}[./-]\s?\d{1,2}\.?(\s+\d{1,2}:\d{2}(:\d{2})?)?$/, // 날짜 · 시각만 있는 줄

  // 화면 단추 · 목록 머리 — 줄 전체가 그 낱말일 때만(본문 문장 "구독자가 늘었다"는 남긴다)
  /^(구독(하기)?|팔로우|좋아요\d*|공유(하기)?|기사\s*제보|많이\s*본\s*기사|다른\s*기사\s*보기|관련\s*기사|화나요\d*|슬퍼요\d*)$/,
  /투자\s*손실에\s*대해\s*책임을\s*지지\s*않습니다/,
];

/** 여기서부터는 본문이 아니다 — 언론사 페이지의 관련 · 주요 기사 목록 머리(읽기 모드가 목록까지 본문으로 잡는 경우, 2026-11-09 실측) */
const STOP = /^(관련\s*(뉴스|기사)|주요\s*(뉴스|기사)|많이\s*본\s*(뉴스|기사)|추천\s*(뉴스|기사)|인기\s*(뉴스|기사)|이\s*시각\s*주요\s*뉴스|최신\s*기사)$/;

/** 문장으로 끝나지 않는 아주 짧은 줄 — 기자 이름 · 글자 크기 단추 · 반응 단추(본문 문단은 이보다 길거나 문장부호로 끝난다) */
const isFragment = (text: string) => text.length < 12 && !/[.!?。”"'’)]$/.test(text);

/** 문단을 정리한다 — 공백 하나로 · 빈 줄 · 꼬리 줄 · 제목을 되풀이한 줄(모달 머리에 이미 있다) 버림 · 상한에서 자름 */
export const cleanParagraphs = (raw: string[], title?: string): string[] => {
  const out: string[] = [];
  let total = 0;
  for (const p of raw) {
    const text = p.replace(/\s+/g, " ").trim();
    if (text.length === 0) continue;
    if (STOP.test(text)) break;
    if (isFragment(text)) continue;
    if (text.length < 120 && NOISE.some((re) => re.test(text))) continue;
    if (title && text.length < 200 && titleSimilarity(title, text) >= BODY_MATCH_MIN) continue;
    if (out.at(-1) === text) continue;
    out.push(text);
    total += text.length;
    if (total >= BODY_MAX_CHARS || out.length >= BODY_MAX_PARAGRAPHS) break;
  }
  return out;
};

/** 캐시 행을 다시 써도 되나 — 뽑기 판이 같고, 찾음은 영구 · 못 찾음 · 실패는 다시 볼 때가 지났을 때 */
export const isBodyFresh = (row: StoredArticleBody, now: Date): boolean => {
  if (row.version !== BODY_EXTRACTOR_VERSION) return false;
  if (row.status === "ok") return true;
  const wait = row.status === "not_found" ? BODY_RETRY_NOT_FOUND_MS : BODY_RETRY_FAILED_MS;
  return now.getTime() - row.fetchedAt.getTime() < wait;
};

export const toArticleBodyView = (row: StoredArticleBody): ArticleBodyView => ({
  status: row.status,
  paragraphs: row.status === "ok" ? row.paragraphs : [],
  originalUrl: row.status === "ok" ? row.originalUrl : null,
  fetchedAt: row.fetchedAt.toISOString(),
});
