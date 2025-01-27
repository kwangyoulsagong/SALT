import { Wrapper } from "./Ranking.css";
import { Header } from "@repo/ui/header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import { H2 } from "@repo/ui/h2";
import { P } from "@repo/ui/p";
import RankingWrapper from "./RankingWrapper/RankingWrapper";
import GlobalRanks from "./RankingWrapper/GlobalRanks/GlobalRanks";
import FriendRanks from "./RankingWrapper/FriendRanks /FriendRanks";
const Ranking = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="ranking" />
        <H3>이달의 저축왕</H3>
      </Header>
      <RankingWrapper>
        <GlobalRanks>
          <P variant="secondary">현재 순위</P>
          <H2>상위 25%</H2>
        </GlobalRanks>
        <FriendRanks>
          <P variant="secondary">친구끼리 순위</P>
          <H2>1등</H2>
        </FriendRanks>
      </RankingWrapper>
    </section>
  );
};
export default Ranking;
