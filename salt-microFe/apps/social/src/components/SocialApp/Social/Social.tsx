import { Wrapper } from "./Social.css";
import { Header } from "@repo/ui/header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import { H2 } from "@repo/ui/h2";
import { P } from "@repo/ui/p";
import GroupMissions from "./GroupMissions/GroupMissions";
import Missions from "./GroupMissions/Missions/Missions";
const Social = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="social" />
        <H3>함께하는 저축</H3>
      </Header>
      <GroupMissions>
        <Missions>
          <H3>30일 모닝 커피 NO</H3>
          <P>친구 5명과 함께</P>
        </Missions>
        <Missions>
          <H3>점심값 5천원 줄이기</H3>
          <P>동료 3명과 함께</P>
        </Missions>
      </GroupMissions>
    </section>
  );
};
export default Social;
