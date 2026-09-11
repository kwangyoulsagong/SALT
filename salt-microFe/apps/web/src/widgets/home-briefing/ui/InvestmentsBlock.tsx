import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";

import { InvestmentSummary } from "@/entities/portfolio";

/** 투자 요약 블록. 조합만 한다. */
export const InvestmentsBlock = () => {
  return (
    <Container size="full">
      <FlexBox direction="column" gap="lg">
        <Card>
          <InvestmentSummary />
        </Card>
      </FlexBox>
    </Container>
  );
};

export default InvestmentsBlock;
