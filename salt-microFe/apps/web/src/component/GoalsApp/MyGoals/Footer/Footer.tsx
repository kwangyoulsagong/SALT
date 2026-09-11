import { Text } from "@repo/ui/text";
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
          <Text variant="caption" color="muted">
            진행중
          </Text>
          <span className={Process}>{process.progress}</span>
        </ProcessCard>
        <ProcessCard>
          <Text variant="caption" color="muted">
            달성
          </Text>
          <span className={Process}>{process.complete}</span>
        </ProcessCard>
        <ProcessCard>
          <Text variant="caption" color="muted">
            D-Day
          </Text>
          <span className={Process}>{process.dday}</span>
        </ProcessCard>
        <ProcessCard>
          <Text variant="caption" color="muted">
            달성률
          </Text>
          <span className={Process}>{process.percent}%</span>
        </ProcessCard>
      </ProcessWrapper>
    </footer>
  );
};
export default Footer;
