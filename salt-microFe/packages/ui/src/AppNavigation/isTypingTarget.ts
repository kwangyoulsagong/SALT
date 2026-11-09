/** 스타일 없는 순수 판정 — 단위 테스트가 vanilla-extract 없이 부른다 */
const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * 키를 누른 자리가 글을 쓰는 중인가 — 그때 `/` 는 글자다. 입력칸 · 글 상자 · 고를 칸 · 편집 가능한 요소.
 * 조합 중(한글 입력)도 글자다. DOM 타입에 기대지 않는다(단위 테스트가 브라우저 없이 돈다)
 */
export const isTypingTarget = (event: Pick<KeyboardEvent, "isComposing" | "target">): boolean => {
  if (event.isComposing) return true;
  const target = event.target as { tagName?: unknown; isContentEditable?: unknown } | null;
  if (!target || typeof target.tagName !== "string") return false;
  if (target.isContentEditable === true) return true;
  return TYPING_TAGS.has(target.tagName);
};
