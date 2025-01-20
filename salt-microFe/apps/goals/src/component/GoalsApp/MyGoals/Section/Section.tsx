import Overlay from "./Overlay/Overlay";
import Saved from "./Saved/SavedWrapper";
import SaveInformation from "./SaveInformation/SaveInformation";
import { Wrapper } from "./Section.css";
import { Icon } from "@repo/ui/icon";
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
            <h3>{saved.money}원</h3>
            <p>현재 모음 금액</p>
          </SaveInformation>
        </Saved>
      </Overlay>
    </section>
  );
};
export default Section;
