import { Header } from "@repo/ui/header";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";
import { ServiceIcon } from "@repo/ui/serviceicon";
import TipsWrapper from "./TipsWrapper/TipsWrapper";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
const Tips = () => {
  return (
    <Container size="full">
      <FlexBox direction="column" gap="md">
        <Header>
          <ServiceIcon variant="tip" />
          <Heading level={3}>오늘의 저축 팁</Heading>
        </Header>
        <TipsWrapper>
          <Heading level={4}>커피값 아끼기로 월 5만원 저축하기</Heading>
          <Text color="muted">하루 2잔, 연 60만원 절약 가능!</Text>
        </TipsWrapper>
      </FlexBox>
    </Container>
  );
};
export default Tips;
