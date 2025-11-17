import { Container } from "@repo/ui/container";
import QueryClientProvider from "@/providers/QueryClientProvider";
import { FlexBox } from "@repo/ui/flexBox";
import { Card } from "@repo/ui/card";
export default function InvestmentsApp() {
  return (
    <QueryClientProvider>
      <Container size="full">
        <FlexBox direction="column" gap="lg">
          <Card></Card>
        </FlexBox>
      </Container>
    </QueryClientProvider>
  );
}
