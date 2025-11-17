import { Wrapper } from "./Tips.css";
import { Header } from "@repo/ui/header";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";
import { ServiceIcon } from "@repo/ui/serviceicon";
import TipsWrapper from "./TipsWrapper/TipsWrapper";
const Tips = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="tip" />
        <Heading level={3}>오늘의 저축 팁</Heading>
      </Header>
      <TipsWrapper>
        <Heading level={4}>커피값 아끼기로 월 5만원 저축하기</Heading>
        <Text color="muted">하루 2잔, 연 60만원 절약 가능!</Text>
      </TipsWrapper>
    </section>
  );
};
export default Tips;
