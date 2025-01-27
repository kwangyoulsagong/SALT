import { Wrapper } from "./Games.css";
import { Header } from "@repo/ui/header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import { P } from "@repo/ui/p";
import { Button } from "@repo/ui/button";
import GameWrapper from "./GameWrapper/GameWrapper";
import TypoWrapper from "./GameWrapper/TypoWrapper/TypoWrapper";
const Games = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="game" />
        <H3>오늘의 게임</H3>
      </Header>
      <GameWrapper>
        <TypoWrapper>
          <H3>빼뺴로 잡기 게임</H3>
          <P>경험치를 올려보세요</P>
        </TypoWrapper>
        <Button variant="game">시작</Button>
      </GameWrapper>
    </section>
  );
};
export default Games;
