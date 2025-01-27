import { Wrapper } from "./Ranking.css";
import { Header } from "@repo/ui/header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import { H2 } from "@repo/ui/h2";
import { P } from "@repo/ui/p";
import RankingWrapper from "./RankingWrapper/RankingWrapper";
import GlobalRanks from "./RankingWrapper/GlobalRanks/GlobalRanks";
import FriendRanks from "./RankingWrapper/FriendRanks /FriendRanks";
import useRanking from "@/hooks/api/ranking/useRanking";
import { RanksService } from "@/service/ranking/RanksService";
const Ranking = () => {
  const { myRanking } = useRanking();
  if (myRanking.isLoading) return <div className="loading">Loading...</div>;
  if (myRanking.error)
    return (
      <div className="error">
        <p>랭킹 데이터를 불러오는 중 에러가 발생했습니다.</p>
      </div>
    );
  const { globalRanks, familyRanks } = myRanking.data;
  const ranksService = new RanksService();
  const ranks = ranksService.ranks({ globalRanks, familyRanks });
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="ranking" />
        <H3>이달의 저축왕</H3>
      </Header>
      <RankingWrapper>
        <GlobalRanks>
          <P variant="secondary">현재 순위</P>
          <H2>
            {ranks.globalRank.icon && (
              <img
                width={"15px"}
                height={"15px"}
                src={ranks.globalRank.icon}
              ></img>
            )}{" "}
            {ranks.globalRank.text}
          </H2>
        </GlobalRanks>
        <FriendRanks>
          <P variant="secondary">친구끼리 순위</P>
          <H2>
            {ranks.familyRank.icon && (
              <img
                width={"15px"}
                height={"15px"}
                src={ranks.familyRank.icon}
              ></img>
            )}{" "}
            {ranks.familyRank.text}
          </H2>
        </FriendRanks>
      </RankingWrapper>
    </section>
  );
};
export default Ranking;
