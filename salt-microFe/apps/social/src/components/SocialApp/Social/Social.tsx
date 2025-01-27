import { Wrapper } from "./Social.css";
import { Header } from "@repo/ui/header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
import { H2 } from "@repo/ui/h2";
import { P } from "@repo/ui/p";
const Social = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="social" />
        <H3>함께하는 저축</H3>
      </Header>
    </section>
  );
};
export default Social;
