import Overlay from "./Overlay/Overlay";
import { Wrapper } from "./Section.css";
import { Icon } from "@repo/ui/icon";
const Section = () => {
  return (
    <section className={Wrapper}>
      <Overlay>
        <div>
          <Icon />
        </div>
      </Overlay>
    </section>
  );
};
export default Section;
