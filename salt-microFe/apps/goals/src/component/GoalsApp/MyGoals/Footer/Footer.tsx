import { P } from "@repo/ui/p";
import { Container } from "./Footer.css";
import ProcessCard from "./ProcessWrapper/ProcessCard/ProcessCard";
import ProcessWrapper from "./ProcessWrapper/ProcessWrapper";
import { Process } from "./ProcessWrapper/ProcessCard/ProcessCard.css";
interface FooterProps {
  process: {
    progress: number;
    complete: number;
    dday: number;
    percent: number;
  };
}
const Footer = ({ process }: FooterProps) => {
  return (
    <footer className={Container}>
      <ProcessWrapper>
        <ProcessCard>
          <P variant="third">진행중</P>
          <span className={Process}>{process.progress}</span>
        </ProcessCard>
        <ProcessCard>
          <P variant="third">달성</P>
          <span className={Process}>{process.complete}</span>
        </ProcessCard>
        <ProcessCard>
          <P variant="third">D-Day</P>
          <span className={Process}>{process.dday}</span>
        </ProcessCard>
        <ProcessCard>
          <P variant="third">달성률</P>
          <span className={Process}>{process.percent}%</span>
        </ProcessCard>
      </ProcessWrapper>
    </footer>
  );
};
export default Footer;
