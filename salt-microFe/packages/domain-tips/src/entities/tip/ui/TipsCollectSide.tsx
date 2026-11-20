import { ServiceIcon } from "@repo/ui/serviceicon";
import { ROUTES } from "@repo/web-shared/config";
import { SideBlock, SideRow } from "@repo/web-shared/ui/frame";

import { TIP_MESSAGES as M } from "../model/messages";

/**
 * 오른쪽 사이드 "모아 보기" — 맞힌 카드 모음으로 가는 행 하나(`FE-REQ-060` FR-10). 목록 · 글이 같은 사이드를 쓴다(카드 모음 화면은 빼고).
 * 서버 컴포넌트 — 로그인 여부는 그 화면이 본다(공개 ISR HTML 은 사람마다 같다)
 */
export const TipsCollectSide = () => (
  <SideBlock title={M.collectTitle} titleId="tips-collect-title">
    <SideRow href={ROUTES.tipCards} icon={<ServiceIcon variant="game" />} label={M.quizCards} hint={M.quizCardsHint} />
  </SideBlock>
);
