import dynamic from "next/dynamic";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Section } from "@repo/ui/section";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Tabs } from "@repo/ui/tabs";
import { Margin } from "@repo/ui/margin";
import React, { Suspense, useState } from "react";
import { tabs } from "@/constants/investmentTabs";

const RealtimeInvestment = dynamic(
  () => import("@/component/Investment/RealtimeInvestment/RealtimeInvestment"),
  {
    ssr: false,
    loading: () => null,
  }
);

const Investment = () => {
  const [activeTab, setActiveTab] = useState("realtime");
  return (
    <Section noContainer>
      <FlexBox direction="column">
        <FlexBox direction="row" align="center" gap="lg">
          <ServiceIcon variant="analysis" />
          <Heading level={2}>투자 분석</Heading>
        </FlexBox>
        <Margin top="xl">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </Margin>
        <Margin top="md">
          <Suspense fallback={null}>
            {activeTab === "realtime" && <RealtimeInvestment />}
          </Suspense>
        </Margin>
      </FlexBox>
    </Section>
  );
};
export default Investment;
