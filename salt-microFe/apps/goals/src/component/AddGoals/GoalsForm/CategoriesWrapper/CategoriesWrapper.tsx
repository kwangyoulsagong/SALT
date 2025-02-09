import { Icon } from "@repo/ui/icon";
import CategoriesFlexBox from "./CategoriesFlexbox/CategoriesFlexBox";
import { Wrapper } from "./CategoriesWrapper.css";

const CategoriesWrapper = () => {
  return (
    <section className={Wrapper}>
      <CategoriesFlexBox>
        <Icon variant="trip" />
      </CategoriesFlexBox>
      <CategoriesFlexBox>
        <Icon variant="car" />
      </CategoriesFlexBox>
      <CategoriesFlexBox>
        <Icon variant="shopping" />
      </CategoriesFlexBox>
      <CategoriesFlexBox>
        <Icon variant="home" />
      </CategoriesFlexBox>
      <CategoriesFlexBox>
        <Icon variant="gift" />
      </CategoriesFlexBox>
      <CategoriesFlexBox>
        <Icon variant="married" />
      </CategoriesFlexBox>
    </section>
  );
};
export default CategoriesWrapper;
