import { Header } from "@repo/ui/header";
import { Wrapper } from "./Missions.css";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import { P } from "@repo/ui/p";
import { H4 } from "@repo/ui/h4";
import MissionLeft from "./MissionLeft/MissionLeft";
import MissionWrapper from "./MissionWrapper/MissionWrapper";
import { Points } from "./MissionWrapper/MissionWrapper.css";
const Missions = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="mission" />
        <H3>오늘의 미션</H3>
      </Header>
      <MissionLeft>
        <P>남은 미션 2개</P>
      </MissionLeft>
      <MissionWrapper>
        <H4>커피 대신 저축하기</H4>
        <span className={Points}>+500</span>
      </MissionWrapper>
    </section>
  );
};
export default Missions;
