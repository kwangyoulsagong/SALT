import { Container } from "@repo/ui/container";
import QueryClientProvider from "@/providers/QueryClientProvider";
import { FlexBox } from "@repo/ui/flexBox";
import { Card } from "@repo/ui/card";
import MyInvestments from "@/component/InvestmentsApp/MyInvestments/MyInvestments";
import MarketList from "@/component/MarketList/MarketList";
export default function InvestmentsApp() {
  return (
    <QueryClientProvider>
      <Container size="full">
        <FlexBox direction="column" gap="lg">
          <Card>
            <MyInvestments />
          </Card>
        </FlexBox>
        <MarketList />
      </Container>
    </QueryClientProvider>
  );
}
