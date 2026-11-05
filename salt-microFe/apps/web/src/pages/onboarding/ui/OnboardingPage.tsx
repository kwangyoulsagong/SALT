import { OnboardingFlow } from "@/widgets/onboarding-flow";

/**
 * 온보딩 (`/onboarding`) — 서버 컴포넌트.
 *
 * **위젯 배치까지만 한다** (`fsd-pages.md`). 단계 구성과 상태 조회는
 * `widgets/onboarding-flow` 가 갖는다.
 *
 * `Suspense` 를 두지 않는다 — 서버에서 기다릴 데이터가 없다. 온보딩 상태는 토큰이
 * 필요하고 토큰은 아직 `localStorage` 에 있어 클라이언트에서만 읽힌다
 * (`FE-REQ-008` §6-4 · `FE-REQ-013` 이 쿠키로 옮긴다). 그때 이 조회가 서버로 내려간다.
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 이 자리가 클라이언트에 남은 것은 아직 서버 조회로 옮기지 않아서다 — 목록은 `FE-REQ-013` FR-81)
 */
export const OnboardingPage = () => {
  return <OnboardingFlow />;
};

export default OnboardingPage;
