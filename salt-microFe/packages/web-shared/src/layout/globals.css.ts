import { globalStyle } from "@vanilla-extract/css";
import { tokens } from "@repo/tokens";
import { ENTER_ROW_ANIMATION, enterRowDelay } from "@repo/ui/enterReveal";
import { PRESS_SELECTOR, PRESS_TRANSITION, pressActive } from "@repo/ui/press";
import { vars as ds } from "@repo/ui/tokens";
import { HOVER_TRANSITION } from "@repo/ui/transition";

import { vars } from "../ui/tokens.css";

globalStyle("*", {
  margin: 0,
  padding: 0,
  boxSizing: "border-box",
});

globalStyle("body", {
  background: vars.colors.background.primary,
  color: vars.colors.text.primary,
  // 기본 글꼴 — 전에는 body 에 없어 컴포넌트가 따로 걸지 않은 글자는 브라우저 기본 글꼴이었다
  fontFamily: ds.fontFamily.base,
  fontSize: vars.fontSizes.body,
  fontWeight: vars.fontWeights.regular,
});

/**
 * 누를 수 있는 것의 기본 전환 (FE-REQ-062 FR-1 · FR-2) — 데스크톱 표면만(휴대폰 `/m` 은 `MobileShell.css.ts` 가 따로 정한다).
 *
 * 호버 · 포커스 면은 `duration.hover`, 글자색은 `instant` — 바뀌는 속성만 적는다(`all` 0). 버튼 · 접힘 머리는 누르는 동안 0.97.
 * **특이도 0(`:where`)** 이라 컴포넌트가 정한 `transition` · 누름이 늘 이긴다 — 이건 아무것도 정하지 않은 링크 · 버튼(앱 레일 ·
 * 머리 메뉴 · 화면 링크 — 2026-11-26 실측 전환 없는 것 372개)의 바닥값이다. 줄인 모션이면 누름만 끈다(색 전환은 움직임이 아니다).
 */
const DESKTOP = ':where(html:not([data-surface="mobile"]))';
const PRESSABLE = ':where(button, [role="button"], summary)';

globalStyle(`${DESKTOP} :where(a[href], button, summary, label[for], [role="button"], [role="tab"], [role="menuitem"])`, {
  transition: `${HOVER_TRANSITION}, ${PRESS_TRANSITION}`,
});

globalStyle(`${DESKTOP} ${PRESSABLE}:where(${PRESS_SELECTOR.slice(1)})`, {
  ...pressActive,
  "@media": { "(prefers-reduced-motion: reduce)": { scale: "none" } },
});

/**
 * 목록 행 차례 등장 (FE-REQ-062 FR-3) — 데스크톱 본문 안 목록 행 · 표 행이 데이터와 함께 올 때 한 번(투명도 + 크기 .96, 행마다 20ms, 8행 넘으면 같이).
 * 행을 그리는 자리가 80곳 가까이 흩어져 있어 컴포넌트마다 붙이지 않고 여기 한 곳 — **특이도 0** 이라 자기 등장(`enterReveal` 카드)이 있는
 * 요소는 그것이 이긴다. 다이얼로그 · 메뉴는 본문(`main`) 밖 포털이라 닿지 않는다(검색 결과가 글자마다 다시 뜨지 않게).
 * 이미 있던 행은 다시 그려져도 움직이지 않는다 — CSS 애니메이션은 요소가 처음 들어올 때만 돈다. 시세가 바뀌는 표 행도 같다.
 */
const ROWS = `${DESKTOP} main :where(ul, ol) > :where(li), ${DESKTOP} main :where(tbody) > :where(tr)`;
const nthRows = (nth: string) =>
  ROWS.split(", ")
    .map((selector) => `${selector}:where(:nth-child(${nth}))`)
    .join(", ");

globalStyle(ROWS, {
  animation: ENTER_ROW_ANIMATION,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});
for (let nth = 2; nth <= tokens.motion.staggerLimit; nth += 1) {
  globalStyle(nthRows(String(nth)), { animationDelay: enterRowDelay(nth) });
}
globalStyle(nthRows(`n + ${tokens.motion.staggerLimit + 1}`), { animationDelay: enterRowDelay(tokens.motion.staggerLimit + 1) });
