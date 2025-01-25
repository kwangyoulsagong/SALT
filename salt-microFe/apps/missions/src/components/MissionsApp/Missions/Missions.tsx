import Header from "./Header/Header";
import { Wrapper } from "./Missions.css";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import { P } from "@repo/ui/p";
import MissionLeft from "./MissionLeft/MissionLeft";
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
    </section>
  );
};
export default Missions;
