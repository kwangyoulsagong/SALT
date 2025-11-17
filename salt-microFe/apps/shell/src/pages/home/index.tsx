import React, { Suspense, lazy, useEffect } from "react";
import Header from "@/components/Home/Header/Header";
import Tip from "@/components/TipsApp/TipsApp";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
const Goals = lazy(() => import("goals/GoalsApp"));
const Investments = lazy(() => import("investments/InvestmentsApp"));
export default function HomePage() {
  return (
    <Container size="full" padding="none">
      <FlexBox direction="column" justify="center" gap="lg">
        <Header />
        <Suspense fallback={<div>로딩</div>}>
          <Goals />
          <Investments />
          <Tip />
        </Suspense>
      </FlexBox>
    </Container>
  );
}
