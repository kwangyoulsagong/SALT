import { HomeBriefing } from "@/widgets/home-briefing";

/**
 * 홈 (`/home`) — 서버 컴포넌트.
 *
 * **위젯 배치까지만 한다** (`fsd-pages.md`). 블록 구성·부분 실패 격리는
 * `widgets/home-briefing` 이 갖는다.
 */
export const HomePage = () => {
  return <HomeBriefing />;
};

export default HomePage;
