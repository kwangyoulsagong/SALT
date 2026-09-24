import { ProfileMenu } from "@/features/sign-out";
import { HomeBriefing } from "@/widgets/home-briefing";
import { OnboardingCard } from "@/widgets/onboarding-flow";

/**
 * 홈 (`/home`) — 서버 컴포넌트.
 *
 * **위젯 배치까지만 한다** (`fsd-pages.md`). 블록 구성·부분 실패 격리는
 * `widgets/home-briefing` 이 갖는다.
 */
export const HomePage = () => {
  return (
    <>
      {/*
        온보딩 안내는 **카드 하나**다 (`FE-REQ-010` FR-25). 블록마다 안내하면 미완료
        사용자의 홈이 안내로 덮인다. 끝났으면 카드가 아무것도 렌더하지 않는다.

        **위젯 둘을 나란히 놓는 것은 `pages` 의 일이다.** `home-briefing` 안에서
        `onboarding-flow` 를 부르면 같은 레이어의 다른 슬라이스를 직접 import 하는 것이고
        (`layered-architecture.md`), 그러면 두 위젯이 함께가 아니면 못 쓰게 된다.
      */}
      {/*
        헤더 프로필(설정 · 로그아웃 메뉴)은 **페이지가** 놓는다(2026-09-24). `home-briefing` 은 읽기 전용
        위젯이라 feature 를 넣지 않는다(`fsd-widgets.md`). 투자 화면도 같은 `ProfileMenu` 를 놓는다.
      */}
      <ProfileMenu />
      <OnboardingCard />
      <HomeBriefing />
    </>
  );
};

export default HomePage;
