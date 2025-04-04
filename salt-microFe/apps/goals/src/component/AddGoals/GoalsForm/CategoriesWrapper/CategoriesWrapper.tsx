import { Icon } from "@repo/ui/icon";
import { H3 } from "@repo/ui/h3";
import CategoriesFlexBox from "./CategoriesFlexbox/CategoriesFlexBox";
import { Wrapper } from "./CategoriesWrapper.css";
import { useState } from "react";
import { CATEGORIES } from "@/utils/CategoriesMap";
import { useAppDispatch } from "@/hooks/redux/hooks";
import { setCategory } from "@/store/redux/features/goals/goalSlice";

const CategoriesWrapper = () => {
  const [selected, setSelected] = useState("");
  const dispatch = useAppDispatch();

  const handleClick = (value: string) => {
    setSelected(selected === value ? "" : value);
    dispatch(setCategory({ category: value }));
  };

  return (
    <section className={Wrapper}>
      {CATEGORIES.map((value) => (
        <CategoriesFlexBox key={value.id}>
          <Icon onClick={() => handleClick(value.id)} variant={value.variant} />
          <H3>{value.label}</H3>
          {selected == value.id && <div>선택</div>}
        </CategoriesFlexBox>
      ))}
    </section>
  );
};
export default CategoriesWrapper;
