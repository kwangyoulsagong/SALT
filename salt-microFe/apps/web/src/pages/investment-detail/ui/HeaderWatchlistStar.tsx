"use client";

import dynamic from "next/dynamic";

/**
 * 머리의 관심 별 — **지연 로딩되는 클라이언트 잎.** 별은 관심 목록 조회(`entities/market`)와
 * 토글(`features/toggle-watchlist`)이 필요한데, 그것을 첫 로드에 싣지 않는다. 서버에는 별이 없고
 * (토큰을 모른다) 브라우저에서 로그인이 확인되면 나타난다 — 수화가 어긋나지 않는다.
 */
const WatchlistStarLive = dynamic(
  () => import("./WatchlistStarLive").then((mod) => mod.WatchlistStarLive),
  { ssr: false, loading: () => null },
);

export const HeaderWatchlistStar = (props: { symbol: string; displayName: string }) => (
  <WatchlistStarLive {...props} />
);

export default HeaderWatchlistStar;
