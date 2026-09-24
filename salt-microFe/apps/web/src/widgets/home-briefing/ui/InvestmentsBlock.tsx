import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import Link from "next/link";

import { InvestmentSummary } from "@/entities/portfolio";
import { ROUTES } from "@/shared/config";
import { NavChevron } from "@/shared/ui";

import { HOME_BRIEFING_MESSAGES } from "../model/messages";
import { investmentsLink } from "./InvestmentsBlock.css";

/**
 * 투자 요약 블록. 조합만 한다.
 *
 * **블록 전체가 투자 화면(`/investments`) 링크다**(2026-09-24 사용자 요청 — "투자 분석 누르면 investments 로").
 * 블록 안에 다른 링크 · 버튼이 없어서 감쌀 수 있다(링크 안의 링크는 금지). 안에 인터랙션이 생기면
 * 머리 줄만 링크로 좁힌다. 머리 오른쪽 셰브론이 "다른 화면으로 간다"는 표시다.
 */
export const InvestmentsBlock = () => {
  return (
    <Container size="full">
      <FlexBox direction="column" gap="lg">
        <Link
          href={ROUTES.investments}
          className={investmentsLink}
          aria-label={HOME_BRIEFING_MESSAGES.investmentsLinkLabel}
        >
          <Card>
            <InvestmentSummary trailing={<NavChevron size={20} />} />
          </Card>
        </Link>
      </FlexBox>
    </Container>
  );
};

export default InvestmentsBlock;
