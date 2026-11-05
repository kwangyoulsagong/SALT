import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";

import { BlockBoundary } from "@repo/web-shared/ui";

import { HOME_BLOCK_MIN_HEIGHT, HOME_BRIEFING_MESSAGES } from "../model/messages";
import { HomeCards } from "./HomeCards";
import { SavingTipBlock } from "./SavingTipBlock";

/**
 * 홈 — 도메인 요약 카드 + 저축 팁 (`FE-REQ-055` FR-2, `ADR-005` §2). 목표 목록(임시)은 저축 zone `/goals` 가 생겨 뺐다(`FE-REQ-056`, 2026-11-03).
 *
 * **셸은 도메인 코드를 모른다.** 투자 블록(보유 요약 · 매입가 숨김)이 `entities/portfolio` · `coach` 를 직접 읽던 것을
 * BFF 카드(`HomeSummaryCard[]`)로 바꿨다(`FE-REQ-053` FR-3). 카드 값은 BFF 문자열 그대로다.
 *
 * ## 지금은 스트리밍되지 않는다
 *
 * 카드가 클라이언트에서 React Query 로 BFF 를 부른다(토큰이 `localStorage` 에 있다 — `FE-REQ-013` 전). 경계는
 * **부분 실패 격리**만 한다. 카드 하나의 실패는 BFF 가 카드 단위로 격리해 `degraded` 로 준다.
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 이 자리가 클라이언트에 남은 것은 아직 서버 조회로 옮기지 않아서다 — 목록은 `FE-REQ-013` FR-81)
 *
 * 경계 수는 화면당 5개 이하다 (FE-REQ-008 FR-26). 현재 1개.
 */
export const HomeBriefing = () => {
  return (
    <Container size="full" padding="none">
      <FlexBox direction="column" justify="center" gap="lg">
        <BlockBoundary name={HOME_BRIEFING_MESSAGES.cardsBlockName} minHeight={HOME_BLOCK_MIN_HEIGHT.cards}>
          <HomeCards />
        </BlockBoundary>
        <SavingTipBlock />
      </FlexBox>
    </Container>
  );
};

export default HomeBriefing;
