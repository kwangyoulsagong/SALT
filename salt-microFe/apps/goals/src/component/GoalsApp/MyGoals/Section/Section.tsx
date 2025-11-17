import Overlay from "./Overlay/Overlay";
import Saved from "./Saved/SavedWrapper";
import SaveInformation from "./SaveInformation/SaveInformation";
import { Wrapper } from "./Section.css";
import { Icon } from "@repo/ui/icon";
import { Text } from "@repo/ui/text";
import { Heading } from "@repo/ui/heading";
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
            <Heading level={2}>{saved.money}원</Heading>
            <Text color="muted">현재 모은 금액</Text>
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
