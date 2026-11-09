/**
 * 기사 본문 뷰모델(`BFF-REQ-053`) — 서버 `{ status, paragraphs, originalUrl, fetchedAt }` → 화면 `{ status, paragraphs, originalUrl }`.
 * 문단은 글자 그대로(자르기 · 고치기 0). 서버 `failed`(포털 · 언론사를 받지 못함)는 화면에서 `unavailable` 과 같다 — 둘 다 요약 · 원문 링크로.
 * 화면 타입은 `@repo/core/market` `ArticleBody` — 같은 모양
 */
export type ArticleBodyVM =
  | { status: "ok"; paragraphs: string[]; originalUrl: string | null }
  | { status: "not_found" }
  | { status: "unavailable" };

export class ArticleBodyContractError extends Error {}

/** 원문 주소는 화면 링크가 된다 — http(s) 가 아니면 버린다(서버도 거르지만 화면 계약의 주인이 한 번 더) */
const webUrl = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
};

export const toArticleBodyVM = (data: unknown): ArticleBodyVM => {
  const d = data as { status?: unknown; paragraphs?: unknown; originalUrl?: unknown } | null;
  if (!d || typeof d !== "object") throw new ArticleBodyContractError("body: 응답이 객체가 아니다");
  if (d.status === "not_found") return { status: "not_found" };
  if (d.status === "failed") return { status: "unavailable" };
  if (d.status !== "ok") throw new ArticleBodyContractError(`body: 모르는 status ${String(d.status)}`);
  if (!Array.isArray(d.paragraphs) || d.paragraphs.some((p) => typeof p !== "string")) {
    throw new ArticleBodyContractError("body: paragraphs 가 글자 배열이 아니다");
  }
  if (d.originalUrl !== null && typeof d.originalUrl !== "string") throw new ArticleBodyContractError("body: originalUrl 형식");
  // 문단이 비면 본문이 없는 것과 같다 — 빈 본문 칸을 그리지 않게
  if (d.paragraphs.length === 0) return { status: "not_found" };
  return { status: "ok", paragraphs: d.paragraphs as string[], originalUrl: webUrl(d.originalUrl as string | null) };
};
