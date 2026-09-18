export * from "./messages";
export * from "./tabs";

/**
 * `previewParams` 는 **의도적으로 여기에 올리지 않는다.**
 *
 * 그 파일은 `@/entities/market` 의 enum 을 import 한다. barrel 에 올리면 이 barrel 을
 * 쓰는 `MarketBoard` 가 — 그리고 `MarketBoard` 를 정적으로 import 하는 페이지가 —
 * **엔티티 barrel 전체(프리뷰·차트 포함)를 정적으로 끌어온다.**
 * 실측: `/investments` First Load 125 kB → 178 kB. 잎에서 `../model/previewParams` 로
 * 직접 가져간다.
 */
