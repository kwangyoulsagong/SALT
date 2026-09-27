import { MIRROR_MESSAGES } from "../model";

/** 태그 이름. 서버가 아는 태그만 이름을 붙이고, 사용자 정의 태그는 받은 글자 그대로 */
export const tagName = (tag: string): string =>
  (MIRROR_MESSAGES.tagNames as Record<string, string>)[tag] ?? tag;

/** 확정했으면 사용자 태그, 아니면 자동 후보 — 서버 `effectiveTags` 와 같은 규칙(표시용) */
export const effectiveOutcomeTags = (outcome: {
  autoTags: string[];
  userTags: string[];
  tagsConfirmedAt: string | null;
}): string[] => (outcome.tagsConfirmedAt ? outcome.userTags : outcome.autoTags);
