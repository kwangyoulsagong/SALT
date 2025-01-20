import Overlay from "./Overlay/Overlay";
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
        <div>
          <Icon url={saved.thumbnail} />
        </div>
      </Overlay>
    </section>
  );
};
export default Section;
