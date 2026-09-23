import type { MetadataRoute } from "next";

import { SITE_URL } from "@/shared/config";

/**
 * 검색 로봇 규칙 — **공개 시세만 연다.**
 *
 * 열리는 것: 로그인 첫 화면(`/`) · 투자 목록 · 종목 상세. 이 셋은 누구에게나 같은 공개 시세다.
 * 닫는 것: 홈 · 코치 리포트 · 온보딩 · 목표 — 로그인한 사람의 보유 · 판단이다. 각 페이지도
 * `noindex` 를 따로 갖는다(robots 만으로는 외부 링크를 타고 들어온 색인을 못 막는다).
 */
export const robots = (): MetadataRoute.Robots => ({
  rules: [
    {
      userAgent: "*",
      allow: ["/", "/investments"],
      disallow: ["/home", "/coach", "/onboarding", "/goals", "/streaming-probe", "/tax"],
    },
  ],
  sitemap: `${SITE_URL}/sitemap.xml`,
});
