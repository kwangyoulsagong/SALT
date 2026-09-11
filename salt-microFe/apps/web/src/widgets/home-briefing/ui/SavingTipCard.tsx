import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Header } from "@repo/ui/header";
import { Heading } from "@repo/ui/heading";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Text } from "@repo/ui/text";

import { HOME_BRIEFING_MESSAGES } from "../model/messages";
import { SavingTipWrapper } from "./SavingTipWrapper";

/**
 * 저축 팁 카드.
 *
 * 내용이 하드코딩이라 슬라이스가 없다 — 데이터가 생기면 그때 엔티티로 내린다.
 * 지금 위젯 안에 둔 이유는 **홈 조합 밖에서 쓰이지 않기 때문**이다.
 */
export const SavingTipCard = () => {
  return (
    <Container size="full">
      <FlexBox direction="column" gap="md">
        <Header>
          <ServiceIcon variant="tip" />
          <Heading level={2}>{HOME_BRIEFING_MESSAGES.tipHeading}</Heading>
        </Header>
        <SavingTipWrapper>
          <Heading level={4}>{HOME_BRIEFING_MESSAGES.tipTitle}</Heading>
          <Text color="muted">{HOME_BRIEFING_MESSAGES.tipBody}</Text>
        </SavingTipWrapper>
      </FlexBox>
    </Container>
  );
};

export default SavingTipCard;
