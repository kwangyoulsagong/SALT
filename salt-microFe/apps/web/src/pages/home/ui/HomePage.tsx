import { PageFrame } from "@repo/web-shared/ui/frame";

import { HomeBriefing, QuickActions } from "@/widgets/home-briefing";
import { OnboardingSideRow } from "@/widgets/onboarding-flow";

import { HOME_PAGE_MESSAGES } from "../model/messages";

/**
 * 셸 홈 — 데스크톱 배치(`FE-REQ-048` FR-8, 2026-11-19 · 리서치 `2026-11-19-home-desktop.md`): 제목 → 도메인 카드 2열(최대 560 · 3D 아이콘),
 * 오른쪽 칸 = 시작하기 행(다 끝냈으면 없음) · 바로 적기(지출 · 목표 — 숨긴 도메인 빼고). 둘 다 없으면 칸째 접힌다. 전에는 큰 카드를 패널 폭으로 한 줄씩 쌓은 "늘린 모바일"이었다.
 *
 * **위젯 둘을 나란히 놓는 것은 `pages` 의 일이다.** `home-briefing` 안에서 `onboarding-flow` 를 부르면 같은 레이어의 다른 슬라이스를
 * 직접 import 하는 것이다(`layered-architecture.md`). 머리 프로필 · 벨은 zone 공용 `AppShell` 이 놓는다.
 * 휴대폰은 `/m/home`(`FE-REQ-072`) — 이 화면에 휴대폰 분기가 없다
 */
export const HomePage = () => (
  <PageFrame title={HOME_PAGE_MESSAGES.heading} side={
      <>
        <OnboardingSideRow />
        <QuickActions />
      </>
    } sideLabel={HOME_PAGE_MESSAGES.sideLabel} surface="cards">
    <HomeBriefing />
  </PageFrame>
);

export default HomePage;
