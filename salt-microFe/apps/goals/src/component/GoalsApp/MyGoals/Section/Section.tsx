import Overlay from "./Overlay/Overlay";
import Saved from "./Saved/SavedWrapper";
import SaveInformation from "./SaveInformation/SaveInformation";
import { Wrapper } from "./Section.css";
import { Icon } from "@repo/ui/icon";
import { P } from "@repo/ui/p";
import { H2 } from "@repo/ui/h2";
import { Button } from "@repo/ui/button";
interface savedProps {
  saved: {
    money: string;
    thumbnail: string;
  };
}
const Section = ({ saved }: savedProps) => {
  return (
    <section className={Wrapper}>
      <Overlay>
        <Saved>
          <Icon url={saved.thumbnail} />
          <SaveInformation>
            <H2>{saved.money}원</H2>
            <P>현재 모은 금액</P>
          </SaveInformation>
        </Saved>
        <Button eventType="route" eventValue="/goals/addgoals">
          추가
        </Button>
      </Overlay>
    </section>
  );
};
export default Section;
