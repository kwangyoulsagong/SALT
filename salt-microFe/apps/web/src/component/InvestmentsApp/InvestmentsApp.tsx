import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Card } from "@repo/ui/card";
import MyInvestments from "@/component/InvestmentsApp/MyInvestments/MyInvestments";

/**
 * 이전에는 `investments` remote 의 페이지였다. zone 통합 후 `apps/web` 로컬 컴포넌트다.
 */
export default function InvestmentsApp() {
  return (
    <Container size="full">
      <FlexBox direction="column" gap="lg">
        <Card>
          <MyInvestments />
        </Card>
      </FlexBox>
    </Container>
  );
}
