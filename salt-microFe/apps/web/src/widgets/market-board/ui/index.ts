export { MarketBoard } from "./MarketBoard";

/**
 * `RealtimeMarketTable` 은 **의도적으로 export 하지 않는다.**
 *
 * `MarketBoard` 가 `next/dynamic` + `ssr:false` 로 부르는 잎이다. barrel 에 올리면
 * 위젯을 import 하는 페이지가 그 모듈을 **정적으로** 끌어와 코드 분할이 무효가 된다
 * (실측: `/investments` First Load 117kB → 180kB).
 */
