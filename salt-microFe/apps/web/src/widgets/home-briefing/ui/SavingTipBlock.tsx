import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";

import { SavingTipCard } from "./SavingTipCard";

export const SavingTipBlock = () => {
  return (
    <Container size="full">
      <Card>
        <SavingTipCard />
      </Card>
    </Container>
  );
};

export default SavingTipBlock;
