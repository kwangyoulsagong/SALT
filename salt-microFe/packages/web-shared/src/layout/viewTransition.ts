/**
 * 문서 간 View Transitions (`FE-REQ-054` FR-4, `ADR-005` §3).
 *
 * 같은 origin 의 문서 이동(zone 간 탭)을 브라우저가 전환으로 잇는다 — 탭 · 머리는 같은 `view-transition-name`
 * (`@repo/ui/app-navigation`)이라 제자리에 남고 본문만 바뀐다. 줄인 모션이면 전환 자체를 끈다(`motion.md` §7).
 *
 * vanilla-extract 는 `@view-transition` 규칙을 만들지 못해 문자열로 둔다 — 각 zone 루트 레이아웃 `<head>` 의 `<style>` 하나.
 * 지원하지 않는 브라우저는 규칙을 무시한다(일반 이동).
 */
export const VIEW_TRANSITION_CSS = [
  "@view-transition{navigation:auto}",
  "@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}",
].join("");
