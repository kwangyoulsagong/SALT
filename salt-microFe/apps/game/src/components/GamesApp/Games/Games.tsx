import { Wrapper } from "./Games.css";
import { Header } from "@repo/ui/header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import { H2 } from "@repo/ui/h2";
import { P } from "@repo/ui/p";
const Games = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="game" />
        <H3>오늘의 게임</H3>
      </Header>
    </section>
  );
};
export default Games;
