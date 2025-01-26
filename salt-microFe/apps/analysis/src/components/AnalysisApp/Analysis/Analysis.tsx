import { Wrapper } from "./Analysis.css";
import Header from "./Header/Header";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { H3 } from "@repo/ui/h3";
const Analysis = () => {
  return (
    <section className={Wrapper}>
      <Header>
        <ServiceIcon variant="analysis" />
        <H3>이번주 지출 분석</H3>
      </Header>
    </section>
  );
};
export default Analysis;
