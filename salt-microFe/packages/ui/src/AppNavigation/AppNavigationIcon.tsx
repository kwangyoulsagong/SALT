/**
 * 앱 탭 아이콘 — 면을 채운 둥근 글리프 한 벌 (`FE-REQ-054` FR-1, 2026-11-03 사용자 "저축 아이콘 별로야 … 아이콘 해서 해야돼").
 *
 * 선 아이콘(lucide)은 탭 크기(24)에서 가늘고 흐려 탭끼리 구분이 약했다. 금융 앱 탭의 관례대로 **단색 · 면 채움 · 둥근 모서리**로 그린다.
 * 색은 `currentColor` 하나 — 지금 탭 · 나머지의 색은 부르는 쪽 글자색이 정한다. 구멍(동전의 W · 지갑 단추)은 감는 방향을
 * 반대로 그린 부분 경로다(`nonzero`) — 마스크 id 가 레일 · 하단 탭 두 벌에서 겹치지 않게.
 *
 * 이름은 `@repo/core/navigation` `AppTabIcon` 과 같다(앱도 같은 이름으로 네이티브 그림을 고른다). 외부 그래픽 파일 없음(`motion.md` §2).
 */
export type AppNavigationIconName = "home" | "coin" | "wallet" | "chart";

const PATHS: Record<AppNavigationIconName, string> = {
  // 집 — 문 자리는 아래가 파인 모양(구멍 아님)
  home:
    "M10.6 2.9a2.2 2.2 0 0 1 2.8 0l6.9 5.7c.5.4.7 1 .7 1.6V19a3 3 0 0 1-3 3h-3.4v-4.6a1.6 1.6 0 0 0-1.6-1.6h-2a1.6 1.6 0 0 0-1.6 1.6V22H6a3 3 0 0 1-3-3v-8.8c0-.6.3-1.2.7-1.6z",
  // 돈 — 동전 하나에 W(원). 동전은 반시계, W 는 시계 방향(= 구멍). 돼지 저금통은 사용자 결정으로 뺐다(2026-11-03 "돼지 에바야")
  coin: "M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0z" + "M7.82 6.45 9.38 12.26 12.00 7.10 14.62 12.26 16.18 6.45 18.02 6.95 15.18 17.54 12.00 11.30 8.82 17.54 5.98 6.95z",
  // 지갑 — 뒤 덮개 + 몸, 단추 자리는 구멍
  wallet:
    "M5 5.6A2.6 2.6 0 0 1 7.6 3h8.6a1.3 1.3 0 0 1 1.2 1.8L16.5 7H5z" +
    "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" +
    "M17.9 14a1.4 1.4 0 1 0-2.8 0a1.4 1.4 0 1 0 2.8 0z",
  // 막대 셋 — 오르는 순서
  chart:
    "M3.5 14.6A1.6 1.6 0 0 1 5.1 13h1.3A1.6 1.6 0 0 1 8 14.6v4.8A1.6 1.6 0 0 1 6.4 21H5.1a1.6 1.6 0 0 1-1.6-1.6z" +
    "M9.8 9.6A1.6 1.6 0 0 1 11.4 8h1.2a1.6 1.6 0 0 1 1.6 1.6v9.8a1.6 1.6 0 0 1-1.6 1.6h-1.2a1.6 1.6 0 0 1-1.6-1.6z" +
    "M16 4.6A1.6 1.6 0 0 1 17.6 3h1.3a1.6 1.6 0 0 1 1.6 1.6v14.8a1.6 1.6 0 0 1-1.6 1.6h-1.3a1.6 1.6 0 0 1-1.6-1.6z",
};

export interface AppNavigationIconProps {
  name: AppNavigationIconName;
  /** 한 변(px). 탭은 24 */
  size?: number;
}

export const AppNavigationIcon = ({ name, size = 24 }: AppNavigationIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d={PATHS[name]} />
  </svg>
);
