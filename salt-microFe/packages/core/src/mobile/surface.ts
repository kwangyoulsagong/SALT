/**
 * 휴대폰 표면 표지(`FE-REQ-072` FR-4, `ADR-012`) — `/m` zone 루트 레이아웃이 **서버 HTML 에** `<html data-surface="mobile">` 을 단다.
 *
 * 옛 앱 웹뷰 계약(앱 UA 표시 → 첫 스크립트가 `<html>` 에 속성을 다는 것, `FE-REQ-060` FR-M)을 대신한다. 데스크톱 HTML 에 휴대폰 배치를 같이 싣고
 * 브라우저가 고르던 것이 아니라 **휴대폰 zone 의 문서에만** 붙는다 — 스크립트 · 수화 경고 예외가 없다.
 *
 * 쓰는 곳은 데스크톱 · 휴대폰이 **같이 쓰는 조각**(entities · features · widgets)의 휴대폰 값(글자 13 이상 · 터치 44)뿐이다.
 * 데스크톱 화면(`pages`)은 이 선택자를 쓰지 않는다 — 휴대폰 화면은 도메인 패키지 `src/mobile` 진입점이 따로 그린다.
 */
export const SURFACE_ATTRIBUTE = "data-surface";
export const SURFACE_MOBILE = "mobile";

/**
 * vanilla-extract `selectors` 키 — `{ fontSize: "12px", selectors: { [ON_MOBILE]: { fontSize: "13px" } } }`.
 * 데스크톱 값은 그대로 둔다(`screen-desktop.md` 라벨 12)
 */
export const ON_MOBILE = `html[${SURFACE_ATTRIBUTE}="${SURFACE_MOBILE}"] &`;

/** `globalStyle` 앞머리 — 여러 클래스를 한 번에 `/m` 값으로(`${MOBILE_ROOT} ${a}, ${MOBILE_ROOT} ${b}`) */
export const MOBILE_ROOT = `html[${SURFACE_ATTRIBUTE}="${SURFACE_MOBILE}"]`;
