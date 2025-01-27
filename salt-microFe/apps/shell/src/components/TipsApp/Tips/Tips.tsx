import { Wrapper } from "./Tips.css";
import { Header } from "@repo/ui/header";
import { H3 } from "@repo/ui/h3";
import { P } from "@repo/ui/p";
import { ServiceIcon } from "@repo/ui/serviceicon";
import TipsWrapper from "./TipsWrapper/TipsWrapper";
const Tips = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="tip" />
        <H3>오늘의 저축 팁</H3>
      </Header>
      <TipsWrapper>
        <H3>커피값 아끼기로 월 5만원 저축하기</H3>
        <P>하루 2잔, 연 60만원 절약 가능!</P>
      </TipsWrapper>
    </section>
  );
};
export default Tips;
