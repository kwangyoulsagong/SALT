
import { TEXT_MAX_WIDTH } from "@repo/web-shared/config";
import { BlockBoundary, PageFrame } from "@repo/web-shared/ui";

import { COACH_CHAT_PAGE, COACH_CHAT_SIDE } from "../model";
import { CoachChatBody } from "./CoachChatBody";
import { CoachChatSide } from "./CoachChatSide";

/**
 * 코치 대화(`/coach/chat`) — 서버 컴포넌트(F006 C절 · `FE-REQ-030`). 투자 머리 메뉴 "코치 대화"에서 들어온다.
 * 본문을 놓는 것까지만 한다(`fsd-pages.md`).
 */
export const CoachChatPage = () => (
  // 제목은 가운데 대화 단(720)의 왼쪽 끝에 — 화면 왼쪽에 두면 단과 어긋난다(2026-11-19 사용자 "정렬")
  <PageFrame
    title={COACH_CHAT_PAGE.title}
    headMaxWidth={TEXT_MAX_WIDTH}
    side={<CoachChatSide />}
    sideLabel={COACH_CHAT_SIDE.label}
  >
    <BlockBoundary name={COACH_CHAT_PAGE.blockName} minHeight={COACH_CHAT_PAGE.blockMinHeight}>
      <CoachChatBody />
    </BlockBoundary>
  </PageFrame>
);
