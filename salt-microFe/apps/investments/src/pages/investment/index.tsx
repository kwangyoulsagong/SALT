import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Section } from "@repo/ui/section";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Tabs } from "@repo/ui/tabs";
import React from "react";
const Investment = () => {
  return (
    <Section noContainer>
      <FlexBox direction="column">
        <FlexBox direction="row" align="center" gap="lg">
          <ServiceIcon variant="analysis" />
          <Heading level={2}>투자 분석</Heading>
        </FlexBox>
        <Tabs />
      </FlexBox>
    </Section>
  );
};
export default Investment;
